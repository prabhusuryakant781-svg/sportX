import { buildAICoachContext } from './contextBuilder';
import { db } from '../config/firebase';

export interface GeneratedWorkoutPlan {
  title: string;
  targetGoal: string;
  estimatedDurationMinutes: number;
  difficulty: string;
  exercises: {
    exerciseId: string;
    name: string;
    targetSets: number;
    targetReps?: number;
    targetDurationSeconds?: number;
    aiSupported: boolean;
    restSeconds: number;
  }[];
  coachingTip: string;
}

/**
 * Validates AI-generated workout plan before persisting to Firestore
 * as mandated in "Important Rules" (Rule: Validate AI-generated workout plans before storing them).
 */
export function validateWorkoutPlan(plan: any): boolean {
  if (!plan || typeof plan !== 'object') return false;
  if (!plan.title || typeof plan.title !== 'string') return false;
  if (!plan.estimatedDurationMinutes || plan.estimatedDurationMinutes < 5 || plan.estimatedDurationMinutes > 90) return false;
  if (!Array.isArray(plan.exercises) || plan.exercises.length === 0) return false;

  for (const ex of plan.exercises) {
    if (!ex.exerciseId || !ex.targetSets || ex.targetSets < 1) return false;
  }
  return true;
}

/**
 * Generates an adaptive, highly customized workout routine for students
 */
export async function generateAdaptiveWorkout(userId: string): Promise<GeneratedWorkoutPlan> {
  const context = await buildAICoachContext(userId);

  let exercises = [];
  if (context.goal === 'strength') {
    exercises = [
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 4, targetReps: 15, aiSupported: true, restSeconds: 45 },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 4, targetReps: 12, aiSupported: true, restSeconds: 45 },
      { exerciseId: 'bicep_curl', name: 'Bicep Curls', targetSets: 3, targetReps: 12, aiSupported: true, restSeconds: 30 }
    ];
  } else {
    exercises = [
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 3, targetReps: 12, aiSupported: true, restSeconds: 30 },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 3, targetReps: 10, aiSupported: true, restSeconds: 30 },
      { exerciseId: 'plank', name: 'Core Forearm Plank', targetSets: 3, targetDurationSeconds: 45, aiSupported: true, restSeconds: 30 }
    ];
  }

  // Adjust reps if recent performance was outstanding (>90% form score)
  if (context.averageFormScore >= 90) {
    exercises = exercises.map(ex => ({
      ...ex,
      targetReps: ex.targetReps ? ex.targetReps + 2 : undefined
    }));
  }

  const plan: GeneratedWorkoutPlan = {
    title: `${context.availableTimeMinutes}-Min Adaptive ${context.goal.toUpperCase()} Routine`,
    targetGoal: context.goal,
    estimatedDurationMinutes: context.availableTimeMinutes,
    difficulty: context.fitnessLevel,
    exercises,
    coachingTip: context.commonErrors.includes('knees_inward')
      ? 'Focus Cue: Drive knees slightly outward in line with your toes during squats today!'
      : 'Maintain steady breathing and keep your core braced.'
  };

  // Validate plan structure
  if (!validateWorkoutPlan(plan)) {
    throw new Error('AI Workout Plan failed validation checks');
  }

  // Persist to user's personalized workout collection
  await db.collection('workoutPlans').add({
    ...plan,
    userId,
    createdAt: new Date().toISOString(),
    createdBy: 'ai_coach'
  });

  return plan;
}
