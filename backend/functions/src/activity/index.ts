/**
 * Activity Log Routes:
 * - GET  /activity/history?period=today|7d|30d|all&page=1&limit=20
 * - POST /activity/log (direct exercise form telemetry)
 * - GET  /activity/session/:sessionId
 * - POST /activity/manual
 */
import { Router, Response } from 'express';
import { ActivityRepository } from '../repositories/activityRepository';
import { SessionRepository } from '../repositories/sessionRepository';
import { parseSessionTime } from '../repositories/progressRepository';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { ActivityLogDoc } from '../types';
import * as logger from 'firebase-functions/logger';

export const activityRouter = Router();

// GET /api/v1/activity/history?period=today|7d|30d|all&page=1&limit=20
activityRouter.get('/history', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;

    // Strict ownership verification: cannot query another user's activity history
    const requestedUserId = req.query.userId as string | undefined;
    if (requestedUserId && requestedUserId !== uid && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Cannot access another user's history",
      });
    }

    const validPeriods = ['today', '7d', '30d', 'all'];
    const rawPeriod = req.query.period as string | undefined;
    const period = validPeriods.includes(rawPeriod as any) ? (rawPeriod as 'today' | '7d' | '30d' | 'all') : '7d';

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    // Query activity logs from Firestore / test cache
    const logs = await ActivityRepository.getByUser(uid, period);

    let allItems: any[] = [];

    if (logs.length > 0) {
      allItems = logs.map((l) => ({
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
      }));
    } else {
      // Query completed, server-finalized workout sessions
      const allSessions = await SessionRepository.getUserSessions(uid, { limit: 500, status: 'completed' });
      const completedSessions = allSessions.filter((s) => s.status === 'completed');

      const now = new Date();
      let cutoff: number | null = null;
      if (period === 'today') {
        cutoff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
      } else if (period === '7d') {
        cutoff = now.getTime() - 7 * 86400000;
      } else if (period === '30d') {
        cutoff = now.getTime() - 30 * 86400000;
      }

      const filtered = cutoff === null
        ? completedSessions
        : completedSessions.filter((s) => parseSessionTime(s) >= cutoff!);

      allItems = filtered.map((s) => ({
        id: s.sessionId,
        sessionId: s.sessionId,
        exerciseId: s.exerciseLogs?.[0]?.exerciseId || s.exerciseId || 'general',
        exerciseName: s.exerciseLogs?.[0]?.exerciseName || s.exerciseName || 'General Routine',
        reps: s.totalReps,
        durationSeconds: s.durationSeconds || ((s.durationMinutes || 1) * 60),
        formScore: s.formAccuracyAverage,
        detectedErrors: s.formErrors || [],
        calories: s.caloriesBurned,
        xpEarned: s.xpEarned,
        status: s.status,
        completedAt: s.endTime || s.completionTime || s.createdAt,
      }));
    }

    // Pagination calculations
    const total = allItems.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedData = allItems.slice(startIndex, startIndex + limit);
    const hasMore = page < totalPages;

    return res.status(200).json({
      success: true,
      period,
      count: paginatedData.length,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
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
    const session = await SessionRepository.getById(sessionId);
    if (session && session.userId !== req.user!.uid && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Cannot access another user's session logs",
      });
    }

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

    const newLog: ActivityLogDoc = {
      logId,
      userId: uid,
      sessionId: `manual_${Date.now()}`,
      exerciseId: sportId,
      exerciseName: sportId,
      reps: 0,
      durationSeconds: (durationMinutes || 30) * 60,
      formScore: 100,
      detectedErrors: notes ? [notes] : [],
      calories: Math.round((durationMinutes || 30) * 8),
      timestamp: new Date().toISOString(),
    };

    await ActivityRepository.create(newLog);

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
