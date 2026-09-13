/**
 * SportX Goal Repository
 * Firestore Data Access for goals/{goalId}
 * Provides server-authoritative progress calculation derived from real workout telemetry,
 * streaks, form scores, and competitive matches.
 */

import { db, hasFirebaseCredentials } from '../config/firebase';
import { GoalDoc, CreateGoalPayload, GoalType, GoalCategory } from '../types';
import { SessionRepository } from './sessionRepository';
import { UserRepository } from './userRepository';
import { ActivityRepository } from './activityRepository';
import { CompetitiveRepository } from './competitiveRepository';
import * as logger from 'firebase-functions/logger';

const GOALS_COLLECTION = 'goals';

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore goal operation timeout')), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// In-memory cache for fast local testing and offline fallback
const localGoalsCache: Map<string, GoalDoc> = new Map();

export const PREDEFINED_GOAL_TEMPLATES: Array<CreateGoalPayload & { id: string }> = [
  // FITNESS GOALS
  {
    id: 'tmpl_workouts_20_month',
    type: 'workouts_count',
    category: 'fitness',
    title: 'Complete 20 workouts this month',
    description: 'Build your conditioning base with 20 completed workout sessions.',
    target: 20,
    unit: 'workouts',
    metric: 'totalWorkouts',
    targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  },
  {
    id: 'tmpl_streak_7',
    type: 'streak_days',
    category: 'consistency',
    title: 'Maintain a 7-day streak',
    description: 'Train daily for a full week to solidify athletic consistency.',
    target: 7,
    unit: 'days',
    metric: 'currentStreak',
    targetDate: new Date(Date.now() + 14 * 86400000).toISOString(),
  },
  {
    id: 'tmpl_total_reps_1000',
    type: 'total_reps',
    category: 'fitness',
    title: 'Reach 1,000 total verified reps',
    description: 'Accumulate 1,000 verified movement repetitions across all exercises.',
    target: 1000,
    unit: 'reps',
    metric: 'totalReps',
    targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  },
  {
    id: 'tmpl_avg_form_90',
    type: 'average_form',
    category: 'form',
    title: 'Improve average form to 90%',
    description: 'Master biomechanical depth and posture across completed sessions.',
    target: 90,
    unit: '%',
    metric: 'formAccuracyAverage',
    targetDate: new Date(Date.now() + 21 * 86400000).toISOString(),
  },
  {
    id: 'tmpl_high_form_10',
    type: 'high_form_sessions',
    category: 'form',
    title: 'Complete 10 high-form sessions (90%+)',
    description: 'Achieve near-perfect form accuracy in 10 separate workout sessions.',
    target: 10,
    unit: 'sessions',
    metric: 'highFormSessions',
    targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  },

  // STRENGTH GOALS
  {
    id: 'tmpl_pushups_100',
    type: 'exercise_reps',
    category: 'strength',
    title: 'Complete 100 push-ups',
    description: 'Accumulate 100 chest-to-deck verified push-ups.',
    target: 100,
    unit: 'reps',
    exerciseId: 'pushup',
    metric: 'exercise_reps_pushup',
    targetDate: new Date(Date.now() + 14 * 86400000).toISOString(),
  },
  {
    id: 'tmpl_squats_500',
    type: 'exercise_reps',
    category: 'strength',
    title: 'Complete 500 squats',
    description: 'Build lower body endurance with 500 full-depth squats.',
    target: 500,
    unit: 'reps',
    exerciseId: 'squat',
    metric: 'exercise_reps_squat',
    targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  },

  // CONSISTENCY GOALS
  {
    id: 'tmpl_weekly_5',
    type: 'weekly_workouts',
    category: 'consistency',
    title: 'Complete 5 workouts per week',
    description: 'Maintain high weekly frequency with 5 distinct training days.',
    target: 5,
    unit: 'days/week',
    metric: 'weeklyWorkoutDays',
    targetDate: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
  {
    id: 'tmpl_streak_30',
    type: 'streak_days',
    category: 'consistency',
    title: 'Maintain a 30-day streak',
    description: 'Reach elite athlete status with an unbroken 30-day training streak.',
    target: 30,
    unit: 'days',
    metric: 'currentStreak',
    targetDate: new Date(Date.now() + 45 * 86400000).toISOString(),
  },

  // COMPETITIVE GOALS
  {
    id: 'tmpl_comp_wins_5',
    type: 'competitive_wins',
    category: 'competitive',
    title: 'Win 5 competitive matches',
    description: 'Prove your skill in the Competitive Arena by winning 5 matches.',
    target: 5,
    unit: 'wins',
    metric: 'competitiveWins',
    targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  },
  {
    id: 'tmpl_reach_gold',
    type: 'reach_rank_tier',
    category: 'competitive',
    title: 'Reach Gold Tier (800 RP)',
    description: 'Climb the competitive ladder to achieve Gold rank standing.',
    target: 800,
    unit: 'RP',
    metric: 'rankPoints',
    targetDate: new Date(Date.now() + 60 * 86400000).toISOString(),
  },

  // SPORT GOALS
  {
    id: 'tmpl_cricket_10',
    type: 'sport_sessions',
    category: 'sport',
    title: 'Complete 10 cricket conditioning sessions',
    description: 'Enhance your agility and stamina for cricket performance.',
    target: 10,
    unit: 'sessions',
    sportId: 'cricket',
    metric: 'sportSessions_cricket',
    targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  },
  {
    id: 'tmpl_football_10',
    type: 'sport_sessions',
    category: 'sport',
    title: 'Complete 10 football conditioning sessions',
    description: 'Build match fitness and speed for football excellence.',
    target: 10,
    unit: 'sessions',
    sportId: 'football',
    metric: 'sportSessions_football',
    targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  },
];

export class GoalRepository {
  /**
   * Get all predefined goal templates
   */
  static getTemplates(): typeof PREDEFINED_GOAL_TEMPLATES {
    return PREDEFINED_GOAL_TEMPLATES;
  }

  /**
   * Create a new structured goal
   */
  static async createGoal(userId: string, payload: CreateGoalPayload): Promise<GoalDoc> {
    if (!userId) throw new Error('userId is required');
    if (!payload.title || !payload.title.trim()) throw new Error('Goal title is required');
    if (typeof payload.target !== 'number' || payload.target <= 0) {
      throw new Error('Goal target must be a positive number greater than 0');
    }
    if (!payload.targetDate) throw new Error('targetDate is required');

    const now = new Date();
    const targetDateObj = new Date(payload.targetDate);
    if (isNaN(targetDateObj.getTime())) {
      throw new Error('Invalid targetDate format');
    }
    if (targetDateObj.getTime() <= now.getTime()) {
      throw new Error('targetDate must be in the future');
    }

    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startDate = payload.startDate || startOfDay.toISOString();
    const goalId = `goal_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const goalDoc: GoalDoc = {
      goalId,
      userId,
      type: payload.type,
      category: payload.category,
      title: payload.title.trim(),
      description: payload.description?.trim() || '',
      target: payload.target,
      current: 0,
      unit: payload.unit || 'units',
      metric: payload.metric || payload.type,
      sportId: payload.sportId,
      exerciseId: payload.exerciseId,
      startDate,
      targetDate: targetDateObj.toISOString(),
      status: 'active',
      progress: 0,
      createdAt: now.toISOString(),
      completedAt: null,
      updatedAt: now.toISOString(),
    };

    // Calculate initial progress from existing authoritative history
    const evaluated = await this.evaluateGoalProgress(goalDoc);

    // Save to local cache
    localGoalsCache.set(goalId, evaluated);

    // Persist to Firestore
    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(GOALS_COLLECTION).doc(goalId).set(evaluated),
          3000
        );
      } catch (err) {
        logger.warn(`[GoalRepo] createGoal ${goalId} Firestore write failed, cached locally:`, err);
      }
    }

    return evaluated;
  }

  /**
   * Get single goal by ID
   */
  static async getGoalById(goalId: string): Promise<GoalDoc | null> {
    if (!goalId) return null;
    if (localGoalsCache.has(goalId)) {
      return localGoalsCache.get(goalId)!;
    }

    if (hasFirebaseCredentials) {
      try {
        const snap = await withTimeout(db.collection(GOALS_COLLECTION).doc(goalId).get(), 2500);
        if (snap.exists) {
          const data = snap.data() as GoalDoc;
          localGoalsCache.set(goalId, data);
          return data;
        }
      } catch (err) {
        logger.warn(`[GoalRepo] getGoalById ${goalId} Firestore read failed:`, err);
      }
    }

    return null;
  }

  /**
   * Get all goals for a user (automatically synchronized with authoritative data)
   */
  static async getUserGoals(userId: string, forceSync = true): Promise<GoalDoc[]> {
    if (!userId) return [];

    let goals: GoalDoc[] = [];

    if (hasFirebaseCredentials) {
      try {
        const snap = await withTimeout(
          db.collection(GOALS_COLLECTION).where('userId', '==', userId).get(),
          3000
        );
        if (!snap.empty) {
          goals = snap.docs.map((d) => d.data() as GoalDoc);
          for (const g of goals) {
            localGoalsCache.set(g.goalId, g);
          }
        }
      } catch (err) {
        logger.warn(`[GoalRepo] getUserGoals for ${userId} Firestore read failed, using local cache:`, err);
      }
    }

    if (goals.length === 0) {
      goals = Array.from(localGoalsCache.values()).filter((g) => g.userId === userId);
    }

    if (forceSync && goals.length > 0) {
      const synced: GoalDoc[] = [];
      for (const g of goals) {
        if (g.status === 'active') {
          const updated = await this.evaluateGoalProgress(g);
          synced.push(updated);
        } else {
          synced.push(g);
        }
      }
      return synced;
    }

    return goals;
  }

  /**
   * Update goal
   */
  static async updateGoal(goalId: string, updates: Partial<GoalDoc>): Promise<GoalDoc | null> {
    const existing = await this.getGoalById(goalId);
    if (!existing) return null;

    const updated: GoalDoc = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localGoalsCache.set(goalId, updated);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(GOALS_COLLECTION).doc(goalId).set(updated, { merge: true }),
          2500
        );
      } catch (err) {
        logger.warn(`[GoalRepo] updateGoal ${goalId} Firestore write failed:`, err);
      }
    }

    return updated;
  }

  /**
   * Cancel/delete a goal
   */
  static async cancelGoal(goalId: string, userId: string): Promise<boolean> {
    const existing = await this.getGoalById(goalId);
    if (!existing) return false;
    if (existing.userId !== userId) {
      throw new Error('Unauthorized: You do not own this goal');
    }

    const updated = await this.updateGoal(goalId, { status: 'cancelled' });
    return !!updated;
  }

  /**
   * Authoritatively evaluate goal progress from completed sessions, streak, and competitive metrics.
   * Ensures progress is 100% genuine and cannot be forged.
   */
  static async evaluateGoalProgress(goal: GoalDoc): Promise<GoalDoc> {
    const { userId, type, startDate, targetDate, target } = goal;
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(targetDate).getTime();
    const now = new Date();

    // Check expiration if still active
    if (goal.status === 'active' && now.getTime() > endMs && goal.current < target) {
      const expiredGoal: GoalDoc = {
        ...goal,
        status: 'expired',
        updatedAt: now.toISOString(),
      };
      localGoalsCache.set(goal.goalId, expiredGoal);
      return expiredGoal;
    }

    // Fetch authoritative user profile and completed sessions
    const [user, sessions, activityLogs, rankDoc] = await Promise.all([
      UserRepository.getById(userId),
      SessionRepository.getUserSessions(userId, { limit: 500, status: 'completed' }),
      ActivityRepository.getByUser(userId, 'all'),
      CompetitiveRepository.getUserRank(userId, 'global').catch(() => null),
    ]);

    // Filter sessions within start date range
    const validSessions = (sessions || []).filter((s) => {
      if (s.status !== 'completed') return false;
      const t = s.completionTime || s.endTime || s.createdAt;
      const ms = typeof (t as any)?.toDate === 'function' ? (t as any).toDate().getTime() : new Date(t as any).getTime();
      return isNaN(ms) || ms >= startMs;
    });

    let current = 0;

    switch (type) {
      case 'workouts_count':
        current = validSessions.length;
        break;

      case 'streak_days':
        current = user?.currentStreak || 0;
        break;

      case 'total_reps':
        current = validSessions.reduce((acc, s) => acc + (Number(s.totalReps) || 0), 0);
        break;

      case 'exercise_reps': {
        const exTarget = (goal.exerciseId || 'squat').toLowerCase();
        let repsCount = 0;
        for (const s of validSessions) {
          if (s.exerciseId?.toLowerCase() === exTarget) {
            repsCount += Number(s.totalReps) || 0;
          } else if (Array.isArray(s.exerciseLogs)) {
            for (const log of s.exerciseLogs) {
              if (log.exerciseId?.toLowerCase() === exTarget) {
                repsCount += Number(log.totalReps) || 0;
              }
            }
          }
        }
        for (const act of activityLogs || []) {
          if (act.exerciseId?.toLowerCase() === exTarget) {
            repsCount += Number(act.reps) || 0;
          }
        }
        current = repsCount;
        break;
      }

      case 'average_form': {
        const formScores = validSessions
          .map((s) => s.formAccuracyAverage || (s as any).averageFormScore)
          .filter((score): score is number => typeof score === 'number' && score > 0);
        current = formScores.length > 0 ? Math.round(formScores.reduce((a, b) => a + b, 0) / formScores.length) : 0;
        break;
      }

      case 'high_form_sessions':
        current = validSessions.filter((s) => {
          const score = s.formAccuracyAverage || (s as any).averageFormScore;
          return typeof score === 'number' && score >= 90;
        }).length;
        break;

      case 'weekly_workouts': {
        // Unique active workout days in the last 7 days
        const sevenDaysAgo = Date.now() - 7 * 86400000;
        const recentDays = new Set<string>();
        for (const s of validSessions) {
          const t = s.completionTime || s.createdAt;
          const ms = typeof (t as any)?.toDate === 'function' ? (t as any).toDate().getTime() : new Date(t as any).getTime();
          if (!isNaN(ms) && ms >= sevenDaysAgo) {
            recentDays.add(new Date(ms).toISOString().slice(0, 10));
          }
        }
        current = recentDays.size;
        break;
      }

      case 'sport_sessions': {
        const sTarget = (goal.sportId || '').toLowerCase();
        current = validSessions.filter((s) => (s.sportId || '').toLowerCase() === sTarget).length;
        break;
      }

      case 'competitive_wins':
        current = rankDoc?.wins || 0;
        break;

      case 'reach_rank_tier':
      case 'gain_rp':
        current = rankDoc?.rankPoints || user?.rankPoints || 100;
        break;

      default:
        current = validSessions.length;
        break;
    }

    const progress = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
    const isCompleted = current >= target;

    const evaluated: GoalDoc = {
      ...goal,
      current,
      progress,
      status: isCompleted ? 'completed' : goal.status,
      completedAt: isCompleted ? (goal.completedAt || now.toISOString()) : null,
      updatedAt: now.toISOString(),
    };

    localGoalsCache.set(goal.goalId, evaluated);

    // Save updated evaluation to Firestore if credentials exist
    if (hasFirebaseCredentials) {
      db.collection(GOALS_COLLECTION)
        .doc(goal.goalId)
        .set(evaluated, { merge: true })
        .catch((err) => logger.warn(`Failed to update evaluated goal ${goal.goalId}:`, err));
    }

    return evaluated;
  }

  /**
   * Clear local cache (for testing)
   */
  static clearCache() {
    localGoalsCache.clear();
  }
}
