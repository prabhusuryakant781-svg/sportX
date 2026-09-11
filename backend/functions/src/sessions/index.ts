/**
 * Session Routes:
 * - POST /sessions/start
 * - POST /sessions/:sessionId/pause
 * - POST /sessions/:sessionId/resume
 * - POST /sessions/:sessionId/complete
 * - POST /sessions/:sessionId/cancel
 * - GET  /sessions/:sessionId
 *
 * Requirements:
 * - Session Tracking (start, pause, resume, complete, cancel)
 * - User ownership check (prevents modifying another user's session)
 * - Idempotent completion & duplicate protection
 * - Activity Logs creation for computer-vision telemetry
 * - Server-side Anti-Cheat XP, Streak, and Badges
 */
import { Router, Response } from 'express';
import { SessionRepository } from '../repositories/sessionRepository';
import { UserRepository } from '../repositories/userRepository';
import { AnalyticsRepository } from '../repositories/analyticsRepository';
import { ActivityRepository } from '../repositories/activityRepository';
import { ProgressRepository } from '../repositories/progressRepository';
import { GamificationService } from '../services/gamificationService';
import { NotificationService } from '../services/notificationService';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { WorkoutSessionDoc, ActivityLogDoc } from '../types';
import { WorkoutCompletionService } from '../services/workoutCompletionService';
import * as logger from 'firebase-functions/logger';

export const sessionsRouter = Router();

// GET /api/v1/sessions - List authenticated user's workout sessions
sessionsRouter.get('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string | undefined;

    const sessions = await SessionRepository.getUserSessions(uid, { limit, status });
    return res.status(200).json({ success: true, count: sessions.length, data: sessions });
  } catch (err: any) {
    logger.error('Error fetching user sessions:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/sessions/:sessionId
sessionsRouter.get('/:sessionId', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { sessionId } = req.params;

    const session = await SessionRepository.getById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.userId !== uid) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not own this session' });
    }

    return res.status(200).json({ success: true, data: session });
  } catch (err: any) {
    logger.error('Error fetching session:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/sessions/start
sessionsRouter.post('/start', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { exerciseId = 'squat', planId = 'dorm_blast_20', sportId = 'general', exerciseName = null } = req.body;

    const sessionId = `sess_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const newSession: WorkoutSessionDoc = {
      sessionId,
      userId: uid,
      workoutId: planId,
      sportId,
      exerciseId,
      exerciseName: exerciseName || exerciseId,
      startTime: now,
      pauseTimes: [],
      resumeTimes: [],
      completionTime: null,
      endTime: null,
      durationMinutes: 0,
      totalReps: 0,
      formAccuracyAverage: 0,
      caloriesBurned: 0,
      heartRateAverage: null,
      exerciseLogs: [],
      xpEarned: 0,
      status: 'in-progress',
      createdAt: now,
    };

    await SessionRepository.create(newSession);

    return res.status(201).json({
      success: true,
      message: 'Workout session started. Camera tracking is active.',
      data: {
        sessionId,
        exerciseId,
        planId,
        sportId,
        startedAt: now,
      },
    });
  } catch (err: any) {
    logger.error('Error starting session:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/sessions/:sessionId/pause
sessionsRouter.post('/:sessionId/pause', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { sessionId } = req.params;

    const session = await SessionRepository.getById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.userId !== uid) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not own this session' });
    }

    if (session.status === 'completed' || session.status === 'abandoned') {
      return res.status(400).json({ success: false, error: `Cannot pause session with status ${session.status}` });
    }

    const now = new Date().toISOString();
    const pauseTimes = [...(session.pauseTimes || []), now];

    await SessionRepository.update(sessionId, {
      status: 'paused',
      pauseTimes,
    });

    return res.status(200).json({
      success: true,
      message: 'Workout session paused.',
      data: { sessionId, status: 'paused', pausedAt: now },
    });
  } catch (err: any) {
    logger.error('Error pausing session:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/sessions/:sessionId/resume
sessionsRouter.post('/:sessionId/resume', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { sessionId } = req.params;

    const session = await SessionRepository.getById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.userId !== uid) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not own this session' });
    }

    if (session.status !== 'paused') {
      return res.status(400).json({ success: false, error: `Session is not paused (current status: ${session.status})` });
    }

    const now = new Date().toISOString();
    const resumeTimes = [...(session.resumeTimes || []), now];

    await SessionRepository.update(sessionId, {
      status: 'in-progress',
      resumeTimes,
    });

    return res.status(200).json({
      success: true,
      message: 'Workout session resumed.',
      data: { sessionId, status: 'in-progress', resumedAt: now },
    });
  } catch (err: any) {
    logger.error('Error resuming session:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/// POST /api/v1/sessions/:sessionId/complete
sessionsRouter.post('/:sessionId/complete', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { sessionId } = req.params;
    const {
      totalReps,
      averageFormScore,
      durationSeconds,
      exerciseId,
      exerciseLogs,
      heartRateAverage,
      planId,
      sportId,
    } = req.body;

    const result = await WorkoutCompletionService.completeSession({
      sessionId,
      userId: uid,
      totalReps,
      averageFormScore,
      durationSeconds,
      exerciseId,
      exerciseLogs,
      heartRateAverage,
      planId,
      sportId,
    });

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(result.statusCode).json({
      success: true,
      message: result.message,
      idempotent: result.idempotent,
      data: result.data,
    });
  } catch (err: any) {
    logger.error('Error completing session:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/sessions/:sessionId/cancel
sessionsRouter.post('/:sessionId/cancel', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { sessionId } = req.params;

    const session = await SessionRepository.getById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.userId !== uid) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not own this session' });
    }

    await SessionRepository.update(sessionId, {
      status: 'abandoned',
      endTime: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, message: 'Session cancelled' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
