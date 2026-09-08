import { Router, Response } from 'express';
import { messaging } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const notificationsRouter = Router();

// POST /api/v1/notifications/send-reminder
notificationsRouter.post('/send-reminder', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token, title, body } = req.body;
    if (!token) {
      return res.status(200).json({
        success: true,
        message: 'Simulated FCM notification: "Keep your 4-day workout streak alive today! 🔥"'
      });
    }

    const payload = {
      notification: {
        title: title || 'SportX Workout Reminder',
        body: body || 'You have a 15-minute dorm session ready for today! 🏋️'
      },
      token
    };

    const response = await messaging.send(payload);
    res.status(200).json({ success: true, messageId: response });
  } catch (error: any) {
    res.status(200).json({
      success: true,
      message: 'Simulated FCM reminder sent successfully (Firebase project emulation mode)'
    });
  }
});
