/**
 * SportX User Repository
 * Firestore Data Access for users/{userId}
 */
import { db, hasFirebaseCredentials } from '../config/firebase';
import { assertProductionSafe } from '../config/productionSafety';
import { UserDoc } from '../types';
import { XPRepository } from './xpRepository';
import { StreakRepository } from './streakRepository';
import { BadgeRepository } from './badgeRepository';
import { GamificationService, SYSTEM_BADGES, SYSTEM_TITLES } from '../services/gamificationService';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'users';

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
const localUsersCache: Map<string, UserDoc> = new Map();

export class UserRepository {
  /**
   * Fetch user by UID
   */
  static async getById(userId: string): Promise<UserDoc | null> {
    if (!userId) return null;

    if (hasFirebaseCredentials) {
      try {
        const docSnap = await withTimeout(db.collection(COLLECTION).doc(userId).get(), 2000);
        if (docSnap.exists) {
          const data = docSnap.data() as UserDoc;
          const canonicalXp = (data as any).totalXp ?? data.xp ?? (data as any).XP ?? 0;
          const user: UserDoc = {
            ...data,
            totalXp: canonicalXp,
            xp: canonicalXp,
            XP: canonicalXp,
          };
          localUsersCache.set(userId, user);
          return user;
        }
      } catch (err) {
        logger.warn(`[UserRepository] Firestore getById failed for ${userId}:`, err);
        assertProductionSafe(`UserRepository.getById(${userId})`);
      }
    }

    const cached = localUsersCache.get(userId);
    if (cached) return cached;

    try {
      const { users: demoUsers } = require('../config/demoStore');
      const demo = demoUsers?.get?.(userId);
      if (demo) {
        const mappedUser: UserDoc = {
          userId: demo.id || userId,
          name: demo.name || 'Athlete',
          email: demo.email || '',
          profileImage: '',
          age: null,
          height: null,
          weight: null,
          fitnessLevel: (demo.fitnessLevel || 'intermediate') as any,
          goals: demo.goals || [demo.fitnessGoal || 'fitness'],
          selectedSports: demo.selectedSports || [],
          experience: 'intermediate',
          preferences: {
            workoutDays: ['Monday', 'Wednesday', 'Friday'],
            soundEnabled: true,
            hapticFeedback: true,
            theme: 'dark'
          },
          availableWorkoutTime: demo.availableWorkoutTime || demo.availableTimeMinutes || 20,
          availableEquipment: ['none'],
          workoutDaysPerWeek: 3,
          targetCalories: 300,
          notificationsEnabled: true,
          fcmTokens: [],
          role: 'user',
          totalWorkouts: 0,
          totalMinutes: 0,
          totalCalories: 0,
          currentStreak: demo.currentStreak || 0,
          longestStreak: demo.longestStreak || 0,
          lastWorkoutDate: demo.lastWorkoutDate || null,
          totalXp: demo.totalXp ?? demo.xp ?? 0,
          xp: demo.totalXp ?? demo.xp ?? 0,
          XP: demo.totalXp ?? demo.xp ?? 0,
          level: 1,
          badges: [],
          createdAt: demo.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localUsersCache.set(userId, mappedUser);
        return mappedUser;
      }
    } catch (_) {}

    return null;
  }

  /**
   * Create or initialize a user profile document in users/{userId}
   */
  static async create(userId: string, data: Partial<UserDoc>): Promise<UserDoc> {
    const now = new Date().toISOString();
    const newUser: UserDoc = {
      userId,
      name: data.name || 'Athlete',
      email: data.email || '',
      profileImage: data.profileImage || '',
      age: data.age ?? null,
      height: data.height ?? null,
      weight: data.weight ?? null,
      fitnessLevel: data.fitnessLevel || 'beginner',
      goals: data.goals || ['fitness'],
      selectedSports: data.selectedSports || [],
      experience: data.experience || 'beginner',
      preferences: data.preferences || {
        workoutDays: ['Monday', 'Wednesday', 'Friday'],
        soundEnabled: true,
        hapticFeedback: true,
        theme: 'dark',
      },
      availableWorkoutTime: data.availableWorkoutTime ?? 30,
      availableEquipment: data.availableEquipment || ['bodyweight'],
      workoutDaysPerWeek: data.workoutDaysPerWeek ?? 3,
      targetCalories: data.targetCalories ?? 300,
      notificationsEnabled: data.notificationsEnabled ?? true,
      fcmTokens: data.fcmTokens || [],
      role: data.role || 'user',
      totalWorkouts: 0,
      totalMinutes: 0,
      totalCalories: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      totalXp: (data as any).totalXp ?? data.xp ?? 0,
      xp: (data as any).totalXp ?? data.xp ?? 0,
      XP: (data as any).totalXp ?? data.xp ?? 0,
      level: 1,
      badges: [],
      collegeName: data.collegeName || 'Campus University',
      department: data.department || 'General',
      createdAt: now,
      updatedAt: now,
      ...data,
    };

    localUsersCache.set(userId, newUser);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(COLLECTION).doc(userId).set(newUser, { merge: true }),
          2000
        );
      } catch (err) {
        logger.warn(`[UserRepository] Firestore create failed for ${userId}:`, err);
        assertProductionSafe(`UserRepository.create(${userId})`);
      }
    } else {
      assertProductionSafe(`UserRepository.create(${userId}) (no credentials)`);
    }

    return newUser;
  }

  /**
   * Update arbitrary profile fields
   */
  static async update(userId: string, data: Partial<UserDoc>): Promise<void> {
    const existing = localUsersCache.get(userId);
    if (existing) {
      localUsersCache.set(userId, { ...existing, ...data, updatedAt: new Date().toISOString() });
    }

    if (hasFirebaseCredentials) {
      try {
        const updatePayload: Record<string, any> = {
          ...data,
          updatedAt: new Date().toISOString(),
        };
        if (data.xp !== undefined) {
          updatePayload.XP = data.xp;
        }
        await withTimeout(db.collection(COLLECTION).doc(userId).update(updatePayload), 2000);
      } catch (err) {
        logger.warn(`[UserRepository] Firestore update failed for ${userId}:`, err);
        assertProductionSafe(`UserRepository.update(${userId})`);
      }
    } else {
      assertProductionSafe(`UserRepository.update(${userId}) (no credentials)`);
    }
  }

  /**
   * Atomically apply session rewards (streaks, xp, level, badges, counts)
   */
  static async applyWorkoutCompletion(
    userId: string,
    updates: {
      sessionId?: string;
      xpToAdd: number;
      newLevel: number;
      durationMinutes: number;
      caloriesBurned: number;
      currentStreak: number;
      longestStreak: number;
      lastWorkoutDate: string;
      newBadges?: string[];
    }
  ): Promise<void> {
    const cached = localUsersCache.get(userId);
    const currentCachedXp = (cached as any)?.totalXp ?? cached?.xp ?? (cached as any)?.XP ?? 0;
    let finalXP = currentCachedXp + updates.xpToAdd;
    if (cached) {
      const combinedBadges = Array.from(
        new Set([...(cached.badges || []), ...(updates.newBadges || [])])
      );
      localUsersCache.set(userId, {
        ...cached,
        totalXp: finalXP,
        xp: finalXP,
        XP: finalXP,
        level: updates.newLevel,
        totalWorkouts: (cached.totalWorkouts || 0) + 1,
        totalMinutes: (cached.totalMinutes || 0) + updates.durationMinutes,
        totalCalories: (cached.totalCalories || 0) + updates.caloriesBurned,
        currentStreak: updates.currentStreak,
        longestStreak: updates.longestStreak,
        bestStreak: updates.longestStreak,
        lastWorkoutDate: updates.lastWorkoutDate,
        lastActivityDate: updates.lastWorkoutDate,
        badges: combinedBadges,
        updatedAt: new Date().toISOString(),
      });
    }

    if (hasFirebaseCredentials) {
      try {
        const userRef = db.collection(COLLECTION).doc(userId);
        await withTimeout(
          db.runTransaction(async (transaction) => {
            const doc = await transaction.get(userRef);
            if (!doc.exists) {
              throw new Error(`User ${userId} does not exist`);
            }

            const existingData = doc.data() as UserDoc;
            const combinedBadges = Array.from(
              new Set([...(existingData.badges || []), ...(updates.newBadges || [])])
            );

            const existingXp = (existingData as any)?.totalXp ?? existingData.xp ?? (existingData as any)?.XP ?? 0;
            finalXP = existingXp + updates.xpToAdd;

            transaction.update(userRef, {
              totalXp: FieldValue.increment(updates.xpToAdd),
              xp: FieldValue.increment(updates.xpToAdd),
              XP: FieldValue.increment(updates.xpToAdd),
              level: updates.newLevel,
              totalWorkouts: FieldValue.increment(1),
              totalMinutes: FieldValue.increment(updates.durationMinutes),
              totalCalories: FieldValue.increment(updates.caloriesBurned),
              currentStreak: updates.currentStreak,
              longestStreak: updates.longestStreak,
              bestStreak: updates.longestStreak,
              lastWorkoutDate: updates.lastWorkoutDate,
              lastActivityDate: updates.lastWorkoutDate,
              badges: combinedBadges,
              updatedAt: new Date().toISOString(),
            });
          }),
          3000
        );
      } catch (err) {
        logger.warn(`[UserRepository] Firestore transaction failed for ${userId}:`, err);
        assertProductionSafe(`UserRepository.applyWorkoutCompletion(${userId})`);
      }
    } else {
      assertProductionSafe(`UserRepository.applyWorkoutCompletion(${userId}) (no credentials)`);
    }

    // 1. Audit XP Transaction (Replay / Duplicate protection)
    if (hasFirebaseCredentials && updates.sessionId && updates.xpToAdd > 0) {
      const txId = `tx_${updates.sessionId}_workout`;
      await XPRepository.recordTransaction({
        txId,
        userId,
        amount: updates.xpToAdd,
        reason: 'workout_completion',
        relatedSessionId: updates.sessionId,
        balanceAfter: finalXP,
        createdAt: new Date().toISOString(),
      }).catch((err) => logger.warn('[UserRepository] Error logging XP transaction:', err));
    }

    // 2. Record daily streak in streaks/{userId}
    await StreakRepository.recordDay(
      userId,
      updates.currentStreak,
      updates.longestStreak,
      updates.lastWorkoutDate,
      updates.xpToAdd,
      'workout',
      updates.sessionId
    ).catch((err) => logger.warn('[UserRepository] Error updating streak doc:', err));

    // 3. Unlock badges in userBadges/{userId}_{badgeId}
    if (updates.newBadges && updates.newBadges.length > 0) {
      for (const badgeId of updates.newBadges) {
        const badgeDef = SYSTEM_BADGES.find((b) => b.id === badgeId);
        if (badgeDef) {
          await BadgeRepository.unlockBadge(userId, badgeDef).catch((err) =>
            logger.warn(`[UserRepository] Error unlocking badge ${badgeId}:`, err)
          );
        }
      }
    }
  }

  /**
   * Authoritatively record a qualifying activity (e.g. competitive lobby challenge, workout drill)
   * Updates streak (consecutive, same-day idempotent, or reset), bestStreak, lastActivityDate,
   * unlocks milestone badges, and logs into streaks/{userId}.
   */
  static async recordQualifyingActivity(
    userId: string,
    activity: {
      activityType: 'workout' | 'lobby' | 'challenge';
      activityId: string;
      xpEarned?: number;
      activityDate?: string;
    }
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    bestStreak: number;
    streakIncremented: boolean;
    newBadges: string[];
  }> {
    let user = await this.getById(userId);
    if (!user) {
      user = await this.create(userId, { userId });
    }

    const todayDate = activity.activityDate || new Date().toISOString().split('T')[0];
    const streakResult = GamificationService.evaluateStreak({
      lastWorkoutDate: user.lastActivityDate || user.lastWorkoutDate,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || user.bestStreak || 0,
      sessionDate: todayDate,
    });

    const badgeResult = GamificationService.evaluateUnlockedBadges({
      currentBadges: user.badges || [],
      totalWorkouts: user.totalWorkouts || 0,
      totalReps: (user.totalWorkouts || 0) * 15,
      totalXP: (user.xp || 0) + (activity.xpEarned || 0),
      currentStreak: streakResult.currentStreak,
    });

    const newBadgeIds = badgeResult.newBadges.map((b: any) => b.id);
    const combinedBadges = Array.from(new Set([...(user.badges || []), ...newBadgeIds]));
    const now = new Date().toISOString();

    // 1. Update local cache
    const cached = localUsersCache.get(userId);
    if (cached) {
      const currentXp = (cached as any).totalXp ?? cached.xp ?? (cached as any).XP ?? 0;
      const finalXp = currentXp + (activity.xpEarned || 0);
      localUsersCache.set(userId, {
        ...cached,
        totalXp: finalXp,
        xp: finalXp,
        XP: finalXp,
        currentStreak: streakResult.currentStreak,
        longestStreak: streakResult.longestStreak,
        bestStreak: streakResult.longestStreak,
        lastActivityDate: todayDate,
        lastWorkoutDate: activity.activityType === 'workout' ? todayDate : (cached.lastWorkoutDate || todayDate),
        badges: combinedBadges,
        updatedAt: now,
      });
    }

    // 2. Update Firestore if configured
    if (hasFirebaseCredentials) {
      try {
        const userRef = db.collection(COLLECTION).doc(userId);
        const updateData: Record<string, any> = {
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          bestStreak: streakResult.longestStreak,
          lastActivityDate: todayDate,
          badges: combinedBadges,
          updatedAt: now,
        };
        if (activity.activityType === 'workout') {
          updateData.lastWorkoutDate = todayDate;
        }
        if (activity.xpEarned && activity.xpEarned > 0) {
          updateData.totalXp = FieldValue.increment(activity.xpEarned);
          updateData.xp = FieldValue.increment(activity.xpEarned);
          updateData.XP = FieldValue.increment(activity.xpEarned);
        }
        await withTimeout(userRef.set(updateData, { merge: true }), 3000);
      } catch (err) {
        logger.warn(`[UserRepository] Firestore update failed for recordQualifyingActivity ${userId}:`, err);
        assertProductionSafe(`UserRepository.recordQualifyingActivity(${userId})`);
      }
    }

    // 3. Record in streaks/{userId}
    await StreakRepository.recordDay(
      userId,
      streakResult.currentStreak,
      streakResult.longestStreak,
      todayDate,
      activity.xpEarned || 0,
      activity.activityType,
      activity.activityId
    ).catch((err) => logger.warn('[UserRepository] Error updating streak doc for activity:', err));

    // 4. Unlock milestone badges in userBadges/{userId}_{badgeId}
    for (const badge of badgeResult.newBadges) {
      await BadgeRepository.unlockBadge(userId, badge).catch((err) =>
        logger.warn(`[UserRepository] Error unlocking badge ${badge.id}:`, err)
      );
    }

    return {
      currentStreak: streakResult.currentStreak,
      longestStreak: streakResult.longestStreak,
      bestStreak: streakResult.longestStreak,
      streakIncremented: streakResult.streakIncremented,
      newBadges: newBadgeIds,
    };
  }

  /**
   * Register a new FCM device token to user doc
   */
  static async addFcmToken(userId: string, token: string): Promise<void> {
    const userRef = db.collection(COLLECTION).doc(userId);
    await userRef.update({
      fcmTokens: FieldValue.arrayUnion(token),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Remove an invalid or logged-out FCM device token
   */
  static async removeFcmToken(userId: string, token: string): Promise<void> {
    const userRef = db.collection(COLLECTION).doc(userId);
    await userRef.update({
      fcmTokens: FieldValue.arrayRemove(token),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Find users who have missed workouts to reset streaks
   */
  static async getActiveUsers(): Promise<UserDoc[]> {
    const snapshot = await db.collection(COLLECTION).limit(500).get();
    return snapshot.docs.map((doc) => doc.data() as UserDoc);
  }

  /**
   * Update authoritative rank points and tier on user profile
   */
  static async updateRank(userId: string, rankPoints: number, rankTier: string): Promise<void> {
    const cached = localUsersCache.get(userId);
    if (cached) {
      cached.rankPoints = rankPoints;
      cached.rankTier = rankTier;
      localUsersCache.set(userId, cached);
    }
    if (hasFirebaseCredentials) {
      try {
        await db.collection(COLLECTION).doc(userId).set(
          {
            rankPoints,
            rankTier,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        logger.warn(`[UserRepository] updateRank failed for ${userId}:`, err);
      }
    }
  }

  /**
   * Equip an unlocked athlete title. Locked titles cannot be equipped.
   */
  static async equipTitle(userId: string, titleId: string): Promise<{ success: boolean; error?: string }> {
    const user = await this.getById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Title un-equip (allow clearing or setting to empty string)
    if (!titleId || titleId === '') {
      if (hasFirebaseCredentials) {
        try {
          await db.collection(COLLECTION).doc(userId).update({
            equippedTitle: null,
            updatedAt: new Date().toISOString(),
          });
        } catch (err) {
          logger.warn(`[UserRepository] equipTitle clear failed for ${userId}:`, err);
        }
      }
      user.equippedTitle = undefined;
      localUsersCache.set(userId, user);
      return { success: true };
    }

    const titleDef = SYSTEM_TITLES.find((t) => t.id === titleId);
    if (!titleDef) {
      return { success: false, error: `Invalid title '${titleId}'.` };
    }

    // Verify user owns/qualified for this title
    const unlockedTitles = GamificationService.evaluateUnlockedTitles(user.badges || [], {
      totalXp: (user as any).totalXp ?? user.xp,
      rankTier: user.rankTier,
      currentStreak: user.currentStreak,
      totalWorkouts: user.totalWorkouts,
      totalReps: (user.totalWorkouts || 0) * 15,
    });

    if (!unlockedTitles.includes(titleId)) {
      return {
        success: false,
        error: `Title '${titleDef.name}' is locked. Requirement: ${titleDef.unlockRequirement}.`,
      };
    }

    // Persist equipped title
    user.equippedTitle = titleId;
    user.unlockedTitles = unlockedTitles;
    localUsersCache.set(userId, user);

    if (hasFirebaseCredentials) {
      try {
        await db.collection(COLLECTION).doc(userId).set(
          {
            equippedTitle: titleId,
            unlockedTitles,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        logger.warn(`[UserRepository] equipTitle Firestore failed for ${userId}:`, err);
      }
    }

    return { success: true };
  }

  /**
   * Update showcased/featured badges on user profile (up to 6 slots).
   * Validates that all selected badge IDs are unlocked by the user.
   */
  static async updateFeaturedBadges(userId: string, badgeIds: string[]): Promise<{ success: boolean; error?: string }> {
    const user = await this.getById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const sanitizedBadgeIds = Array.isArray(badgeIds) ? badgeIds.slice(0, 6) : [];
    const ownedBadges = new Set(user.badges || []);

    for (const bId of sanitizedBadgeIds) {
      if (!ownedBadges.has(bId)) {
        return {
          success: false,
          error: `Cannot showcase badge '${bId}' because it is locked.`,
        };
      }
    }

    user.featuredBadges = sanitizedBadgeIds;
    localUsersCache.set(userId, user);

    if (hasFirebaseCredentials) {
      try {
        await db.collection(COLLECTION).doc(userId).set(
          {
            featuredBadges: sanitizedBadgeIds,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        logger.warn(`[UserRepository] updateFeaturedBadges Firestore failed for ${userId}:`, err);
      }
    }

    return { success: true };
  }

  /**
   * Permanently delete user document and cache entry
   */
  static async delete(userId: string): Promise<void> {
    localUsersCache.delete(userId);
    if (hasFirebaseCredentials) {
      try {
        await withTimeout(db.collection(COLLECTION).doc(userId).delete(), 2000);
      } catch (err) {
        logger.warn(`[UserRepository] Firestore delete failed for ${userId}:`, err);
      }
    }
  }
}
