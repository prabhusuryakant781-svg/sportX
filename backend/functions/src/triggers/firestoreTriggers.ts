/**
 * SportX Firestore Background Triggers (2nd Gen)
 * Handles automatic gamification, streak updates, badge rewards, and leaderboard syncing.
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { db } from '../config/firebase';
import { UserRepository } from '../repositories/userRepository';
import { AnalyticsRepository } from '../repositories/analyticsRepository';
import { GamificationService } from '../services/gamificationService';
import { NotificationService } from '../services/notificationService';
import { WorkoutSessionDoc } from '../types';
import * as logger from 'firebase-functions/logger';

/**
 * 2nd Gen Firestore Trigger: onWorkoutCompleted
 * Watches workoutSessions/{sessionId} for newly completed workouts.
 */
export const onWorkoutCompleted = onDocumentWritten(
  'workoutSessions/{sessionId}',
  async (event) => {
    const after = event.data?.after;
    if (!after || !after.exists) {
      return; // Document deleted
    }

    const session = after.data() as WorkoutSessionDoc & { processedByTrigger?: boolean };
    const before = event.data?.before?.data() as WorkoutSessionDoc | undefined;

    // Only process when session transitioned to or was created as 'completed'
    if (session.status !== 'completed') {
      return;
    }

    // Idempotency guard: prevent duplicate gamification processing
    if (session.processedByTrigger) {
      return;
    }

    const sessionId = event.params.sessionId;
    const userId = session.userId;
    logger.info(`[Firestore Trigger] Processing onWorkoutCompleted for session: ${sessionId}, user: ${userId}`);

    try {
      // Mark session as processed by background trigger
      await after.ref.update({ processedByTrigger: true });

      const user = await UserRepository.getById(userId);
      if (!user) {
        logger.warn(`[Firestore Trigger] User ${userId} not found for session ${sessionId}`);
        return;
      }

      const reps = session.totalReps || 0;
      const durationMin = session.durationMinutes || 1;
      const formScore = session.formAccuracyAverage || 85;
      const calories = session.caloriesBurned || Math.round(durationMin * 8.5);

      // Verify or calculate XP
      const xpEarned =
        session.xpEarned ||
        GamificationService.calculateSessionXP({
          totalReps: reps,
          formAccuracyAverage: formScore,
          durationMinutes: durationMin,
          isCompleted: true,
        });

      const todayDate = new Date().toISOString().split('T')[0];

      // Streak evaluation
      const streakResult = GamificationService.evaluateStreak({
        lastWorkoutDate: user.lastWorkoutDate,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        sessionDate: todayDate,
      });

      const newTotalXP = (user.xp || 0) + xpEarned;
      const newLevel = GamificationService.calculateLevel(newTotalXP);
      const totalWorkouts = (user.totalWorkouts || 0) + 1;

      // Badges evaluation
      const badgeResult = GamificationService.evaluateUnlockedBadges({
        currentBadges: user.badges || [],
        totalWorkouts,
        totalReps: (user.totalWorkouts || 0) * 15 + reps,
        totalXP: newTotalXP,
        currentStreak: streakResult.currentStreak,
        sessionFormAccuracy: formScore,
      });

      // Update user doc if not already fully applied
      if (user.lastWorkoutDate !== todayDate || user.xp < newTotalXP) {
        await UserRepository.applyWorkoutCompletion(userId, {
          xpToAdd: xpEarned,
          newLevel,
          durationMinutes: durationMin,
          caloriesBurned: calories,
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          lastWorkoutDate: todayDate,
          newBadges: badgeResult.newBadges.map((b) => b.id),
        });
      }

      // Record in Analytics
      await AnalyticsRepository.recordWorkoutMetrics({
        userId,
        durationMinutes: durationMin,
        calories,
        reps,
        formAccuracy: formScore,
        muscleGroups: session.exerciseLogs?.map((e) => e.exerciseId) || [],
      });

      // Send FCM push notifications for any newly unlocked badges
      for (const badge of badgeResult.newBadges) {
        await NotificationService.sendBadgeUnlocked(userId, badge.name, badge.icon);
      }

      logger.info(`[Firestore Trigger] Successfully finalized gamification for session ${sessionId}`);
    } catch (err) {
      logger.error(`[Firestore Trigger] Error in onWorkoutCompleted for session ${sessionId}:`, err);
    }
  }
);
