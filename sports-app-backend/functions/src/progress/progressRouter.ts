import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { ProgressService } from './progressService';

export const progressRouter = Router();

// Enforce auth on progress endpoints
progressRouter.use(verifyAuth);

/**
 * GET /api/v1/progress/summary
 * Retrieves comprehensive weekly/monthly progress, goal percentage, and PRs
 */
progressRouter.get('/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const summary = await ProgressService.getProgressSummary(userId);
    sendSuccess(res, summary);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve progress summary';
    sendError(res, 'INTERNAL', message, 500);
  }
});
