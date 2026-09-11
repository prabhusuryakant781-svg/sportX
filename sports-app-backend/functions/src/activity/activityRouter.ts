import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { ActivityService } from './activityService';

export const activityRouter = Router();

// Enforce auth on all activity endpoints
activityRouter.use(verifyAuth);

/**
 * POST /api/v1/activity/log
 * Ingest structured MediaPipe / OpenCV telemetry log
 */
activityRouter.post('/log', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { sessionId, exerciseId, reps, duration, formScore, errors, calories } = req.body;

    if (!sessionId) {
      sendError(res, 'INVALID_ARGUMENT', 'sessionId is required', 400);
      return;
    }

    const log = await ActivityService.logActivity({
      userId,
      sessionId,
      exerciseId,
      reps: Number(reps),
      duration: Number(duration),
      formScore: Number(formScore),
      errors,
      calories: calories !== undefined ? Number(calories) : undefined,
    });

    sendSuccess(res, log, 'Activity logged successfully', 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to log activity';
    sendError(res, 'INVALID_ARGUMENT', message, 400);
  }
});

/**
 * GET /api/v1/activity/history
 * Query workout history filterable by 'today', '7d', '30d', or 'all'
 */
activityRouter.get('/history', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const period = (req.query.period as 'today' | '7d' | '30d' | 'all') || '7d';
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const lastTimestamp = req.query.lastTimestamp ? String(req.query.lastTimestamp) : undefined;

    if (!['today', '7d', '30d', 'all'].includes(period)) {
      sendError(res, 'INVALID_ARGUMENT', "period must be one of: 'today', '7d', '30d', 'all'", 400);
      return;
    }

    const history = await ActivityService.getHistory({
      userId,
      period,
      limit,
      lastTimestamp,
    });

    sendSuccess(res, history);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve activity history';
    sendError(res, 'INTERNAL', message, 500);
  }
});
