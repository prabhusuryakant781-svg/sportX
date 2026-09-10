/**
 * Activity Log Routes:
 * - GET  /activity/history?period=today|7d|30d|all
 * - POST /activity/log (direct exercise form telemetry)
 * - GET  /activity/session/:sessionId
 */
import { Router, Response } from 'express';
import { ActivityRepository } from '../repositories/activityRepository';
import { SessionRepository } from '../repositories/sessionRepository';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { ActivityLogDoc } from '../types';
import * as logger from 'firebase-functions/logger';

export const activityRouter = Router();

// GET /api/v1/activity/history?period=today|7d|30d|all
activityRouter.get('/history', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const period = (req.query.period as 'today' | '7d' | '30d' | 'all') || '7d';

    // Query activity logs from Firestore
    const logs = await ActivityRepository.getByUser(uid, period);

    if (logs.length > 0) {
      return res.status(200).json({
        success: true,
        period,
        count: logs.length,
        data: logs.map((l) => ({
          id: l.logId,
          sessionId: l.sessionId,
          exerciseId: l.exerciseId,
          exerciseName: l.exerciseName,
          reps: l.reps,
          durationSeconds: l.durationSeconds,
          formScore: l.formScore,
          detectedErrors: l.detectedErrors || [],
          calories: l.calories,
          completedAt: l.timestamp,
        })),
      });
    }

    // Fallback to workout sessions if activity logs are empty
    const allSessions = await SessionRepository.getUserSessions(uid, { limit: 100 });
    const now = Date.now();
    const filters: Record<string, number> = {
      today: 86400000,
      '7d': 7 * 86400000,
      '30d': 30 * 86400000,
    };
    const cutoff = filters[period];

    let filtered = allSessions;
    if (cutoff) {
      filtered = allSessions.filter((s) => {
        const time = new Date(s.createdAt as string).getTime();
        return time >= now - cutoff;
      });
    }

    return res.status(200).json({
      success: true,
      period,
      count: filtered.length,
      data: filtered.map((s) => ({
        id: s.sessionId,
        exerciseId: s.exerciseLogs?.[0]?.exerciseId || 'general',
        exerciseName: s.exerciseLogs?.[0]?.exerciseName || 'General Routine',
        reps: s.totalReps,
        durationSeconds: (s.durationMinutes || 1) * 60,
        formScore: s.formAccuracyAverage,
        detectedErrors: [],
        calories: s.caloriesBurned,
        xpEarned: s.xpEarned,
        status: s.status,
        completedAt: s.endTime || s.createdAt,
      })),
    });
  } catch (err: any) {
    logger.error('Error in /activity/history:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/activity/log (telemetry submission for CV/AI pose tracking)
activityRouter.post('/log', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const {
      sessionId = `sess_direct_${Date.now()}`,
      exerciseId = 'squat',
      exerciseName = 'Bodyweight Squats',
      reps = 0,
      durationSeconds = 30,
      formScore = 85,
      detectedErrors = [],
      calories = 10,
    } = req.body;

    const logId = `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newLog: ActivityLogDoc = {
      logId,
      userId: uid,
      sessionId,
      exerciseId,
      exerciseName,
      reps: Number(reps),
      durationSeconds: Number(durationSeconds),
      formScore: Math.min(100, Math.max(0, Number(formScore))),
      detectedErrors: Array.isArray(detectedErrors) ? detectedErrors : [],
      calories: Number(calories),
      timestamp: new Date().toISOString(),
    };

    await ActivityRepository.create(newLog);

    return res.status(201).json({
      success: true,
      message: 'Exercise activity telemetry logged successfully',
      data: newLog,
    });
  } catch (err: any) {
    logger.error('Error in /activity/log:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/activity/session/:sessionId
activityRouter.get('/session/:sessionId', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const logs = await ActivityRepository.getBySession(sessionId);
    return res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/activity/manual
activityRouter.post('/manual', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { sportId, durationMinutes, notes } = req.body;

    const logId = `act_manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const xpAwarded = Math.round((durationMinutes || 30) * 5); // 5 XP per min

    const newLog: ActivityLogDoc = {
      logId,
      userId: uid,
      sessionId: `manual_${Date.now()}`,
      exerciseId: sportId,
      exerciseName: sportId, // would ideally map from sport DB
      reps: 0,
      durationSeconds: (durationMinutes || 30) * 60,
      formScore: 100,
      detectedErrors: notes ? [notes] : [], // reuse for notes in UI
      calories: Math.round((durationMinutes || 30) * 8),
      timestamp: new Date().toISOString(),
    };

    await ActivityRepository.create(newLog);

    // Give XP (ideally update user document)
    // We can assume user gets XP for manual logging.

    return res.status(201).json({
      success: true,
      message: 'Manual activity logged successfully',
      data: newLog,
    });
  } catch (err: any) {
    logger.error('Error in /activity/manual:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
