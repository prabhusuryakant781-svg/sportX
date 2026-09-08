/**
 * Activity Log Routes: GET /activity/history
 * Core Features: 15 (Activity Logging), 16 (Workout History)
 */
import { Router, Response } from 'express';
import { sessions } from '../config/demoStore';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const activityRouter = Router();

// GET /api/v1/activity/history?period=today|7d|30d|all
activityRouter.get('/history', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user!.uid;
  const { period = '7d' } = req.query;

  const now = Date.now();
  const filters: Record<string, number> = { today: 86400000, '7d': 7 * 86400000, '30d': 30 * 86400000 };
  const cutoff = filters[String(period)];

  let logs = sessions.filter(s => s.userId === uid);
  if (cutoff) {
    logs = logs.filter(s => new Date(s.completedAt).getTime() >= now - cutoff);
  }

  res.status(200).json({
    success: true,
    period,
    count: logs.length,
    data: logs.map(s => ({
      id: s.id,
      exerciseId: s.exerciseId,
      reps: s.totalReps,
      durationSeconds: s.durationSeconds,
      formScore: s.averageFormScore,
      calories: s.caloriesBurned,
      xpEarned: s.xpAwarded,
      completedAt: s.completedAt,
    })),
  });
});
