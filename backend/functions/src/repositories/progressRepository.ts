/**
 * SportX Progress Repository
 * Firestore Data Access for progress/{userId}
 * Server-authoritative calculations derived from completed sessions and activity logs.
 */
import { db, hasFirebaseCredentials } from '../config/firebase';
import { ProgressDoc, WorkoutSessionDoc } from '../types';
import { SessionRepository } from './sessionRepository';
import { ActivityRepository } from './activityRepository';
import { UserRepository } from './userRepository';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'progress';

// Timeout helper to avoid hung promises when Firestore is unreachable
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// In-memory cache for fast local testing and offline fallback
const localProgressCache: Map<string, ProgressDoc> = new Map();

export type ProgressPeriod = 'today' | '7d' | '30d' | 'all';

export interface CalculatedProgress {
  userId: string;
  period: ProgressPeriod;
  totalWorkouts: number;
  totalReps: number;
  totalCalories: number;
  totalMinutes: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  uniqueWorkoutDays: number;
  workoutFrequencyPerWeek: number;
  weeklyProgress: {
    targetDays: number;
    daysCompleted: number;
    completionPercentage: number;
  };
  monthlyProgress: {
    targetWorkouts: number;
    workoutsCompleted: number;
    completionPercentage: number;
  };
  goalCompletionPercentage: number;
  personalRecords: Record<string, number>;
  formScoreTrends: Array<{ date: string; score: number }>;
  averageFormScore: number;
}

export function parseSessionTime(s: WorkoutSessionDoc): number {
  const raw = s.endTime || s.completionTime || s.createdAt;
  if (!raw) return 0;
  if (typeof (raw as any).toDate === 'function') {
    return (raw as any).toDate().getTime();
  }
  if (raw instanceof Date) {
    return raw.getTime();
  }
  const t = new Date(raw as any).getTime();
  return isNaN(t) ? 0 : t;
}

export class ProgressRepository {
  /**
   * Calculate trusted, server-authoritative progress from completed sessions & activity logs
   */
  static async calculateProgress(
    userId: string,
    period: ProgressPeriod = 'all',
    referenceDate?: Date
  ): Promise<CalculatedProgress> {
    const now = referenceDate || new Date();

    // Fetch user profile, completed sessions, and activity logs
    const [user, userSessions, activityLogs] = await Promise.all([
      UserRepository.getById(userId),
      SessionRepository.getUserSessions(userId, { limit: 1000, status: 'completed' }),
      ActivityRepository.getByUser(userId, 'all'),
    ]);

    // Strictly consider only completed, finalized sessions
    const completedSessions = (userSessions || []).filter((s) => s.status === 'completed');

    // Determine period cutoff in UTC
    let cutoff: number | null = null;
    if (period === 'today') {
      cutoff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
    } else if (period === '7d') {
      cutoff = now.getTime() - 7 * 86400000;
    } else if (period === '30d') {
      cutoff = now.getTime() - 30 * 86400000;
    }

    const sessionsInPeriod = cutoff === null
      ? completedSessions
      : completedSessions.filter((s) => parseSessionTime(s) >= cutoff!);

    // Basic Aggregations
    const totalWorkouts = sessionsInPeriod.length;
    const totalReps = sessionsInPeriod.reduce((sum, s) => sum + (Number(s.totalReps) || 0), 0);
    const totalMinutes = sessionsInPeriod.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);
    const totalCalories = sessionsInPeriod.reduce((sum, s) => sum + (Number(s.caloriesBurned) || 0), 0);
    const totalXp = period === 'all'
      ? Math.max(user?.xp || 0, sessionsInPeriod.reduce((sum, s) => sum + (Number(s.xpEarned) || 0), 0))
      : sessionsInPeriod.reduce((sum, s) => sum + (Number(s.xpEarned) || 0), 0);

