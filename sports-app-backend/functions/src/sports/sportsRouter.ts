import { Router, Response } from 'express';
import { verifyAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { SportService } from './sportService';

export const sportsRouter = Router();

// Allow reading sports without admin check (but requires auth)
sportsRouter.use(verifyAuth);

/**
 * GET /api/v1/sports
 * List all active sports
 */
sportsRouter.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sports = await SportService.getActiveSports();
    sendSuccess(res, sports);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve sports';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * GET /api/v1/sports/:id
 * Retrieve specific sport details
 */
sportsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sport = await SportService.getSportById(req.params.id);
    if (!sport) {
      sendError(res, 'NOT_FOUND', `Sport with id '${req.params.id}' not found`, 404);
      return;
    }
    sendSuccess(res, sport);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve sport';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * POST /api/v1/sports/select
 * Update authenticated user's selected sports
 */
sportsRouter.post('/select', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { sports } = req.body;

    if (!Array.isArray(sports)) {
      sendError(res, 'INVALID_ARGUMENT', 'sports must be an array of sport names or IDs', 400);
      return;
    }

    const updated = await SportService.selectSportsForUser(userId, sports);
    sendSuccess(res, { selectedSports: updated }, 'Selected sports updated successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to select sports';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * POST /api/v1/sports (Admin only)
 * Create new sport in master catalogue
 */
sportsRouter.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, imageUrl, isActive } = req.body;
    if (!name || typeof name !== 'string') {
      sendError(res, 'INVALID_ARGUMENT', 'Sport name is required', 400);
      return;
    }

    const sport = await SportService.upsertSport({ name, description, imageUrl, isActive });
    sendSuccess(res, sport, 'Sport created successfully', 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create sport';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * PUT /api/v1/sports/:id (Admin only)
 * Update existing sport
 */
sportsRouter.put('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sport = await SportService.upsertSport({
      ...req.body,
      id: req.params.id,
    });
    sendSuccess(res, sport, 'Sport updated successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update sport';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * DELETE /api/v1/sports/:id (Admin only)
 * Deactivate / disable a sport
 */
sportsRouter.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const disabled = await SportService.disableSport(req.params.id);
    if (!disabled) {
      sendError(res, 'NOT_FOUND', 'Sport not found', 404);
      return;
    }
    sendSuccess(res, { id: req.params.id, isActive: false }, 'Sport disabled successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to disable sport';
    sendError(res, 'INTERNAL', message, 500);
  }
});
