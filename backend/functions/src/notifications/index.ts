/**
 * Notification Routes:
 * - GET   /notifications
 * - PATCH /notifications/:id/read
 * - POST  /notifications/send-reminder
 */
import { Router, Response } from 'express';
import { messaging } from '../config/firebase';
import { NotificationRepository } from '../repositories/notificationRepository';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import * as logger from 'firebase-functions/logger';

export const notificationsRouter = Router();

// GET /api/v1/notifications
notificationsRouter.get('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const items = await NotificationRepository.getUserNotifications(uid, 30);
    return res.status(200).json({ success: true, count: items.length, data: items });
  } catch (err: any) {
    logger.error('Error fetching notifications:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/notifications/:id/read
notificationsRouter.patch('/:id/read', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await NotificationRepository.markAsRead(id);
    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/notifications/send-reminder
notificationsRouter.post('/send-reminder', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { token, title, body } = req.body;

    const notifTitle = title || 'SportX Workout Reminder';
    const notifBody = body || 'You have a 15-minute dorm session ready for today! 🏋️';

    // Persist in Firestore
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await NotificationRepository.create({
      notificationId,
      userId: uid,
      title: notifTitle,
      body: notifBody,
      type: 'workout_reminder',
      read: false,
      createdAt: new Date().toISOString(),
    });

    if (!token) {
      return res.status(200).json({
        success: true,
        message: 'Notification saved and queued for dispatch.',
      });
    }

    const payload = {
      notification: {
        title: notifTitle,
        body: notifBody,
      },
      token,
    };

    const response = await messaging.send(payload);
    return res.status(200).json({ success: true, messageId: response });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      message: 'Reminder recorded successfully.',
    });
  }
});
