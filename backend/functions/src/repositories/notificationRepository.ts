/**
 * SportX Notification Repository
 * Firestore Data Access for notifications/{notificationId}
 */
import { db, hasFirebaseCredentials } from '../config/firebase';
import { NotificationDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'notifications';

// In-memory cache for offline/test reliability
const localNotificationCache: Map<string, NotificationDoc> = new Map();

export class NotificationRepository {
  /**
   * Store notification in Firestore and local cache
   */
  static async create(notification: NotificationDoc): Promise<NotificationDoc> {
    localNotificationCache.set(notification.notificationId, notification);

    if (hasFirebaseCredentials) {
      try {
        await db.collection(COLLECTION).doc(notification.notificationId).set(notification);
      } catch (err) {
        logger.warn(`[NotificationRepository] Firestore create failed for ${notification.notificationId}:`, err);
      }
    }

    return notification;
  }

  /**
   * Get single notification by ID
   */
  static async getById(notificationId: string): Promise<NotificationDoc | null> {
    if (hasFirebaseCredentials) {
      try {
        const doc = await db.collection(COLLECTION).doc(notificationId).get();
        if (doc.exists) {
          return doc.data() as NotificationDoc;
        }
      } catch (err) {
        logger.warn(`[NotificationRepository] Firestore getById failed for ${notificationId}:`, err);
      }
    }

    return localNotificationCache.get(notificationId) || null;
  }

  /**
   * Get user notifications (newest first)
   */
  static async getUserNotifications(userId: string, limit = 20): Promise<NotificationDoc[]> {
    if (hasFirebaseCredentials) {
      try {
        const snap = await db
          .collection(COLLECTION)
          .where('userId', '==', userId)
          .get();

        if (!snap.empty) {
          const items = snap.docs.map((d) => d.data() as NotificationDoc);
          return items.sort((a, b) => {
            const timeA = new Date(a.createdAt as string).getTime() || 0;
            const timeB = new Date(b.createdAt as string).getTime() || 0;
            return timeB - timeA;
          }).slice(0, limit);
        }
      } catch (err) {
        logger.error(`Error querying notifications for ${userId}:`, err);
      }
    }

    const items: NotificationDoc[] = [];
    for (const notif of localNotificationCache.values()) {
      if (notif.userId === userId) {
        items.push(notif);
      }
    }
    return items.sort((a, b) => {
      const timeA = new Date(a.createdAt as string).getTime() || 0;
      const timeB = new Date(b.createdAt as string).getTime() || 0;
      return timeB - timeA;
    }).slice(0, limit);
  }

  /**
   * Mark notification as read with strict user ownership validation
   */
  static async markAsRead(notificationId: string, requestingUserId?: string): Promise<boolean> {
    const existing = await this.getById(notificationId);
    if (!existing) {
      return false;
    }

    if (requestingUserId && existing.userId !== requestingUserId) {
      throw new Error('Forbidden: Cannot modify another user\'s notification');
    }

    const updated = { ...existing, read: true };
    localNotificationCache.set(notificationId, updated);

    if (hasFirebaseCredentials) {
      try {
        await db.collection(COLLECTION).doc(notificationId).update({ read: true });
      } catch (err) {
        logger.warn(`[NotificationRepository] Firestore markAsRead failed for ${notificationId}:`, err);
      }
    }

    return true;
  }

  /**
   * Delete all notifications for a user (account cleanup)
   */
  static async deleteAllByUser(userId: string): Promise<number> {
    let count = 0;
    for (const [id, notif] of Array.from(localNotificationCache.entries())) {
      if (notif.userId === userId) {
        localNotificationCache.delete(id);
        count++;
      }
    }

    if (hasFirebaseCredentials) {
      try {
        const snap = await db.collection(COLLECTION).where('userId', '==', userId).get();
        if (!snap.empty) {
          const batch = db.batch();
          snap.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          count = Math.max(count, snap.size);
        }
      } catch (err) {
        logger.warn(`[NotificationRepository] Firestore deleteAllByUser failed for ${userId}:`, err);
      }
    }

    return count;
  }
}
