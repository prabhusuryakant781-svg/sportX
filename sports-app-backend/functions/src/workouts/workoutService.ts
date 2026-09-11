import { db } from '../config/firebase';
import { WorkoutPlanDoc, FitnessLevel } from '../types';
import { validateWorkoutPlan } from '../middleware/validation';

export const CURATED_WORKOUT_PLANS: WorkoutPlanDoc[] = [
  {
    id: 'dorm_express_15',
    name: '15-Min Dorm Express',
    description: 'Quick, high-intensity bodyweight session designed for small hostel/dorm spaces.',
    goal: 'general_fitness',
    difficulty: 'beginner',
    duration: 15,
    exercises: [
      { exerciseId: 'squat', sets: 3, reps: 15, restSeconds: 45, order: 1 },
      { exerciseId: 'pushup', sets: 3, reps: 10, restSeconds: 45, order: 2 },
      { exerciseId: 'plank', sets: 3, reps: 1, duration: 30, restSeconds: 30, order: 3 },
    ],
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'campus_power_20',
    name: '20-Min Campus Power Circuit',
    description: 'Comprehensive full-body muscle endurance workout for student athletes.',
    goal: 'strength',
    difficulty: 'intermediate',
    duration: 20,
    exercises: [
      { exerciseId: 'squat', sets: 4, reps: 20, restSeconds: 45, order: 1 },
      { exerciseId: 'pushup', sets: 4, reps: 15, restSeconds: 45, order: 2 },
      { exerciseId: 'lunges', sets: 3, reps: 12, restSeconds: 45, order: 3 },
      { exerciseId: 'bicep_curl', sets: 3, reps: 12, restSeconds: 45, order: 4 },
      { exerciseId: 'plank', sets: 3, reps: 1, duration: 45, restSeconds: 30, order: 5 },
    ],
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'athletic_core_leg_25',
    name: '25-Min Athletic Core & Lower Body',
    description: 'Build explosive lower body stamina and core stability for competitive sports.',
    goal: 'athletic_performance',
    difficulty: 'advanced',
    duration: 25,
    exercises: [
      { exerciseId: 'squat', sets: 4, reps: 25, restSeconds: 60, order: 1 },
      { exerciseId: 'lunges', sets: 4, reps: 16, restSeconds: 45, order: 2 },
      { exerciseId: 'plank', sets: 4, reps: 1, duration: 60, restSeconds: 45, order: 3 },
      { exerciseId: 'pushup', sets: 3, reps: 20, restSeconds: 45, order: 4 },
    ],
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export class WorkoutService {
  /**
   * Retrieves workout plans matching user criteria or system defaults
   */
  static async getWorkouts(userId?: string, difficulty?: FitnessLevel): Promise<WorkoutPlanDoc[]> {
    let query: FirebaseFirestore.Query = db.collection('workoutPlans');

    if (difficulty) {
      query = query.where('difficulty', '==', difficulty);
    }

    const snap = await query.get();
    let plans = snap.docs.map((d) => d.data() as WorkoutPlanDoc);

    if (plans.length === 0) {
      plans = CURATED_WORKOUT_PLANS.filter((p) => !difficulty || p.difficulty === difficulty);
    }

    if (userId) {
      // Prioritize user's assigned plans, then public/system plans
      plans = plans.filter((p) => !p.assignedUserId || p.assignedUserId === userId);
    }

    return plans;
  }

  /**
   * Get today's recommended or assigned workout for the user
   */
  static async getTodayWorkout(userId: string): Promise<WorkoutPlanDoc> {
    const userDoc = await db.collection('users').doc(userId).get();
    const fitnessLevel: FitnessLevel = (userDoc.data()?.fitnessLevel as FitnessLevel) || 'beginner';

    // Check for an assigned personal plan
    const assignedSnap = await db
      .collection('workoutPlans')
      .where('assignedUserId', '==', userId)
      .limit(1)
      .get();

    if (!assignedSnap.empty) {
      return assignedSnap.docs[0].data() as WorkoutPlanDoc;
    }

    // Otherwise select the best curated plan matching their fitness level
    const matching = CURATED_WORKOUT_PLANS.find((p) => p.difficulty === fitnessLevel);
    return matching || CURATED_WORKOUT_PLANS[0];
  }

  /**
   * Get workout by ID
   */
  static async getWorkoutById(id: string): Promise<WorkoutPlanDoc | null> {
    const doc = await db.collection('workoutPlans').doc(id).get();
    if (doc.exists) return doc.data() as WorkoutPlanDoc;

    const curated = CURATED_WORKOUT_PLANS.find((p) => p.id === id);
    return curated || null;
  }

  /**
   * Validates and creates a new workout plan
   */
  static async createWorkoutPlan(data: Partial<WorkoutPlanDoc>, creatorId: string): Promise<WorkoutPlanDoc> {
    const validation = validateWorkoutPlan(data as Record<string, unknown>);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Workout plan validation failed');
    }

    const now = new Date().toISOString();
    const id = data.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newPlan: WorkoutPlanDoc = {
      id,
      name: data.name!,
      description: data.description || '',
      goal: data.goal || 'general_fitness',
      difficulty: data.difficulty || 'beginner',
      duration: data.duration || 20,
      exercises: data.exercises!,
      createdBy: creatorId,
      assignedUserId: data.assignedUserId,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('workoutPlans').doc(id).set(newPlan);
    return newPlan;
  }
}
