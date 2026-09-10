/**
 * SportX Analytics Repository
 * Firestore Data Access for:
 * - userStats/{userId}
 * - userAnalytics/{userId}/daily/{date}
 * - userAnalytics/{userId}/weekly/{weekId}
 * - userAnalytics/{userId}/monthly/{monthId}
 */
import { db } from '../config/firebase';
import { UserStatsDoc, PeriodAnalyticsDoc } from '../types';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

export class AnalyticsRepository {
  /**
   * Get overall user lifetime stats
   */
  static async getUserStats(userId: string): Promise<UserStatsDoc | null> {
    const doc = await db.collection('userStats').doc(userId).get();
    if (!doc.exists) return null;
    return doc.data() as UserStatsDoc;
  }

  /**
   * Record workout completion metrics into userStats and daily/weekly/monthly periods
   */
  static async recordWorkoutMetrics(params: {
    userId: string;
    durationMinutes: number;
    calories: number;
    reps: number;
    formAccuracy: number;
    muscleGroups?: string[];
  }): Promise<void> {
    const { userId, durationMinutes, calories, reps, formAccuracy, muscleGroups = [] } = params;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM

    // Approximate ISO week string: YYYY-Wxx
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    const weekStr = `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    const batch = db.batch();

    // 1. Update userStats/{userId}
    const statsRef = db.collection('userStats').doc(userId);
    const statsDoc = await statsRef.get();

    if (!statsDoc.exists) {
      const initialStats: UserStatsDoc = {
        userId,
        workoutsCompleted: 1,
        totalDuration: durationMinutes,
        totalCalories: calories,
        totalReps: reps,
        averageFormAccuracy: formAccuracy,
        muscleGroupBreakdown: {},
        updatedAt: now.toISOString(),
      };
      for (const m of muscleGroups) {
        initialStats.muscleGroupBreakdown[m] = (initialStats.muscleGroupBreakdown[m] || 0) + reps;
      }
      batch.set(statsRef, initialStats);
    } else {
      const current = statsDoc.data() as UserStatsDoc;
      const count = (current.workoutsCompleted || 0) + 1;
      const runningAvg = current.averageFormAccuracy || 0;
      const newAvg = Math.round(((runningAvg * (count - 1)) + formAccuracy) / count);

      const muscleUpdate: Record<string, any> = {};
      for (const m of muscleGroups) {
        muscleUpdate[`muscleGroupBreakdown.${m}`] = FieldValue.increment(reps);
      }

      batch.update(statsRef, {
        workoutsCompleted: FieldValue.increment(1),
        totalDuration: FieldValue.increment(durationMinutes),
        totalCalories: FieldValue.increment(calories),
        totalReps: FieldValue.increment(reps),
        averageFormAccuracy: newAvg,
        ...muscleUpdate,
        updatedAt: now.toISOString(),
      });
    }

    // 2. Update daily analytics: userAnalytics/{userId}/daily/{dateStr}
    const dailyRef = db.collection('userAnalytics').doc(userId).collection('daily').doc(dateStr);
    batch.set(
      dailyRef,
      {
        periodId: dateStr,
        userId,
        workoutsCompleted: FieldValue.increment(1),
        totalDuration: FieldValue.increment(durationMinutes),
        totalCalories: FieldValue.increment(calories),
        totalReps: FieldValue.increment(reps),
        averageFormAccuracy: formAccuracy,
        updatedAt: now.toISOString(),
      },
      { merge: true }
    );

    // 3. Update weekly analytics: userAnalytics/{userId}/weekly/{weekStr}
    const weeklyRef = db.collection('userAnalytics').doc(userId).collection('weekly').doc(weekStr);
    batch.set(
      weeklyRef,
      {
        periodId: weekStr,
        userId,
        workoutsCompleted: FieldValue.increment(1),
        totalDuration: FieldValue.increment(durationMinutes),
        totalCalories: FieldValue.increment(calories),
        totalReps: FieldValue.increment(reps),
        averageFormAccuracy: formAccuracy,
        updatedAt: now.toISOString(),
      },
      { merge: true }
    );

    // 4. Update monthly analytics: userAnalytics/{userId}/monthly/{monthStr}
    const monthlyRef = db.collection('userAnalytics').doc(userId).collection('monthly').doc(monthStr);
    batch.set(
      monthlyRef,
      {
        periodId: monthStr,
        userId,
        workoutsCompleted: FieldValue.increment(1),
        totalDuration: FieldValue.increment(durationMinutes),
        totalCalories: FieldValue.increment(calories),
        totalReps: FieldValue.increment(reps),
        averageFormAccuracy: formAccuracy,
        updatedAt: now.toISOString(),
      },
      { merge: true }
    );

    await batch.commit();
  }

  /**
   * Get analytics history for daily/weekly periods
   */
  static async getPeriodHistory(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly',
    limit: number = 14
  ): Promise<PeriodAnalyticsDoc[]> {
    try {
      const snap = await db
        .collection('userAnalytics')
        .doc(userId)
        .collection(period)
        .limit(limit)
        .get();

      return snap.docs.map((d) => d.data() as PeriodAnalyticsDoc);
    } catch (err) {
      logger.error(`Error querying ${period} analytics for ${userId}:`, err);
      return [];
    }
  }
}
