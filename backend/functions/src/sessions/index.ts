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

// POST /api/v1/sessions/:sessionId/complete
sessionsRouter.post('/:sessionId/complete', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { sessionId } = req.params;
    const {
      totalReps = 0,
      averageFormScore = 85,
      durationSeconds = 60,
      exerciseId = 'squat',
      exerciseLogs = [],
      heartRateAverage = null,
    } = req.body;

    // Ownership and idempotency check
    const existingSession = await SessionRepository.getById(sessionId);
    if (existingSession) {
      if (existingSession.userId !== uid) {
        return res.status(403).json({ success: false, error: 'Access denied: You do not own this session' });
      }

      // Idempotency: If already completed, return existing data without duplicate rewards
      if (existingSession.status === 'completed') {
        const user = await UserRepository.getById(uid);
        return res.status(200).json({
          success: true,
          message: 'Workout was already completed (idempotent response).',
          data: {
            sessionId: existingSession.sessionId,
            exerciseId,
            totalReps: existingSession.totalReps,
            averageFormScore: existingSession.formAccuracyAverage,
            durationMinutes: existingSession.durationMinutes,
            caloriesBurned: existingSession.caloriesBurned,
            xpEarned: existingSession.xpEarned,
            totalXp: user?.xp || 0,
            level: user?.level || 1,
            currentStreak: user?.currentStreak || 0,
            longestStreak: user?.longestStreak || 0,
            badgesUnlocked: user?.badges || [],
          },
        });
      }
    }

    const reps = Math.max(0, Number(totalReps));
    const score = Math.min(100, Math.max(0, Number(averageFormScore)));
    const durationSec = Math.max(0, Number(durationSeconds));
    const durationMin = Math.max(1, Math.round(durationSec / 60));
    const calories = Math.round(durationMin * 8.5);

    // 1. Authoritative Server-side XP Calculation
    const xpEarned = GamificationService.calculateSessionXP({
      totalReps: reps,
      formAccuracyAverage: score,
      durationMinutes: durationMin,
      isCompleted: true,
    });

    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];

    // 2. Fetch existing user profile
    let user = await UserRepository.getById(uid);
    if (!user) {
      user = await UserRepository.create(uid, { userId: uid });
    }

    // 3. Compute Streak progression
    const streakResult = GamificationService.evaluateStreak({
      lastWorkoutDate: user.lastWorkoutDate,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      sessionDate: todayDate,
    });

    const newTotalXP = (user.xp || 0) + xpEarned;
    const newLevel = GamificationService.calculateLevel(newTotalXP);
    const updatedTotalWorkouts = (user.totalWorkouts || 0) + 1;

    // 4. Compute Badges
    const badgeResult = GamificationService.evaluateUnlockedBadges({
      currentBadges: user.badges || [],
      totalWorkouts: updatedTotalWorkouts,
      totalReps: (user.totalWorkouts || 0) * 15 + reps,
      totalXP: newTotalXP,
      currentStreak: streakResult.currentStreak,
      sessionFormAccuracy: score,
    });

    // 5. Save completed session in Firestore
    const completedSession: WorkoutSessionDoc = {
      sessionId,
      userId: uid,
      workoutId: req.body.planId || existingSession?.workoutId || 'workout_standard',
      sportId: req.body.sportId || existingSession?.sportId || 'general',
      startTime: existingSession?.startTime || req.body.startTime || now,
      pauseTimes: existingSession?.pauseTimes || [],
      resumeTimes: existingSession?.resumeTimes || [],
      completionTime: now,
      endTime: now,
      durationMinutes: durationMin,
      durationSeconds: durationSec,
      totalReps: reps,
      formAccuracyAverage: score,
      caloriesBurned: calories,
      heartRateAverage: heartRateAverage ? Number(heartRateAverage) : null,
      exerciseLogs: exerciseLogs.length > 0 ? exerciseLogs : [
        {
          exerciseId,
          sets: [{ setNumber: 1, reps, formAccuracy: score, feedbackMessages: ['Good form maintained'] }],
          totalReps: reps,
          averageFormScore: score,
        },
      ],
      xpEarned,
      status: 'completed',
      createdAt: existingSession?.createdAt || now,
    };

    await SessionRepository.create(completedSession);

    // 6. Record individual activity logs for AI telemetry (Section 8)
    const activityLogsToInsert: ActivityLogDoc[] = [];
    if (completedSession.exerciseLogs && completedSession.exerciseLogs.length > 0) {
      completedSession.exerciseLogs.forEach((exLog, idx) => {
        activityLogsToInsert.push({
          logId: `act_${sessionId}_${idx}`,
          userId: uid,
          sessionId,
          exerciseId: exLog.exerciseId,
          exerciseName: exLog.exerciseName || exLog.exerciseId,
          reps: exLog.totalReps || reps,
          durationSeconds: durationSec,
          formScore: exLog.averageFormScore || score,
          detectedErrors: [],
          calories: Math.round(calories / completedSession.exerciseLogs.length),
          timestamp: now,
        });
      });
    } else {
      activityLogsToInsert.push({
        logId: `act_${sessionId}_0`,
        userId: uid,
        sessionId,
        exerciseId,
        exerciseName: exerciseId,
        reps,
        durationSeconds: durationSec,
        formScore: score,
        detectedErrors: [],
        calories,
        timestamp: now,
      });
    }
    await ActivityRepository.createBatch(activityLogsToInsert).catch((err) =>
      logger.warn('Failed recording activity logs:', err)
    );

    // 7. Atomically apply user progress to users/{userId} (Audits XP transaction, updates streak, unlocks badges)
    await UserRepository.applyWorkoutCompletion(uid, {
      sessionId,
      xpToAdd: xpEarned,
      newLevel,
      durationMinutes: durationMin,
      caloriesBurned: calories,
      currentStreak: streakResult.currentStreak,
      longestStreak: streakResult.longestStreak,
      lastWorkoutDate: todayDate,
      newBadges: badgeResult.newBadges.map((b) => b.id),
    });

    // 8. Update Progress Aggregates (Section 10)
    await ProgressRepository.recordWorkout(uid, {
      reps,
      durationMinutes: durationMin,
      calories,
      formScore: score,
      date: todayDate,
      exerciseId,
    }).catch((err) => logger.warn('Failed updating progress aggregation:', err));

    // 9. Update Analytics (lifetime stats)
    await AnalyticsRepository.recordWorkoutMetrics({
      userId: uid,
      durationMinutes: durationMin,
      calories,
      reps,
      formAccuracy: score,
      muscleGroups: [exerciseId],
    }).catch((err) => logger.warn('Failed updating analytics:', err));

    // 10. Trigger FCM notification for any newly unlocked badges
    for (const badge of badgeResult.newBadges) {
      NotificationService.sendBadgeUnlocked(uid, badge.name, badge.icon).catch((e) =>
        logger.warn('Failed sending badge notification:', e)
      );
    }

    return res.status(200).json({
      success: true,
      message: '🎉 Workout completed and securely saved to Firestore!',
      data: {
        sessionId,
        exerciseId,
        totalReps: reps,
        averageFormScore: score,
        durationMinutes: durationMin,
        caloriesBurned: calories,
        xpEarned,
        totalXp: newTotalXP,
        level: newLevel,
        currentStreak: streakResult.currentStreak,
        longestStreak: streakResult.longestStreak,
        badgesUnlocked: badgeResult.newBadges.map((b) => b.id),
      },
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
