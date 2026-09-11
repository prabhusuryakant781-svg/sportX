import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { WorkoutService } from './workoutService';
import { FitnessLevel } from '../types';

export const workoutsRouter = Router();

// Require auth for all workout routes
workoutsRouter.use(verifyAuth);

/**
 * GET /api/v1/workouts
 * List available workout plans
 */
workoutsRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { difficulty } = req.query;

    const plans = await WorkoutService.getWorkouts(
      userId,
      difficulty ? (String(difficulty) as FitnessLevel) : undefined
    );

    sendSuccess(res, plans);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve workouts';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * GET /api/v1/workouts/today
 * Returns personalized daily workout plan for authenticated user
 */
workoutsRouter.get('/today', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const todayPlan = await WorkoutService.getTodayWorkout(userId);
    sendSuccess(res, todayPlan);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve daily workout';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * GET /api/v1/workouts/:id
 * Retrieve workout plan by ID
 */
workoutsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const plan = await WorkoutService.getWorkoutById(req.params.id);
    if (!plan) {
      sendError(res, 'NOT_FOUND', `Workout plan '${req.params.id}' not found`, 404);
      return;
    }
    sendSuccess(res, plan);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve workout plan';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * POST /api/v1/workouts
 * Create a new custom or assigned workout plan (validated)
 */
workoutsRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const plan = await WorkoutService.createWorkoutPlan(req.body, userId);
    sendSuccess(res, plan, 'Workout plan created successfully', 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create workout plan';
    sendError(res, 'INVALID_ARGUMENT', message, 400);
  }
});
