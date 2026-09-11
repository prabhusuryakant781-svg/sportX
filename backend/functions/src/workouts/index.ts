/**
 * Workout Plan Routes: GET /workouts, GET /workouts/today, GET /workouts/:id, POST /workouts
 * Core Feature: Personalized Workout Plans, Library & Custom Routines
 */
import { Router, Response } from 'express';
import { WorkoutRepository, INITIAL_WORKOUTS } from '../repositories/workoutRepository';
import { UserRepository } from '../repositories/userRepository';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { WorkoutPlanDoc } from '../types';
import { validateWorkoutPlan } from '../middleware/validation';
import * as logger from 'firebase-functions/logger';

export const workoutsRouter = Router();

// Re-export for compatibility
export const WORKOUT_PLANS = INITIAL_WORKOUTS;

// GET /api/v1/workouts
workoutsRouter.get('/', async (req, res) => {
  try {
    const { time, goal, difficulty, sport } = req.query;
    const workouts = await WorkoutRepository.getAll({
      maxDuration: time ? Number(time) : undefined,
      goal: goal as string,
      difficulty: difficulty as string,
      sport: sport as string,
    });

    res.status(200).json({ success: true, count: workouts.length, data: workouts });
  } catch (err: any) {
    logger.error('Error in GET /workouts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/workouts/today  — personalized workout selection
workoutsRouter.get('/today', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const user = await UserRepository.getById(uid);

    const time = user?.workoutDaysPerWeek ? 20 : 20;
    const userGoals = user?.goals || ['fitness'];
    const primaryGoal = userGoals[0] || 'fitness';

    const allWorkouts = await WorkoutRepository.getAll();
    const matched =
      allWorkouts.find(
        (p) => p.estimatedDuration <= time && (p.targetGoal === primaryGoal || p.targetGoal === 'fitness')
      ) || allWorkouts[0];

    res.status(200).json({
      success: true,
      data: {
        ...matched,
        recommendationReason: `Personalized for your ${time}-minute session window and '${primaryGoal}' goal.`,
      },
    });
  } catch (err: any) {
    logger.error('Error in GET /workouts/today:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/workouts/:id
workoutsRouter.get('/:id', async (req, res) => {
  try {
    const workout = await WorkoutRepository.getById(req.params.id);
    if (!workout) {
      return res.status(404).json({ success: false, error: 'Workout plan not found' });
    }
    return res.status(200).json({ success: true, data: workout });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/workouts (create custom workout)
workoutsRouter.post('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;

    const planValidation = validateWorkoutPlan(req.body);
    if (!planValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: planValidation.error,
      });
    }

    const {
      title,
      name,
      description,
      sport = 'fitness',
      difficulty = 'beginner',
      targetGoal = 'fitness',
      estimatedDuration = 20,
      exercises = [],
      tags = [],
      isPublic = false,
    } = req.body;

    const workoutId = `workout_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newWorkout: WorkoutPlanDoc = {
      workoutId,
      title: title || name,
      description: description || 'Custom user workout routine',
      creatorId: uid,
      sport,
      difficulty,
      targetGoal,
      estimatedDuration: Number(estimatedDuration),
      estimatedCalories: Math.round(Number(estimatedDuration) * 8.5),
      exercises: exercises.map((ex: any, idx: number) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        targetReps: ex.targetReps ?? 10,
        targetSets: ex.targetSets ?? 3,
        targetHoldSeconds: ex.targetHoldSeconds,
        restInterval: ex.restInterval ?? 30,
        order: ex.order ?? idx + 1,
        aiSupported: ex.aiSupported ?? true,
      })),
      tags: Array.isArray(tags) ? tags : ['custom'],
      isCustom: true,
      isPublic: Boolean(isPublic),
      likesCount: 0,
      createdAt: new Date().toISOString(),
    };

    const saved = await WorkoutRepository.create(newWorkout);
    res.status(201).json({ success: true, message: 'Workout created successfully', data: saved });
  } catch (err: any) {
    logger.error('Error creating workout:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
