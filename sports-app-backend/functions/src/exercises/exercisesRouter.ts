import { Router, Response } from 'express';
import { verifyAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { ExerciseService } from './exerciseService';
import { FitnessLevel } from '../types';

export const exercisesRouter = Router();

// Enforce auth on exercise routes
exercisesRouter.use(verifyAuth);

/**
 * GET /api/v1/exercises
 * Retrieves exercise catalogue with optional category, difficulty, and muscle filters
 */
exercisesRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category, difficulty, targetMuscle } = req.query;

    const exercises = await ExerciseService.getExercises({
      category: category ? String(category) : undefined,
      difficulty: difficulty ? (String(difficulty) as FitnessLevel) : undefined,
      targetMuscle: targetMuscle ? String(targetMuscle) : undefined,
    });

    sendSuccess(res, exercises);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve exercises';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * GET /api/v1/exercises/:id
 * Retrieves a single exercise by ID
 */
exercisesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const exercise = await ExerciseService.getExerciseById(req.params.id);
    if (!exercise) {
      sendError(res, 'NOT_FOUND', `Exercise with id '${req.params.id}' not found`, 404);
      return;
    }
    sendSuccess(res, exercise);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve exercise';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * POST /api/v1/exercises/search
 * Search exercises by keyword or muscle
 */
exercisesRouter.post('/search', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    const all = await ExerciseService.getExercises();

    if (!query || typeof query !== 'string') {
      sendSuccess(res, all);
      return;
    }

    const q = query.toLowerCase();
    const matched = all.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.targetMuscles.some((m) => m.toLowerCase().includes(q))
    );

    sendSuccess(res, matched);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to search exercises';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * POST /api/v1/exercises (Admin only)
 * Creates or updates an exercise in master catalogue
 */
exercisesRouter.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const exerciseData = req.body;
    if (!exerciseData.name) {
      sendError(res, 'INVALID_ARGUMENT', 'Exercise name is required', 400);
      return;
    }

    const created = await ExerciseService.upsertExercise(exerciseData);
    sendSuccess(res, created, 'Exercise saved successfully', 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create exercise';
    sendError(res, 'INTERNAL', message, 500);
  }
});
