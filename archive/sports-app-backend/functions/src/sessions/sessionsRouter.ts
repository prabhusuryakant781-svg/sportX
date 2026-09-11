import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { SessionService } from './sessionService';

export const sessionsRouter = Router();

// Enforce auth on all session endpoints
sessionsRouter.use(verifyAuth);

/**
 * POST /api/v1/sessions/start
 * Starts a new workout session
 */
sessionsRouter.post('/start', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { workoutPlanId, exerciseId, totalExercises } = req.body;

    const session = await SessionService.startSession({
      userId,
      workoutPlanId,
      exerciseId,
      totalExercises,
    });

    sendSuccess(res, session, 'Workout session started', 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start session';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * POST /api/v1/sessions/:id/pause
 * Pauses active session
 */
sessionsRouter.post('/:id/pause', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const updated = await SessionService.updateSessionState(req.params.id, userId, 'paused');
    sendSuccess(res, updated, 'Session paused');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to pause session';
    sendError(res, 'INVALID_STATE', message, 400);
  }
});

/**
 * POST /api/v1/sessions/:id/resume
 * Resumes paused session
 */
sessionsRouter.post('/:id/resume', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const updated = await SessionService.updateSessionState(req.params.id, userId, 'resumed');
    sendSuccess(res, updated, 'Session resumed');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to resume session';
    sendError(res, 'INVALID_STATE', message, 400);
  }
});

/**
 * POST /api/v1/sessions/:id/complete
 * Authoritatively completes session, awards XP, updates streak, checks badges
 */
sessionsRouter.post('/:id/complete', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const {
      totalReps,
      averageFormScore,
      caloriesBurned,
      completedExercises,
      durationSeconds,
    } = req.body;

    const result = await SessionService.completeSession({
      sessionId: req.params.id,
      userId,
      totalReps: Number(totalReps) || 0,
      averageFormScore: Number(averageFormScore) || 80,
      caloriesBurned: caloriesBurned !== undefined ? Number(caloriesBurned) : undefined,
      completedExercises: Number(completedExercises) || 1,
      durationSeconds: durationSeconds !== undefined ? Number(durationSeconds) : undefined,
    });

    sendSuccess(res, result, 'Workout completed successfully and rewards processed');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to complete session';
    sendError(res, 'INVALID_STATE', message, 400);
  }
});

/**
 * POST /api/v1/sessions/:id/cancel
 * Cancels / abandons session
 */
sessionsRouter.post('/:id/cancel', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const cancelled = await SessionService.updateSessionState(req.params.id, userId, 'cancelled');
    sendSuccess(res, cancelled, 'Session cancelled');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cancel session';
    sendError(res, 'INVALID_STATE', message, 400);
  }
});

/**
 * GET /api/v1/sessions/current
 * Returns user's currently active / paused session
 */
sessionsRouter.get('/current', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const current = await SessionService.getCurrentSession(userId);
    sendSuccess(res, current);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve active session';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * GET /api/v1/sessions/:id
 * Retrieve session by ID
 */
sessionsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const session = await SessionService.getSession(req.params.id, userId);

    if (!session) {
      sendError(res, 'NOT_FOUND', `Session '${req.params.id}' not found`, 404);
      return;
    }

    sendSuccess(res, session);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve session';
    sendError(res, 'PERMISSION_DENIED', message, 403);
  }
});

/**
 * GET /api/v1/sessions
 * List user's sessions
 */
sessionsRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const status = req.query.status ? String(req.query.status) : undefined;

    const sessions = await SessionService.listUserSessions(userId, limit, status);
    sendSuccess(res, sessions);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list sessions';
    sendError(res, 'INTERNAL', message, 500);
  }
});
