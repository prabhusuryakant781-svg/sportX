import { db } from '../config/firebase';
import { ProgressSummaryDoc, ActivityLogDoc } from '../types';

export class ProgressService {
  /**
   * Authoritative server calculation of progress metrics and trends.
   */
  static async getProgressSummary(userId: string): Promise<ProgressSummaryDoc> {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch recent activity logs
    const activitiesSnap = await db
      .collection('activityLogs')
      .where('userId', '==', userId)
      .where('timestamp', '>=', thirtyDaysAgo)
      .orderBy('timestamp', 'desc')
      .get();

    const activities = activitiesSnap.docs.map((d) => d.data() as ActivityLogDoc);

    // 2. Fetch completed sessions
    const sessionsSnap = await db
      .collection('workoutSessions')
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .where('startTime', '>=', thirtyDaysAgo)
      .get();

    const recentSessions = sessionsSnap.docs.map((d) => d.data());

    // 3. Calculate weekly active days
    const weeklyDaySet = new Set<string>();
    recentSessions
      .filter((s) => s.startTime >= sevenDaysAgo)
      .forEach((s) => {
        const dateStr = s.startTime.split('T')[0];
        weeklyDaySet.add(dateStr);
      });

    const weeklyTargetDays = 4;
    const weeklyCompletedDays = weeklyDaySet.size;
    const weeklyPercentage = Math.min(100, Math.round((weeklyCompletedDays / weeklyTargetDays) * 100));

    // 4. Calculate monthly completed workouts
    const monthlyTargetWorkouts = 16;
    const monthlyCompletedWorkouts = recentSessions.length;
    const monthlyPercentage = Math.min(100, Math.round((monthlyCompletedWorkouts / monthlyTargetWorkouts) * 100));

    // 5. Personal Records (max reps in a single set per exercise)
    const personalRecords: Record<string, number> = {};
    const formScoresByDate = new Map<string, { total: number; count: number }>();

    for (const act of activities) {
      const prKey = `${act.exerciseId}_max_reps`;
      personalRecords[prKey] = Math.max(personalRecords[prKey] || 0, act.reps);

      const dateKey = act.timestamp.split('T')[0];
      const current = formScoresByDate.get(dateKey) || { total: 0, count: 0 };
      current.total += act.formScore;
      current.count += 1;
      formScoresByDate.set(dateKey, current);
    }

    const formScoreTrends = Array.from(formScoresByDate.entries())
      .map(([date, val]) => ({
        date,
        score: Math.round(val.total / val.count),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalReps = (userData.totalReps as number) || 0;
    const totalCalories = (userData.totalCalories as number) || 0;
    const totalWorkouts = (userData.totalWorkouts as number) || 0;
    const totalMinutes = (userData.totalMinutes as number) || 0;

    return {
      userId,
      totalReps,
      totalCalories,
      totalWorkouts,
      totalMinutes,
      personalRecords,
      formScoreTrends,
      weeklyProgress: {
        targetDays: weeklyTargetDays,
        completedDays: weeklyCompletedDays,
        percentage: weeklyPercentage,
      },
      monthlyProgress: {
        targetWorkouts: monthlyTargetWorkouts,
        completedWorkouts: monthlyCompletedWorkouts,
        percentage: monthlyPercentage,
      },
      goalPercentage: Math.round((weeklyPercentage + monthlyPercentage) / 2),
      updatedAt: new Date().toISOString(),
    };
  }
}