    // Unique workout days in period (same-day workouts count as 1 unique active day)
    const uniqueDays = new Set<string>();
    for (const s of sessionsInPeriod) {
      const t = parseSessionTime(s);
      if (t > 0) {
        uniqueDays.add(new Date(t).toISOString().slice(0, 10));
      }
    }
    const uniqueWorkoutDays = uniqueDays.size;

    // Workout Frequency per week
    let workoutFrequencyPerWeek = 0;
    if (totalWorkouts > 0) {
      if (period === 'today' || period === '7d') {
        workoutFrequencyPerWeek = totalWorkouts;
      } else if (period === '30d') {
        workoutFrequencyPerWeek = Math.round((totalWorkouts / (30 / 7)) * 10) / 10;
      } else {
        // all-time
        const allTimestamps = completedSessions.map(parseSessionTime).filter((t) => t > 0);
        if (allTimestamps.length > 0) {
          const earliest = Math.min(...allTimestamps);
          const weeksSpan = Math.max(1, (now.getTime() - earliest) / (7 * 86400000));
          workoutFrequencyPerWeek = Math.round((completedSessions.length / weeksSpan) * 10) / 10;
        } else {
          workoutFrequencyPerWeek = 0;
        }
      }
    }

    // Chronological Form Score Trends (grouped by date)
    const dateScoresMap = new Map<string, number[]>();
    for (const s of sessionsInPeriod) {
      const t = parseSessionTime(s);
      if (t > 0 && typeof s.formAccuracyAverage === 'number' && s.formAccuracyAverage > 0) {
        const dayKey = new Date(t).toISOString().slice(0, 10);
        if (!dateScoresMap.has(dayKey)) {
          dateScoresMap.set(dayKey, []);
        }
        dateScoresMap.get(dayKey)!.push(s.formAccuracyAverage);
      }
    }

