import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const workoutsRouter = Router();

export const DEFAULT_PLANS = [
  {
    id: 'dorm_quick_15',
    title: '15-Min Dorm Room Blast',
    targetGoal: 'fitness',
    estimatedDurationMinutes: 15,
    difficulty: 'beginner',
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 3, targetReps: 12, aiSupported: true },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 3, targetReps: 10, aiSupported: true },
      { exerciseId: 'plank', name: 'Core Plank', targetSets: 3, targetDurationSeconds: 45, aiSupported: true }
    ],
    createdBy: 'system'
  },
  {
    id: 'campus_strength_30',
    title: '30-Min Campus Strength Builder',
    targetGoal: 'strength',
    estimatedDurationMinutes: 30,
    difficulty: 'intermediate',
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 4, targetReps: 15, aiSupported: true },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 4, targetReps: 12, aiSupported: true },
      { exerciseId: 'bicep_curl', name: 'Bicep Curls', targetSets: 3, targetReps: 12, aiSupported: true },
      { exerciseId: 'plank', name: 'Core Plank', targetSets: 3, targetDurationSeconds: 60, aiSupported: true }
    ],
    createdBy: 'system'
  }
];

// GET /api/v1/workouts
workoutsRouter.get('/', async (req, res) => {
  try {
    const { time, goal } = req.query;
    let results = [...DEFAULT_PLANS];

    if (time) {
      const maxTime = Number(time);
      results = results.filter(p => p.estimatedDurationMinutes <= maxTime);
    }
    if (goal) {
      results = results.filter(p => p.targetGoal === goal);
    }

    res.status(200).json({ success: true, data: results.length ? results : DEFAULT_PLANS });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/workouts/today
workoutsRouter.get('/today', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const userDoc = await db.collection('users').doc(uid!).get();
    const userData = userDoc.data();

    const userTime = userData?.availableTimeMinutes || 20;
    const userGoal = userData?.fitnessGoal || 'fitness';

    // Pick best matching routine
    const matched = DEFAULT_PLANS.find(
      p => p.estimatedDurationMinutes <= userTime && p.targetGoal === userGoal
    ) || DEFAULT_PLANS[0];

    res.status(200).json({
      success: true,
      data: {
        ...matched,
        recommendationReason: `Personalized for your ${userTime}-minute available slot and ${userGoal} goal.`
      }
    });
  } catch (error: any) {
    res.status(200).json({ success: true, data: DEFAULT_PLANS[0] });
  }
});
