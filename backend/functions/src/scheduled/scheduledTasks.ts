/**
 * SportX Scheduled Cloud Functions (2nd Gen)
 * Daily streak audits, missed workout notifications, and weekly summary reports
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from '../config/firebase';
import { UserRepository } from '../repositories/userRepository';
import { NotificationService } from '../services/notificationService';
import * as logger from 'firebase-functions/logger';

/**
 * Runs daily at 00:00 UTC (midnight)
 * Audits active users: if their last workout was before yesterday, resets currentStreak to 0.
 * Also sends streak preservation reminders to users who haven't worked out yet today.
 */
export const checkStreaksDaily = onSchedule('0 0 * * *', async (event) => {
  logger.info('[Scheduled Task] Running checkStreaksDaily audit...');

  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const users = await UserRepository.getActiveUsers();
    let resetCount = 0;
    let reminderCount = 0;

    for (const user of users) {
      const lastDate = user.lastWorkoutDate;

      // If user had an active streak but missed both yesterday and today, streak is broken
      if (user.currentStreak > 0 && lastDate && lastDate !== today && lastDate !== yesterday) {
        await UserRepository.update(user.userId, { currentStreak: 0 });
        resetCount++;
        logger.info(`[Scheduled Task] Reset streak for user ${user.userId} (last workout: ${lastDate})`);
      } else if (user.currentStreak > 0 && lastDate === yesterday) {
        // User is currently on a streak and worked out yesterday! Send proactive reminder
        await NotificationService.sendStreakReminder(user.userId, user.currentStreak);
        reminderCount++;
      }
    }

    logger.info(`[Scheduled Task] Completed checkStreaksDaily: ${resetCount} streaks reset, ${reminderCount} reminders queued.`);
  } catch (err) {
    logger.error('[Scheduled Task] Error in checkStreaksDaily:', err);
  }
});

/**
 * Runs every Sunday at 20:00 UTC
 * Dispatches weekly summary notifications and encourages users for the upcoming week
 */
export const weeklySummaryReport = onSchedule('0 20 * * 0', async (event) => {
  logger.info('[Scheduled Task] Running weeklySummaryReport...');

  try {
    const users = await UserRepository.getActiveUsers();
    let sentCount = 0;

    for (const user of users) {
      if (user.notificationsEnabled !== false && (user.fcmTokens?.length || 0) > 0) {
        await NotificationService.sendWorkoutReminder(
          user.userId,
          `Weekly wrap-up: You have ${user.xp || 0} XP and a ${user.currentStreak || 0}-day streak! Get ready for next week!`
        );
        sentCount++;
      }
    }

    logger.info(`[Scheduled Task] Completed weeklySummaryReport. Sent to ${sentCount} users.`);
  } catch (err) {
    logger.error('[Scheduled Task] Error in weeklySummaryReport:', err);
  }
});
