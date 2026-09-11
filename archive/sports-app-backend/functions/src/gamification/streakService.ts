import { db } from '../config/firebase';

export interface StreakEvaluationResult {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string;
  streakIncremented: boolean;
  isStreakReset: boolean;
}

export class StreakService {
  /**
   * Pure evaluation function for streak calculation.
   * Compares UTC calendar dates to guarantee anti-tamper accuracy.
   */
  static evaluateStreak(params: {
    lastWorkoutDate: string | null;
    currentStreak: number;
    longestStreak: number;
    sessionDate?: string; // 'YYYY-MM-DD'
  }): StreakEvaluationResult {
    const {
      lastWorkoutDate,
      currentStreak = 0,
      longestStreak = 0,
      sessionDate = new Date().toISOString().split('T')[0],
    } = params;

    // First workout ever
    if (!lastWorkoutDate) {
      return {
        currentStreak: 1,
        longestStreak: Math.max(longestStreak, 1),
        lastWorkoutDate: sessionDate,
        streakIncremented: true,
        isStreakReset: false,
      };
    }

    // Same day duplicate workout: preserve streak, no duplicate increment
    if (lastWorkoutDate === sessionDate) {
      return {
        currentStreak,
        longestStreak,
        lastWorkoutDate: sessionDate,
        streakIncremented: false,
        isStreakReset: false,
      };
    }

    // Calculate calendar day difference
    const lastDateMs = Date.parse(`${lastWorkoutDate}T00:00:00Z`);
    const sessionDateMs = Date.parse(`${sessionDate}T00:00:00Z`);
    const diffDays = Math.round((sessionDateMs - lastDateMs) / (1000 * 60 * 60 * 24));

    // Consecutive day workout (exactly 1 calendar day later)
    if (diffDays === 1) {
      const newStreak = currentStreak + 1;
      return {
        currentStreak: newStreak,
        longestStreak: Math.max(longestStreak, newStreak),
        lastWorkoutDate: sessionDate,
        streakIncremented: true,
        isStreakReset: false,
      };
    }

    // Skipped 1 or more days: streak was broken, reset to 1
    return {
      currentStreak: 1,
      longestStreak: Math.max(longestStreak, 1),
      lastWorkoutDate: sessionDate,
      streakIncremented: true,
      isStreakReset: true,
    };
  }

  /**
   * Atomically updates a user's streak in Firestore.
   */
  static async updateUserStreak(userId: string, sessionDate?: string): Promise<StreakEvaluationResult> {
    const userRef = db.collection('users').doc(userId);

    return await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const data = userDoc.data() || {};

      const result = this.evaluateStreak({
        lastWorkoutDate: data.lastWorkoutDate || null,
        currentStreak: data.currentStreak || 0,
        longestStreak: data.longestStreak || 0,
        sessionDate,
      });

      transaction.set(
        userRef,
        {
          currentStreak: result.currentStreak,
          longestStreak: result.longestStreak,
          lastWorkoutDate: result.lastWorkoutDate,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return result;
    });
  }
}
