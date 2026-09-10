/**
 * SportX Progress Repository
 * Firestore Data Access for progress/{userId}
 * Aggregated summary structures so frontend queries are fast and cheap
 */
import { db, hasFirebaseCredentials } from '../config/firebase';
import { ProgressDoc } from '../types';
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

export class ProgressRepository {
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
   * Update or recalculate progress document for user
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
          daysCompleted: 1,
          completionPercentage: 25,
        },
        monthlyProgress: {
          targetWorkouts: 16,
          workoutsCompleted: 1,
          completionPercentage: 6,
        },
        goalCompletionPercentage: 15,
        totalReps: 0,
        workoutFrequencyPerWeek: 3,
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

    const trends = existing?.formScoreTrends || [];
    trends.push({ date: params.date, score: params.formScore });
    const trimmedTrends = trends.slice(-14); // Keep last 14 sessions trend

    const personalRecords = { ...(existing?.personalRecords || {}) };
    if (params.exerciseId) {
      const prKey = `${params.exerciseId}_max_reps`;
      personalRecords[prKey] = Math.max(personalRecords[prKey] || 0, params.reps);
    }

    const totalReps = (existing?.totalReps || 0) + params.reps;
    const totalDuration = (existing?.totalWorkoutDurationMinutes || 0) + params.durationMinutes;
    const totalCalories = (existing?.totalCalories || 0) + params.calories;

    const daysCompleted = Math.min(7, (existing?.weeklyProgress?.daysCompleted || 0) + 1);
    const targetDays = existing?.weeklyProgress?.targetDays || 4;
    const weeklyPct = Math.round((daysCompleted / targetDays) * 100);

    const workoutsCompleted = (existing?.monthlyProgress?.workoutsCompleted || 0) + 1;
    const targetWorkouts = existing?.monthlyProgress?.targetWorkouts || 16;
    const monthlyPct = Math.round((workoutsCompleted / targetWorkouts) * 100);

    return this.updateProgress(userId, {
      weeklyProgress: {
        targetDays,
        daysCompleted,
        completionPercentage: Math.min(100, weeklyPct),
      },
      monthlyProgress: {
        targetWorkouts,
        workoutsCompleted,
        completionPercentage: Math.min(100, monthlyPct),
      },
      goalCompletionPercentage: Math.min(100, Math.round((workoutsCompleted / 12) * 100)),
      totalReps,
      totalWorkoutDurationMinutes: totalDuration,
      totalCalories,
      personalRecords,
      formScoreTrends: trimmedTrends,
    });
  }
}