    const formScoreTrends: Array<{ date: string; score: number }> = [];
    for (const [date, scores] of dateScoresMap.entries()) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      formScoreTrends.push({ date, score: avg });
    }
    formScoreTrends.sort((a, b) => a.date.localeCompare(b.date));

    // Average Form Score across period sessions
    const allFormScores: number[] = [];
    for (const s of sessionsInPeriod) {
      if (typeof s.formAccuracyAverage === 'number' && s.formAccuracyAverage > 0) {
        allFormScores.push(s.formAccuracyAverage);
      }
    }
    const averageFormScore = allFormScores.length > 0
      ? Math.round(allFormScores.reduce((a, b) => a + b, 0) / allFormScores.length)
      : 0;

    // Dynamic Personal Records (PRs) computed across ALL completed sessions and activity logs
    const personalRecords: Record<string, number> = {};
    for (const s of completedSessions) {
      if (s.exerciseLogs && Array.isArray(s.exerciseLogs)) {
        for (const ex of s.exerciseLogs) {
          if (!ex.exerciseId) continue;
          const exId = ex.exerciseId;
          const hasSets = ex.sets && Array.isArray(ex.sets) && ex.sets.length > 0;
          if (hasSets) {
            for (const set of ex.sets) {
              const reps = Number(set.reps) || 0;
              if (reps > 0) {
                const key = `${exId}_max_reps`;
                personalRecords[key] = Math.max(personalRecords[key] || 0, reps);
              }
            }
          } else if (ex.totalReps && Number(ex.totalReps) > 0) {
            const key = `${exId}_max_reps`;
            personalRecords[key] = Math.max(personalRecords[key] || 0, Number(ex.totalReps));
          }

          if (ex.totalReps && Number(ex.totalReps) > 0) {
            const sessionPrKey = `${exId}_session_max_reps`;
            personalRecords[sessionPrKey] = Math.max(personalRecords[sessionPrKey] || 0, Number(ex.totalReps));
          }
        }
      }

      if (s.exerciseId && Number(s.totalReps) > 0 && (!s.exerciseLogs || s.exerciseLogs.length === 0)) {
        const key = `${s.exerciseId}_max_reps`;
        personalRecords[key] = Math.max(personalRecords[key] || 0, Number(s.totalReps));
      }

      if (s.exerciseId) {
        const dur = Number(s.durationSeconds) || (Number(s.durationMinutes) * 60) || 0;
        if (dur > 0) {
          const key = `${s.exerciseId}_max_duration_seconds`;
          personalRecords[key] = Math.max(personalRecords[key] || 0, dur);
        }
      }
    }

    for (const log of activityLogs || []) {
      if (!log.exerciseId) continue;
      const exId = log.exerciseId;
      if (log.reps && Number(log.reps) > 0) {
        const key = `${exId}_max_reps`;
        personalRecords[key] = Math.max(personalRecords[key] || 0, Number(log.reps));
      }
      if (log.durationSeconds && Number(log.durationSeconds) > 0) {
        const key = `${exId}_max_duration_seconds`;
        personalRecords[key] = Math.max(personalRecords[key] || 0, Number(log.durationSeconds));
      }
    }

    // Weekly & Monthly Goals based on User Preferences
    const targetDays = user?.workoutDaysPerWeek && user.workoutDaysPerWeek >= 1 && user.workoutDaysPerWeek <= 7
      ? user.workoutDaysPerWeek
      : 4;
    const targetMonthlyWorkouts = targetDays * 4;

    // Unique active days in last 7 days
    const sevenDaysCutoff = now.getTime() - 7 * 86400000;
    const last7DaysSessions = completedSessions.filter((s) => parseSessionTime(s) >= sevenDaysCutoff);
    const weekUniqueDays = new Set<string>();
    for (const s of last7DaysSessions) {
      const t = parseSessionTime(s);
      if (t > 0) {
        weekUniqueDays.add(new Date(t).toISOString().slice(0, 10));
      }
    }
    const daysCompleted = weekUniqueDays.size;
    const weeklyCompletionPercentage = targetDays > 0
      ? Math.min(100, Math.round((daysCompleted / targetDays) * 100))
      : 0;

    // Completed workouts in last 30 days
    const thirtyDaysCutoff = now.getTime() - 30 * 86400000;
    const last30DaysSessions = completedSessions.filter((s) => parseSessionTime(s) >= thirtyDaysCutoff);
    const workoutsCompleted = last30DaysSessions.length;
    const monthlyCompletionPercentage = targetMonthlyWorkouts > 0
      ? Math.min(100, Math.round((workoutsCompleted / targetMonthlyWorkouts) * 100))
      : 0;

    const goalCompletionPercentage = period === '30d'
      ? monthlyCompletionPercentage
      : weeklyCompletionPercentage;

    return {
      userId,
      period,
      totalWorkouts,
      totalReps,
      totalCalories,
      totalMinutes,
      totalXp,
      currentStreak: user?.currentStreak || 0,
      longestStreak: user?.longestStreak || 0,
      level: user?.level || 1,
      uniqueWorkoutDays,
      workoutFrequencyPerWeek,
      weeklyProgress: {
        targetDays,
        daysCompleted,
        completionPercentage: weeklyCompletionPercentage,
      },
      monthlyProgress: {
        targetWorkouts: targetMonthlyWorkouts,
        workoutsCompleted,
        completionPercentage: monthlyCompletionPercentage,
      },
      goalCompletionPercentage,
      personalRecords,
      formScoreTrends,
      averageFormScore,
    };
  }

  /**
   * Get pre-aggregated progress document for user
   */
  static async getByUserId(userId: string): Promise<ProgressDoc | null> {
    if (!userId) return null;

    if (hasFirebaseCredentials) {
      try {
        const doc = await withTimeout(db.collection(COLLECTION).doc(userId).get(), 2000);
        if (doc.exists) {
          const data = doc.data() as ProgressDoc;
          localProgressCache.set(userId, data);
          return data;
        }
      } catch (err) {
        logger.warn(`[ProgressRepository] Firestore getByUserId failed for ${userId}:`, err);
      }
    }

    return localProgressCache.get(userId) || null;
  }

  /**
   * Update or recalculate progress document for user (no fabricated numbers)
   */
  static async updateProgress(userId: string, data: Partial<ProgressDoc>): Promise<ProgressDoc> {
    const now = new Date().toISOString();
    const existing = await this.getByUserId(userId);

    let current: ProgressDoc;

    if (existing) {
      current = {
        ...existing,
        ...data,
        updatedAt: now,
      };
    } else {
      current = {
        userId,
        weeklyProgress: {
          targetDays: 4,
          daysCompleted: 0,
          completionPercentage: 0,
        },
        monthlyProgress: {
          targetWorkouts: 16,
          workoutsCompleted: 0,
          completionPercentage: 0,
        },
        goalCompletionPercentage: 0,
        totalReps: 0,
        workoutFrequencyPerWeek: 0,
        totalWorkoutDurationMinutes: 0,
        totalCalories: 0,
        personalRecords: {},
        formScoreTrends: [],
        ...data,
        updatedAt: now,
      };
    }

    localProgressCache.set(userId, current);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(COLLECTION).doc(userId).set(current, { merge: true }),
          2000
        );
      } catch (err) {
        logger.warn(`[ProgressRepository] Firestore updateProgress failed for ${userId}:`, err);
      }
    }

    return current;
  }

  /**
   * Aggregate new workout session into progress document
   */
  static async recordWorkout(
    userId: string,
    params: {
      reps: number;
      durationMinutes: number;
      calories: number;
      formScore: number;
      date: string;
      exerciseId?: string;
    }
  ): Promise<ProgressDoc> {
    const existing = await this.getByUserId(userId);

    const trends = existing?.formScoreTrends ? [...existing.formScoreTrends] : [];
    trends.push({ date: params.date, score: params.formScore });
    const trimmedTrends = trends.slice(-14);

    const personalRecords = { ...(existing?.personalRecords || {}) };
    if (params.exerciseId) {
      const prKey = `${params.exerciseId}_max_reps`;
      personalRecords[prKey] = Math.max(personalRecords[prKey] || 0, params.reps);
    }

    const totalReps = (existing?.totalReps || 0) + params.reps;
    const totalDuration = (existing?.totalWorkoutDurationMinutes || 0) + params.durationMinutes;
    const totalCalories = (existing?.totalCalories || 0) + params.calories;

    const targetDays = existing?.weeklyProgress?.targetDays || 4;
    const daysCompleted = Math.min(targetDays, (existing?.weeklyProgress?.daysCompleted || 0) + 1);
    const weeklyPct = Math.min(100, Math.round((daysCompleted / targetDays) * 100));

    const targetWorkouts = existing?.monthlyProgress?.targetWorkouts || 16;
    const workoutsCompleted = (existing?.monthlyProgress?.workoutsCompleted || 0) + 1;
    const monthlyPct = Math.min(100, Math.round((workoutsCompleted / targetWorkouts) * 100));

    return this.updateProgress(userId, {
      weeklyProgress: {
        targetDays,
        daysCompleted,
        completionPercentage: weeklyPct,
      },
      monthlyProgress: {
        targetWorkouts,
        workoutsCompleted,
        completionPercentage: monthlyPct,
      },
      goalCompletionPercentage: weeklyPct,
      totalReps,
      totalWorkoutDurationMinutes: totalDuration,
      totalCalories,
      personalRecords,
      formScoreTrends: trimmedTrends,
    });
  }

  /**
   * Delete progress document and cache entry for user
   */
  static async delete(userId: string): Promise<void> {
    localProgressCache.delete(userId);
    if (hasFirebaseCredentials) {
      try {
        await withTimeout(db.collection(COLLECTION).doc(userId).delete(), 2000);
      } catch (err) {
        logger.warn(`[ProgressRepository] Firestore delete failed for ${userId}:`, err);
      }
    }
  }
}
