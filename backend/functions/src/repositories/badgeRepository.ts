/**
 * SportX Badge Repository
 * Firestore Data Access for badges/{badgeId} and userBadges/{id}
 */
import { db } from '../config/firebase';
import { BadgeDoc, UserBadgeDoc } from '../types';
import { SYSTEM_BADGES } from '../services/gamificationService';
import * as logger from 'firebase-functions/logger';

import { assertProductionSafe } from '../config/productionSafety';

const BADGES_COLLECTION = 'badges';
const USER_BADGES_COLLECTION = 'userBadges';

export class BadgeRepository {
  /**
   * Seed system badges into badges collection if needed
   */
  static async seedSystemBadges(): Promise<void> {
    const batch = db.batch();
    for (const b of SYSTEM_BADGES) {
      const ref = db.collection(BADGES_COLLECTION).doc(b.id);
      batch.set(ref, { ...b, isActive: true }, { merge: true });
    }
    await batch.commit();
  }

  /**
   * Get all master badge definitions
   */
  static async getAllBadges(): Promise<BadgeDoc[]> {
    try {
      const snap = await db.collection(BADGES_COLLECTION).get();
      if (snap.empty) {
        return SYSTEM_BADGES;
      }
      return snap.docs.map((d) => d.data() as BadgeDoc);
    } catch (err) {
      assertProductionSafe('BadgeRepository.getAllBadges', err);
      return SYSTEM_BADGES;
    }
  }

  /**
   * Unlock a badge for a user with duplicate prevention
   * Uses `${userId}_${badgeId}` as document ID for idempotency
   */
  static async unlockBadge(userId: string, badge: BadgeDoc): Promise<boolean> {
    const userBadgeId = `${userId}_${badge.id}`;
    const ref = db.collection(USER_BADGES_COLLECTION).doc(userBadgeId);

    const existing = await ref.get();
    if (existing.exists) {
      return false; // Already unlocked
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

    await ref.set(record);
    return true;
  }

  /**
   * Get all unlocked badges for a user
   */
  static async getUserBadges(userId: string): Promise<UserBadgeDoc[]> {
    try {
      const snap = await db
        .collection(USER_BADGES_COLLECTION)
        .where('userId', '==', userId)
        .get();

      return snap.docs.map((d) => d.data() as UserBadgeDoc);
    } catch (err) {
      assertProductionSafe('BadgeRepository.getUserBadges', err);
      logger.error(`Error fetching user badges for ${userId}:`, err);
      return [];
    }
  }
}
