import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { UserService } from './userService';

export const usersRouter = Router();

// Enforce auth on all user routes
usersRouter.use(verifyAuth);

/**
 * GET /api/v1/users/profile
 * Returns authenticated user's profile
 */
usersRouter.get('/profile', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const profile = await UserService.getProfile(userId);

    if (!profile) {
      sendError(res, 'NOT_FOUND', 'User profile does not exist', 404);
      return;
    }

    sendSuccess(res, profile);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve profile';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * PUT /api/v1/users/profile
 * Updates authenticated user's profile with validation & protection of sensitive fields
 */
usersRouter.put('/profile', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const updateData = req.body;

    if (!updateData || typeof updateData !== 'object') {
      sendError(res, 'INVALID_ARGUMENT', 'Request body must be a valid JSON object', 400);
      return;
    }

    const updated = await UserService.updateProfile(userId, updateData);
    sendSuccess(res, updated, 'Profile updated successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    sendError(res, 'INVALID_ARGUMENT', message, 400);
  }
});

/**
 * GET /api/v1/users/stats
 * Returns summary statistics for authenticated user
 */
usersRouter.get('/stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const stats = await UserService.getUserStats(userId);
    sendSuccess(res, stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve user statistics';
    sendError(res, 'INTERNAL', message, 500);
  }
});
