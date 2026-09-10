/**
 * SportX Streak Repository
 * Firestore Data Access for streaks/{userId}
 * Server-authoritative streak tracking and history
 */
import { db } from '../config/firebase';
import { StreakDoc, StreakDayRecord } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'streaks';

export class StreakRepository {
  /**
   * Get streak record for a user
   */
  static async getByUserId(userId: string): Promise<StreakDoc | null> {
    const doc = await db.collection(COLLECTION).doc(userId).get();
    if (!doc.exists) return null;
    return doc.data() as StreakDoc;
  }

  /**
   * Update or initialize streak record
   */
  static async recordDay(
    userId: string,
    currentStreak: number,
    longestStreak: number,
    date: string,
    xpEarned: number
  ): Promise<StreakDoc> {
    const docRef = db.collection(COLLECTION).doc(userId);
    const docSnap = await docRef.get();

    const now = new Date().toISOString();
    let history: StreakDayRecord[] = [];

    if (docSnap.exists) {
      const data = docSnap.data() as StreakDoc;
      history = data.history || [];
      const existingToday = history.find((h) => h.date === date);
      if (existingToday) {
        existingToday.sessionCount += 1;
        existingToday.xpEarned += xpEarned;
      } else {
        history.push({ date, sessionCount: 1, xpEarned });
      }
    } else {
      history = [{ date, sessionCount: 1, xpEarned }];
    }

    // Keep last 60 days of daily streak history
    if (history.length > 60) {
      history = history.slice(-60);
    }

    const streakRecord: StreakDoc = {
      userId,
      currentStreak,
      longestStreak,
      lastWorkoutDate: date,
      history,
      updatedAt: now,
    };

    await docRef.set(streakRecord, { merge: true });
    return streakRecord;
  }

  /**
   * Reset streak for broken continuity
   */
  static async resetStreak(userId: string): Promise<void> {
    await db.collection(COLLECTION).doc(userId).set(
      {
        userId,
        currentStreak: 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
}
