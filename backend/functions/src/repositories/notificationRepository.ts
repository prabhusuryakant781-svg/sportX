/**
 * SportX Notification Repository
 * Firestore Data Access for notifications/{notificationId}
 */
import { db } from '../config/firebase';
import { NotificationDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'notifications';

export class NotificationRepository {
  /**
   * Store notification in Firestore
   */
  static async create(notification: NotificationDoc): Promise<NotificationDoc> {
    await db.collection(COLLECTION).doc(notification.notificationId).set(notification);
    return notification;
  }

  /**
   * Get user notifications (newest first)
   */
  static async getUserNotifications(userId: string, limit = 20): Promise<NotificationDoc[]> {
    try {
      const snap = await db
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .get();

      const items = snap.docs.map((d) => d.data() as NotificationDoc);
      return items.sort((a, b) => {
        const timeA = new Date(a.createdAt as string).getTime() || 0;
        const timeB = new Date(b.createdAt as string).getTime() || 0;
        return timeB - timeA;
      }).slice(0, limit);
    } catch (err) {
      logger.error(`Error querying notifications for ${userId}:`, err);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    await db.collection(COLLECTION).doc(notificationId).update({ read: true });
  }
}
