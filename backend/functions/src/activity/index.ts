import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const activityRouter = Router();

// GET /api/v1/activity/history?period=today|7d|30d|all
activityRouter.get('/history', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { period = '7d' } = req.query;

    let query: FirebaseFirestore.Query = db.collection('activityLogs')
      .where('userId', '==', uid)
      .orderBy('timestamp', 'desc');

    const now = new Date();
    if (period === 'today') {
      const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      query = query.where('timestamp', '>=', todayStart);
    } else if (period === '7d') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.where('timestamp', '>=', weekAgo);
    } else if (period === '30d') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.where('timestamp', '>=', monthAgo);
    }

    const snapshot = await query.limit(50).get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fallback demo data if clean database
    if (logs.length === 0) {
      const demoLogs = [
        {
          id: 'demo_log_1',
          exerciseId: 'squat',
          exerciseName: 'Bodyweight Squats',
          reps: 24,
          durationSeconds: 180,
          formScore: 92,
          calories: 25,
          timestamp: new Date().toISOString()
        },
        {
          id: 'demo_log_2',
          exerciseId: 'pushup',
          exerciseName: 'Standard Push-ups',
          reps: 15,
          durationSeconds: 120,
          formScore: 84,
          calories: 18,
          timestamp: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      return res.status(200).json({ success: true, period, count: demoLogs.length, data: demoLogs });
    }

    res.status(200).json({ success: true, period, count: logs.length, data: logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
