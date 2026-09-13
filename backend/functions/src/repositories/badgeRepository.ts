/**
 * SportX Badge Repository
 * Firestore Data Access for badges/{badgeId} and userBadges/{id}
 * Supports real Firestore operations with in-memory fallback for local offline testing.
 */
import { db, hasFirebaseCredentials } from '../config/firebase';
import { BadgeDoc, UserBadgeDoc } from '../types';
import { SYSTEM_BADGES } from '../services/gamificationService';
import * as logger from 'firebase-functions/logger';
import { assertProductionSafe } from '../config/productionSafety';

const BADGES_COLLECTION = 'badges';
const USER_BADGES_COLLECTION = 'userBadges';

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
const localBadgesCache: Map<string, UserBadgeDoc> = new Map();

export class BadgeRepository {
  /**
   * Seed system badges into badges collection if needed
   */
  static async seedSystemBadges(): Promise<void> {
    if (!hasFirebaseCredentials) return;
    try {
      const batch = db.batch();
      for (const b of SYSTEM_BADGES) {
        const ref = db.collection(BADGES_COLLECTION).doc(b.id);
        batch.set(ref, { ...b, isActive: true }, { merge: true });
      }
      await withTimeout(batch.commit(), 3000);
    } catch (err) {
      logger.warn('[BadgeRepository] seedSystemBadges error:', err);
    }
  }

  /**
   * Get all master badge definitions
   */
  static async getAllBadges(): Promise<BadgeDoc[]> {
    if (hasFirebaseCredentials) {
      try {
        const snap = await withTimeout(db.collection(BADGES_COLLECTION).get(), 2000);
        if (!snap.empty) {
          return snap.docs.map((d) => d.data() as BadgeDoc);
        }
      } catch (err) {
        assertProductionSafe('BadgeRepository.getAllBadges', err);
      }
    }
    return SYSTEM_BADGES;
  }

  /**
   * Unlock a badge for a user with duplicate prevention
   * Uses `${userId}_${badgeId}` as document ID for idempotency
   */
  static async unlockBadge(userId: string, badge: BadgeDoc): Promise<boolean> {
    const userBadgeId = `${userId}_${badge.id}`;

    if (localBadgesCache.has(userBadgeId)) {
      return false; // Already unlocked in local cache
    }

    const record: UserBadgeDoc = {
      id: userBadgeId,
      userId,
      badgeId: badge.id,
      badgeName: badge.name,
      description: badge.description,
      icon: badge.icon,
      xpReward: badge.xpReward || 50,
      unlockedAt: new Date().toISOString(),
    };

    localBadgesCache.set(userBadgeId, record);

    if (hasFirebaseCredentials) {
      try {
        const ref = db.collection(USER_BADGES_COLLECTION).doc(userBadgeId);
        const existing = await withTimeout(ref.get(), 2000);
        if (existing.exists) {
          return false; // Already unlocked in Firestore
        }
        await withTimeout(ref.set(record), 2000);
      } catch (err) {
        logger.warn(`[BadgeRepository] Firestore unlockBadge error for ${userBadgeId}:`, err);
        assertProductionSafe('BadgeRepository.unlockBadge');
      }
    }

    return true;
  }

  /**
   * Get all unlocked badges for a user
   */
  static async getUserBadges(userId: string): Promise<UserBadgeDoc[]> {
    const fromCache = Array.from(localBadgesCache.values()).filter((b) => b.userId === userId);
    if (fromCache.length > 0) return fromCache;

    if (hasFirebaseCredentials) {
      try {
        const snap = await withTimeout(
          db.collection(USER_BADGES_COLLECTION).where('userId', '==', userId).get(),
          2000
        );
        return snap.docs.map((d) => d.data() as UserBadgeDoc);
      } catch (err) {
        assertProductionSafe('BadgeRepository.getUserBadges', err);
        logger.error(`Error fetching user badges for ${userId}:`, err);
        return [];
      }
    }

    return [];
  }

  /**
   * Clear local badge cache for test isolation
   */
  static clearLocalCache(): void {
    localBadgesCache.clear();
  }
}
