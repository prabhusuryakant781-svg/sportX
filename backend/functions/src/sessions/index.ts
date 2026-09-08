import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { XPService } from '../gamification';

export const sessionsRouter = Router();

// POST /api/v1/sessions/start
sessionsRouter.post('/start', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { planId, exerciseId } = req.body;

    const newSession = {
      userId: uid,
      planId: planId || 'custom',
      exerciseId: exerciseId || 'squat',
      status: 'active',
      startedAt: new Date().toISOString(),
      completedAt: null,
      totalReps: 0,
      averageFormScore: 100,
      caloriesBurned: 0,
      xpAwarded: 0
    };

    const docRef = await db.collection('workoutSessions').add(newSession);
    res.status(201).json({
      success: true,
      data: { sessionId: docRef.id, ...newSession }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/sessions/:sessionId/complete
sessionsRouter.post('/:sessionId/complete', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { sessionId } = req.params;
    const { totalReps, averageFormScore, durationSeconds, errorsEncountered, exerciseId } = req.body;

    const sessionRef = db.collection('workoutSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    const reps = Number(totalReps) || 0;
    const formScore = Number(averageFormScore) || 0;
    const duration = Number(durationSeconds) || 60;
    const calories = Math.round((duration / 60) * 8.5); // Approx 8.5 kcal/min active bodyweight

    // Calculate XP strictly on the server (anti-cheat)
    const xpEarned = XPService.calculateWorkoutXP(reps, formScore, true);

    const completionData = {
      status: 'completed',
      completedAt: new Date().toISOString(),
      totalReps: reps,
      averageFormScore: formScore,
      durationSeconds: duration,
      caloriesBurned: calories,
      xpAwarded: xpEarned,
      formErrors: errorsEncountered || []
    };

    await sessionRef.set(completionData, { merge: true });

    // Also persist into immutable activityLogs
    await db.collection('activityLogs').add({
      userId: uid,
      sessionId,
      exerciseId: exerciseId || sessionDoc.data()?.exerciseId || 'squat',
      reps,
      durationSeconds: duration,
      formScore,
      calories,
      timestamp: new Date().toISOString()
    });

    // Award XP and update user streaks
    const { currentStreak, newXp, badgesUnlocked } = await XPService.awardUserXpAndStreak(uid!, xpEarned);

    res.status(200).json({
      success: true,
      message: 'Workout successfully completed and recorded!',
      data: {
        sessionId,
        xpEarned,
        totalXp: newXp,
        currentStreak,
        caloriesBurned: calories,
        badgesUnlocked
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/sessions/:sessionId/cancel
sessionsRouter.post('/:sessionId/cancel', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    await db.collection('workoutSessions').doc(sessionId).set(
      { status: 'cancelled', cancelledAt: new Date().toISOString() },
      { merge: true }
    );
    res.status(200).json({ success: true, message: 'Session cancelled' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
