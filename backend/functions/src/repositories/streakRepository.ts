/**
 * SportX Streak Repository
 * Firestore Data Access for streaks/{userId}
 * Server-authoritative streak tracking and history
 * Supports real Firestore operations with in-memory fallback for local offline testing.
 */
import { db, hasFirebaseCredentials } from '../config/firebase';
import { StreakDoc, StreakDayRecord } from '../types';
import * as logger from 'firebase-functions/logger';
import { assertProductionSafe } from '../config/productionSafety';

const COLLECTION = 'streaks';

// Timeout helper to avoid hung promises when Firestore is unreachable
async function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// In-memory cache to support fast local testing and offline fallback
const localStreaksCache: Map<string, StreakDoc> = new Map();

export class StreakRepository {
  /**
   * Get streak record for a user
   */
  static async getByUserId(userId: string): Promise<StreakDoc | null> {
    const cached = localStreaksCache.get(userId);
    if (cached) return cached;

    if (hasFirebaseCredentials) {
      try {
        const doc = await withTimeout(db.collection(COLLECTION).doc(userId).get(), 2000);
        if (!doc.exists) return null;
        const data = doc.data() as StreakDoc;
        localStreaksCache.set(userId, data);
        return data;
      } catch (err) {
        assertProductionSafe('StreakRepository.getByUserId', err);
        return null;
      }
    }
    return null;
  }

  /**
   * Update or initialize streak record
   */
  static async recordDay(
    userId: string,
    currentStreak: number,
    longestStreak: number,
    date: string,
    xpEarned: number,
    activityType: 'workout' | 'lobby' | 'challenge' = 'workout',
    activityId?: string
  ): Promise<StreakDoc> {
    const cached = localStreaksCache.get(userId);
    let history: StreakDayRecord[] = cached?.history ? [...cached.history] : [];

    const now = new Date().toISOString();

    const existingToday = history.find((h) => h.date === date);
    if (existingToday) {
      existingToday.sessionCount = (existingToday.sessionCount || 0) + 1;
      existingToday.xpEarned = (existingToday.xpEarned || 0) + xpEarned;
      if (activityType) existingToday.activityType = activityType;
      if (activityId) existingToday.activityId = activityId;
    } else {
      history.push({ date, sessionCount: 1, xpEarned, activityType, activityId });
    }

    // Keep last 60 days of daily streak history
    if (history.length > 60) {
      history = history.slice(-60);
    }

    const streakRecord: StreakDoc = {
      userId,
      currentStreak,
      longestStreak,
      bestStreak: longestStreak,
      lastWorkoutDate: activityType === 'workout' ? date : (cached?.lastWorkoutDate || date),
      lastActivityDate: date,
      history,
      updatedAt: now,
    };

    localStreaksCache.set(userId, streakRecord);

    if (hasFirebaseCredentials) {
      try {
        const docRef = db.collection(COLLECTION).doc(userId);
        await withTimeout(docRef.set(streakRecord, { merge: true }), 2000);
      } catch (err) {
        logger.warn('[StreakRepository] Firestore write failed:', err);
        assertProductionSafe('StreakRepository.recordDay');
      }
    }

    return streakRecord;
  }

  /**
   * Reset streak for broken continuity
   */
  static async resetStreak(userId: string): Promise<void> {
    const cached = localStreaksCache.get(userId);
    const now = new Date().toISOString();
    if (cached) {
      localStreaksCache.set(userId, {
        ...cached,
        currentStreak: 0,
        updatedAt: now,
      });
    }

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(COLLECTION).doc(userId).set(
            {
              userId,
              currentStreak: 0,
              updatedAt: now,
            },
            { merge: true }
          ),
          2000
        );
      } catch (err) {
        assertProductionSafe('StreakRepository.resetStreak');
      }
    }
  }

  /**
   * Clear local cache for unit test isolation
   */
  static clearLocalCache(): void {
    localStreaksCache.clear();
  }
}
