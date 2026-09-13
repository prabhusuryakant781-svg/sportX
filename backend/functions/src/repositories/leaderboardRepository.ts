/**
 * SportX Leaderboard Repository
 * Real-time dynamic Firestore ranking queries based on XP, RP, streaks, and university/campus
 */
import { db, hasFirebaseCredentials } from '../config/firebase';
import { LeaderboardEntryDoc, UserDoc } from '../types';
import * as logger from 'firebase-functions/logger';
import { assertProductionSafe } from '../config/productionSafety';

// Timeout helper to avoid hung promises when Firestore is unreachable offline
async function withTimeout<T>(promise: Promise<T>, ms = 4000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export class LeaderboardRepository {
  /**
   * Global leaderboard sorted by total XP or RP descending
   */
  static async getGlobal(limit: number = 25, sortBy: 'xp' | 'rp' = 'xp'): Promise<LeaderboardEntryDoc[]> {
    if (hasFirebaseCredentials) {
      try {
        let snap;
        if (sortBy === 'rp') {
          // Fetch users and sort in memory by rankPoints to support all documents seamlessly
          snap = await withTimeout(
            db.collection('users')
              .limit(Math.max(50, limit * 2))
              .get(),
            4000
          );
        } else {
          snap = await withTimeout(
            db.collection('users')
              .orderBy('xp', 'desc')
              .limit(limit)
              .get(),
            4000
          );
        }

        if (!snap.empty) {
          const entries = snap.docs.map((doc, idx) => {
            const u = doc.data() as UserDoc;
            const totalXp = (u as any).totalXp ?? u.xp ?? (u as any).XP ?? 0;
            return {
              userId: u.userId,
              name: u.name || 'Anonymous Athlete',
              profileImage: u.profileImage || '',
              collegeName: u.collegeName || 'Campus University',
              department: u.department || 'General',
              totalXp,
              currentStreak: u.currentStreak || 0,
              level: u.level || 1,
              rank: idx + 1,
              rankPoints: u.rankPoints ?? 100,
              rankTier: u.rankTier || 'Bronze',
              equippedTitle: u.equippedTitle,
              featuredBadge: u.featuredBadges?.[0] || u.badges?.[0],
              lastUpdated: u.updatedAt || new Date().toISOString(),
            };
          });

          if (sortBy === 'rp') {
            entries.sort((a, b) => (b.rankPoints ?? 100) - (a.rankPoints ?? 100));
            entries.forEach((e, idx) => {
              e.rank = idx + 1;
            });
          }

          return entries.slice(0, limit);
        }
      } catch (err) {
        logger.error('Error fetching global leaderboard:', err);
        assertProductionSafe('LeaderboardRepository.getGlobal', err);
      }
    }

    return [];
  }

  /**
   * College-specific or department leaderboard
   */
  static async getByCollege(
    collegeName: string = 'Campus University',
    limit: number = 25,
    sortBy: 'xp' | 'rp' = 'xp'
  ): Promise<LeaderboardEntryDoc[]> {
    if (hasFirebaseCredentials) {
      try {
        const snap = await withTimeout(
          db.collection('users')
            .where('collegeName', '==', collegeName)
            .limit(Math.max(50, limit * 2))
            .get(),
          4000
        );

        if (!snap.empty) {
          const entries = snap.docs.map((doc, idx) => {
            const u = doc.data() as UserDoc;
            const totalXp = (u as any).totalXp ?? u.xp ?? (u as any).XP ?? 0;
            return {
              userId: u.userId,
              name: u.name || 'Anonymous Athlete',
              profileImage: u.profileImage || '',
              collegeName: u.collegeName,
              department: u.department,
              totalXp,
              currentStreak: u.currentStreak || 0,
              level: u.level || 1,
              rank: idx + 1,
              rankPoints: u.rankPoints ?? 100,
              rankTier: u.rankTier || 'Bronze',
              equippedTitle: u.equippedTitle,
              featuredBadge: u.featuredBadges?.[0] || u.badges?.[0],
              lastUpdated: u.updatedAt || new Date().toISOString(),
            };
          });

          if (sortBy === 'rp') {
            entries.sort((a, b) => (b.rankPoints ?? 100) - (a.rankPoints ?? 100));
          } else {
            entries.sort((a, b) => b.totalXp - a.totalXp);
          }

          entries.forEach((e, idx) => {
            e.rank = idx + 1;
          });

          return entries.slice(0, limit);
        }
      } catch (err) {
        logger.error(`Error fetching college leaderboard for ${collegeName}:`, err);
        assertProductionSafe('LeaderboardRepository.getByCollege', err);
      }
    }

    return [];
  }
}
