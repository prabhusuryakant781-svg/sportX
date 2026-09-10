/**
 * SportX Firebase Cloud Messaging (FCM) Notification Service
 * Handles push notifications for streaks, badges, reminders, and workout milestones.
 * Also persists in-app notification records to Firestore notifications/{notificationId}.
 */
import { messaging, db } from '../config/firebase';
import { NotificationRepository } from '../repositories/notificationRepository';
import * as logger from 'firebase-functions/logger';

export class NotificationService {
  /**
   * Send push notification to a list of FCM device registration tokens.
   */
  static async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!tokens || tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    try {
      const payload = {
        tokens,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            channelId: 'sportx_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      const response = await messaging.sendEachForMulticast(payload);
      logger.info(`[FCM] Sent notifications: ${response.successCount} succeeded, ${response.failureCount} failed`);

      // Clean up dead/invalid tokens if any failed
      if (response.failureCount > 0) {
        const deadTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const code = resp.error.code;
            if (
              code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered'
            ) {
              deadTokens.push(tokens[idx]);
            }
          }
        });

        if (deadTokens.length > 0) {
          logger.info(`[FCM] Found ${deadTokens.length} dead tokens`);
        }
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (err: any) {
      logger.error('[FCM] Error sending multicast notification:', err);
      return { successCount: 0, failureCount: tokens.length };
    }
  }

  /**
   * Send notification to a specific user by querying their registered FCM tokens.
   * Also creates a persistent document in notifications/{notificationId}.
   */
  static async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<boolean> {
    try {
      // 1. Always record in-app notification doc in Firestore
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await NotificationRepository.create({
        notificationId,
        userId,
        title,
        body,
        type: (data?.type as any) || 'workout_reminder',
        read: false,
        data,
        createdAt: new Date().toISOString(),
      }).catch((e) => logger.warn('[FCM] Failed to write notification doc:', e));

      // 2. Fetch user to send FCM push if enabled
      const userSnap = await db.collection('users').doc(userId).get();
      if (!userSnap.exists) return true;

      const userData = userSnap.data();
      if (userData?.notificationsEnabled === false) {
        logger.info(`[FCM] User ${userId} has push notifications disabled.`);
        return true;
      }

      const tokens: string[] = userData?.fcmTokens || [];
      if (tokens.length === 0) return true;

      const result = await this.sendMulticast(tokens, title, body, data);
      return result.successCount > 0;
    } catch (err) {
      logger.error(`[FCM] Failed sending notification to user ${userId}:`, err);
      return false;
    }
  }

  /**
   * Streak reminder notification (e.g. before midnight)
   */
  static async sendStreakReminder(userId: string, currentStreak: number): Promise<boolean> {
    return this.sendToUser(
      userId,
      '🔥 Keep Your Streak Alive!',
      `You're on a ${currentStreak}-day streak! Complete a quick workout today to maintain your momentum.`,
      { type: 'streak_reminder', streak: String(currentStreak) }
    );
  }

  /**
   * Badge unlocked celebration notification
   */
  static async sendBadgeUnlocked(userId: string, badgeName: string, icon: string): Promise<boolean> {
    return this.sendToUser(
      userId,
      `🏆 Badge Unlocked: ${icon} ${badgeName}`,
      `Congratulations! You've earned the ${badgeName} badge on SportX. Check your trophy room!`,
      { type: 'badge_unlocked', badge: badgeName }
    );
  }

  /**
   * Scheduled workout reminder
   */
  static async sendWorkoutReminder(userId: string, planTitle: string = 'Daily Workout'): Promise<boolean> {
    return this.sendToUser(
      userId,
      '⚡ Time to Move!',
      `Your scheduled session "${planTitle}" is ready. Take 15 minutes to crush it!`,
      { type: 'workout_reminder' }
    );
  }
}
