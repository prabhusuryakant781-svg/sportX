/**
 * SportX Progress Repository
 * Firestore Data Access for progress/{userId}
 * Aggregated summary structures so frontend queries are fast and cheap
 */
import { db } from '../config/firebase';
import { ProgressDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'progress';

export class ProgressRepository {
  /**
   * Get pre-aggregated progress document for user
   */
  static async getByUserId(userId: string): Promise<ProgressDoc | null> {
    const doc = await db.collection(COLLECTION).doc(userId).get();
    if (!doc.exists) return null;
    return doc.data() as ProgressDoc;
  }

  /**
   * Update or recalculate progress document for user
   */
  static async updateProgress(userId: string, data: Partial<ProgressDoc>): Promise<ProgressDoc> {
    const ref = db.collection(COLLECTION).doc(userId);
    const snap = await ref.get();

    const now = new Date().toISOString();
    let current: ProgressDoc;

    if (snap.exists) {
      current = {
        ...(snap.data() as ProgressDoc),
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

    await ref.set(current, { merge: true });
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
