/**
 * Workout Plan Routes: GET /workouts, GET /workouts/today
 * Core Features: 12 (Personalized Plan), 13 (Workout Library), 14 (Daily Plan)
 */
import { Router, Response } from 'express';
import { users } from '../config/demoStore';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const workoutsRouter = Router();

export const WORKOUT_PLANS = [
  {
    id: 'dorm_blast_10',
    title: '10-Min Express Dorm Blast',
    targetGoal: 'fitness',
    estimatedDurationMinutes: 10,
    difficulty: 'beginner',
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks', targetSets: 2, targetReps: 20, aiSupported: true, restSeconds: 20 },
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 2, targetReps: 10, aiSupported: true, restSeconds: 20 },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 2, targetReps: 8, aiSupported: true, restSeconds: 20 },
    ],
  },
  {
    id: 'dorm_blast_20',
    title: '20-Min Dorm Room Blast',
    targetGoal: 'fitness',
    estimatedDurationMinutes: 20,
    difficulty: 'beginner',
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 3, targetReps: 12, aiSupported: true, restSeconds: 30 },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 3, targetReps: 10, aiSupported: true, restSeconds: 30 },
      { exerciseId: 'plank', name: 'Core Plank', targetSets: 3, targetDurationSeconds: 45, aiSupported: true, restSeconds: 30 },
    ],
  },
  {
    id: 'strength_30',
    title: '30-Min Strength Builder',
    targetGoal: 'strength',
    estimatedDurationMinutes: 30,
    difficulty: 'intermediate',
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 4, targetReps: 15, aiSupported: true, restSeconds: 45 },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 4, targetReps: 12, aiSupported: true, restSeconds: 45 },
      { exerciseId: 'bicep_curl', name: 'Bicep Curls', targetSets: 3, targetReps: 12, aiSupported: true, restSeconds: 30 },
      { exerciseId: 'plank', name: 'Core Plank', targetSets: 3, targetDurationSeconds: 60, aiSupported: true, restSeconds: 30 },
    ],
  },
  {
    id: 'endurance_45',
    title: '45-Min Athletic Endurance Circuit',
    targetGoal: 'endurance',
    estimatedDurationMinutes: 45,
    difficulty: 'advanced',
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks', targetSets: 4, targetReps: 30, aiSupported: true, restSeconds: 20 },
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 4, targetReps: 20, aiSupported: true, restSeconds: 30 },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 4, targetReps: 15, aiSupported: true, restSeconds: 30 },
      { exerciseId: 'bicep_curl', name: 'Bicep Curls', targetSets: 3, targetReps: 15, aiSupported: true, restSeconds: 30 },
      { exerciseId: 'plank', name: 'Core Plank', targetSets: 3, targetDurationSeconds: 90, aiSupported: true, restSeconds: 30 },
    ],
  },
];

// GET /api/v1/workouts
workoutsRouter.get('/', (req, res) => {
  const { time, goal } = req.query;
  let results = [...WORKOUT_PLANS];
  if (time) results = results.filter(p => p.estimatedDurationMinutes <= Number(time));
  if (goal) results = results.filter(p => p.targetGoal === goal);
  res.status(200).json({ success: true, count: results.length, data: results.length ? results : WORKOUT_PLANS });
});

// GET /api/v1/workouts/today  — personalized pick
workoutsRouter.get('/today', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = users.get(req.user!.uid);
  const time = user?.availableTimeMinutes ?? 20;
  const goal = user?.fitnessGoal ?? 'fitness';

  const matched =
    WORKOUT_PLANS.find(p => p.estimatedDurationMinutes <= time && p.targetGoal === goal) ??
    WORKOUT_PLANS[1];

  res.status(200).json({
    success: true,
    data: {
      ...matched,
      recommendationReason: `Personalized for your ${time}-minute slot and '${goal}' goal.`,
    },
  });
});

// GET /api/v1/workouts/:id
workoutsRouter.get('/:id', (req, res) => {
  const plan = WORKOUT_PLANS.find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Workout plan not found' });
  res.status(200).json({ success: true, data: plan });
});
