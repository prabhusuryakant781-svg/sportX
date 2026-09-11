import { db } from '../config/firebase';
import { WorkoutSessionDoc, SessionStatus } from '../types';
import { XPService } from '../gamification/xpService';
import { StreakService } from '../gamification/streakService';
import { BadgeService } from '../gamification/badgeService';

export class SessionService {
  /**
   * Start a new workout session
   */
  static async startSession(params: {
    userId: string;
    workoutPlanId?: string;
    exerciseId?: string;
    totalExercises?: number;
  }): Promise<WorkoutSessionDoc> {
    const { userId, workoutPlanId, exerciseId, totalExercises = 1 } = params;

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const session: WorkoutSessionDoc = {
      id: sessionId,
      userId,
      workoutPlanId,
      exerciseId,
      status: 'started',
      startTime: now,
      pauseTime: null,
      resumeTime: null,
      completionTime: null,
      duration: 0,
      totalExercises,
      completedExercises: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('workoutSessions').doc(sessionId).set(session);
    return session;
  }

  /**
   * Transition session state (pause / resume / cancel)
   */
  static async updateSessionState(
    sessionId: string,
    userId: string,
    targetStatus: SessionStatus
  ): Promise<WorkoutSessionDoc> {
    const sessionRef = db.collection('workoutSessions').doc(sessionId);
    const snap = await sessionRef.get();

    if (!snap.exists) {
      throw new Error(`Session '${sessionId}' not found`);
    }

    const session = snap.data() as WorkoutSessionDoc;
    if (session.userId !== userId) {
      throw new Error('Forbidden: You do not own this session');
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      throw new Error(`Cannot modify session already in terminal status '${session.status}'`);
    }

    const now = new Date().toISOString();
    const updates: Partial<WorkoutSessionDoc> = {
      status: targetStatus,
      updatedAt: now,
    };

    if (targetStatus === 'paused') {
      updates.pauseTime = now;
    } else if (targetStatus === 'resumed') {
      updates.resumeTime = now;
    } else if (targetStatus === 'cancelled') {
      updates.completionTime = now;
    }

    await sessionRef.update(updates);
    return { ...session, ...updates };
  }

  /**
   * Authoritative server-side workout session completion.
   * Calculates duration, awards anti-cheat XP, evaluates streak, and unlocks badges.
   */
  static async completeSession(params: {
    sessionId: string;
    userId: string;
    totalReps: number;
    averageFormScore: number;
    caloriesBurned?: number;
    completedExercises?: number;
    durationSeconds?: number;
  }): Promise<{
    session: WorkoutSessionDoc;
    xpEarned: number;
    totalXP: number;
    newLevel: number;
    currentStreak: number;
    longestStreak: number;
    streakIncremented: boolean;
    unlockedBadges: unknown[];
  }> {
    const {
      sessionId,
      userId,
      totalReps = 0,
      averageFormScore = 80,
      caloriesBurned = Math.round(totalReps * 0.4),
      completedExercises = 1,
      durationSeconds,
    } = params;

    const sessionRef = db.collection('workoutSessions').doc(sessionId);
    const snap = await sessionRef.get();

    if (!snap.exists) {
      throw new Error(`Session '${sessionId}' not found`);
    }

    const session = snap.data() as WorkoutSessionDoc;
    if (session.userId !== userId) {
      throw new Error('Forbidden: You do not own this workout session');
    }

    if (session.status === 'completed') {
      throw new Error('Session is already completed');
    }

    const now = new Date().toISOString();
    const calculatedDuration = durationSeconds !== undefined
      ? durationSeconds
      : Math.round((Date.now() - Date.parse(session.startTime)) / 1000);

    const durationMinutes = Math.max(1, Math.round(calculatedDuration / 60));

    // 1. Calculate server-controlled XP with anti-cheat caps
    const xpEarned = XPService.calculateSessionXP({
      totalReps,
      formAccuracyAverage: averageFormScore,
      durationMinutes,
      isCompleted: true,
    });

    // 2. Record idempotent XP transaction
    const xpResult = await XPService.recordXPIdempotent({
      userId,
      sessionId,
      amount: xpEarned,
      reason: 'workout_completed',
    });

    // 3. Evaluate and update streak
    const streakResult = await StreakService.updateUserStreak(userId);

    // 4. Update session document
    const resultSummary = {
      totalReps,
      averageFormScore,
      caloriesBurned,
      xpEarned,
    };

    const sessionUpdates: Partial<WorkoutSessionDoc> = {
      status: 'completed',
      completionTime: now,
      duration: calculatedDuration,
      completedExercises,
      resultSummary,
      updatedAt: now,
    };

    await sessionRef.update(sessionUpdates);

    // 5. Update user aggregate stats
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};

    const updatedTotalWorkouts = (userData.totalWorkouts || 0) + 1;
    const updatedTotalReps = (userData.totalReps || 0) + totalReps;
    const updatedTotalMinutes = (userData.totalMinutes || 0) + durationMinutes;
    const updatedTotalCalories = (userData.totalCalories || 0) + caloriesBurned;

    await userRef.update({
      totalWorkouts: updatedTotalWorkouts,
      totalReps: updatedTotalReps,
      totalMinutes: updatedTotalMinutes,
      totalCalories: updatedTotalCalories,
      updatedAt: now,
    });

    // 6. Check and unlock badges server-side
    const unlockedBadges = await BadgeService.checkAndUnlockBadges({
      userId,
      totalWorkouts: updatedTotalWorkouts,
      totalReps: updatedTotalReps,
      totalXP: xpResult.totalXP,
      currentStreak: streakResult.currentStreak,
      sessionFormAccuracy: averageFormScore,
    });

    return {
      session: { ...session, ...sessionUpdates },
      xpEarned,
      totalXP: xpResult.totalXP,
      newLevel: xpResult.newLevel,
      currentStreak: streakResult.currentStreak,
      longestStreak: streakResult.longestStreak,
      streakIncremented: streakResult.streakIncremented,
      unlockedBadges,
    };
  }

  /**
   * Retrieve session by ID (with ownership check)
   */
  static async getSession(sessionId: string, userId: string): Promise<WorkoutSessionDoc | null> {
    const snap = await db.collection('workoutSessions').doc(sessionId).get();
    if (!snap.exists) return null;

    const data = snap.data() as WorkoutSessionDoc;
    if (data.userId !== userId) {
      throw new Error('Forbidden: You do not own this session');
    }

    return data;
  }

  /**
   * Retrieve currently active session for user
   */
  static async getCurrentSession(userId: string): Promise<WorkoutSessionDoc | null> {
    const snap = await db
      .collection('workoutSessions')
      .where('userId', '==', userId)
      .where('status', 'in', ['started', 'paused', 'resumed'])
      .limit(1)
      .get();

    if (snap.empty) return null;
    return snap.docs[0].data() as WorkoutSessionDoc;
  }

  /**
   * List recent sessions for user
   */
  static async listUserSessions(userId: string, limit = 20, status?: string): Promise<WorkoutSessionDoc[]> {
    let query = db
      .collection('workoutSessions')
      .where('userId', '==', userId);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snap = await query.orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs.map((d) => d.data() as WorkoutSessionDoc);
  }
}
