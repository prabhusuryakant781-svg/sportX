/**
 * SportX User Repository
 * Firestore Data Access for users/{userId}
 */
import { db } from '../config/firebase';
import { UserDoc } from '../types';
import { XPRepository } from './xpRepository';
import { StreakRepository } from './streakRepository';
import { BadgeRepository } from './badgeRepository';
import { SYSTEM_BADGES } from '../services/gamificationService';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'users';

export class UserRepository {
  /**
   * Fetch user by UID
   */
  static async getById(userId: string): Promise<UserDoc | null> {
    const docSnap = await db.collection(COLLECTION).doc(userId).get();
    if (!docSnap.exists) return null;
    const data = docSnap.data() as UserDoc;
    return {
      ...data,
      XP: data.xp,
    };
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
      xp: 0,
      XP: 0,
      level: 1,
      badges: [],
      collegeName: data.collegeName || 'Campus University',
      department: data.department || 'General',
      createdAt: now,
      updatedAt: now,
      ...data,
    };

    await db.collection(COLLECTION).doc(userId).set(newUser, { merge: true });
    return newUser;
  }

  /**
   * Update arbitrary profile fields
   */
  static async update(userId: string, data: Partial<UserDoc>): Promise<void> {
    const updatePayload: Record<string, any> = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    if (data.xp !== undefined) {
      updatePayload.XP = data.xp;
    }
    await db.collection(COLLECTION).doc(userId).update(updatePayload);
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
    const userRef = db.collection(COLLECTION).doc(userId);

    let finalXP = 0;
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(userRef);
      if (!doc.exists) {
        throw new Error(`User ${userId} does not exist`);
      }

      const existingData = doc.data() as UserDoc;
      const combinedBadges = Array.from(
        new Set([...(existingData.badges || []), ...(updates.newBadges || [])])
      );

      finalXP = (existingData.xp || 0) + updates.xpToAdd;

      transaction.update(userRef, {
        xp: FieldValue.increment(updates.xpToAdd),
        XP: FieldValue.increment(updates.xpToAdd),
        level: updates.newLevel,
        totalWorkouts: FieldValue.increment(1),
        totalMinutes: FieldValue.increment(updates.durationMinutes),
        totalCalories: FieldValue.increment(updates.caloriesBurned),
        currentStreak: updates.currentStreak,
        longestStreak: updates.longestStreak,
        lastWorkoutDate: updates.lastWorkoutDate,
        badges: combinedBadges,
        updatedAt: new Date().toISOString(),
      });
    });

    // 1. Audit XP Transaction (Replay / Duplicate protection)
    if (updates.sessionId && updates.xpToAdd > 0) {
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
      updates.xpToAdd
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
}
