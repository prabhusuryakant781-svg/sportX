/**
 * Session Routes: POST /sessions/start, POST /sessions/:id/complete, POST /sessions/:id/cancel
 * Core Features: 9 (Rep Counting), 15 (Activity Logging), 24 (XP), 28 (Stop/Pause)
 */
import { Router, Response } from 'express';
import { sessions, users, nextId, DemoSession } from '../config/demoStore';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { calculateXP, updateStreak } from '../gamification';

export const sessionsRouter = Router();

const activeSessions: Map<string, any> = new Map();

// POST /api/v1/sessions/start
sessionsRouter.post('/start', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user!.uid;
  const { exerciseId = 'squat', planId = 'dorm_blast_20' } = req.body;

  const sessionId = nextId('session');
  activeSessions.set(sessionId, {
    id: sessionId,
    userId: uid,
    planId,
    exerciseId,
    status: 'active',
    startedAt: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    message: 'Session started. Camera workout is live!',
    data: { sessionId, exerciseId, planId, startedAt: new Date().toISOString() },
  });
});

// POST /api/v1/sessions/:sessionId/complete
sessionsRouter.post('/:sessionId/complete', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user!.uid;
  const { sessionId } = req.params;
  const { totalReps = 0, averageFormScore = 85, durationSeconds = 60, exerciseId = 'squat' } = req.body;

  const reps = Number(totalReps);
  const score = Number(averageFormScore);
  const duration = Number(durationSeconds);
  const calories = Math.round((duration / 60) * 8.5);

  // Server-side XP calculation (anti-cheat)
  const xpEarned = calculateXP(reps, score, true);

  const completedSession: DemoSession = {
    id: sessionId || nextId('session'),
    userId: uid,
    exerciseId,
    totalReps: reps,
    averageFormScore: score,
    durationSeconds: duration,
    caloriesBurned: calories,
    xpAwarded: xpEarned,
    completedAt: new Date().toISOString(),
  };
  sessions.push(completedSession);
  activeSessions.delete(sessionId);

  // Update user XP and streak
  const { newXp, currentStreak, badgesUnlocked } = updateStreak(uid, xpEarned);

  res.status(200).json({
    success: true,
    message: '🎉 Workout completed and saved!',
    data: {
      sessionId: completedSession.id,
      exerciseId,
      totalReps: reps,
      averageFormScore: score,
      caloriesBurned: calories,
      xpEarned,
      totalXp: newXp,
      currentStreak,
      badgesUnlocked,
    },
  });
});

// POST /api/v1/sessions/:sessionId/cancel
sessionsRouter.post('/:sessionId/cancel', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.params;
  activeSessions.delete(sessionId);
  res.status(200).json({ success: true, message: 'Session cancelled' });
});
