/**
 * SportX Auth Triggers (Lifecycle Handlers)
 * Automatically initializes and tears down user documents upon Firebase Auth events
 */
import * as functions from 'firebase-functions/v1';
import { db } from '../config/firebase';
import { UserRepository } from '../repositories/userRepository';
import { AccountService } from '../services/accountService';
import * as logger from 'firebase-functions/logger';

/**
 * Triggered automatically whenever a new user registers via Firebase Auth (Email/Password, Google, etc.)
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    logger.info(`[Auth Trigger] onUserCreated invoked for UID: ${user.uid}, email: ${user.email}`);

    const existing = await UserRepository.getById(user.uid);
    if (!existing) {
      await UserRepository.create(user.uid, {
        userId: user.uid,
        email: user.email || '',
        name: user.displayName || 'Athlete',
        profileImage: user.photoURL || '',
      });
      logger.info(`[Auth Trigger] Initialized users/${user.uid} document.`);
    }

    // Initialize initial system stats
    const statsRef = db.collection('userStats').doc(user.uid);
    const statsSnap = await statsRef.get();
    if (!statsSnap.exists) {
      await statsRef.set({
        userId: user.uid,
        workoutsCompleted: 0,
        totalDuration: 0,
        totalCalories: 0,
        totalReps: 0,
        averageFormAccuracy: 0,
        muscleGroupBreakdown: {},
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.error(`[Auth Trigger] Error in onUserCreated for ${user.uid}:`, err);
  }
});

/**
 * Triggered automatically when a user account is deleted
 */
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  try {
    logger.info(`[Auth Trigger] onUserDeleted invoked for UID: ${user.uid}`);
    await AccountService.deleteAccount(user.uid);
    logger.info(`[Auth Trigger] Successfully executed cascading cleanup for UID: ${user.uid}`);
  } catch (err) {
    logger.error(`[Auth Trigger] Error in onUserDeleted for ${user.uid}:`, err);
  }
});
