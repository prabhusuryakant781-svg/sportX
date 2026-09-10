/**
 * SportX Workout Repository
 * Firestore Data Access for workouts/{workoutId}
 */
import { db } from '../config/firebase';
import { WorkoutPlanDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'workouts';

export const INITIAL_WORKOUTS: WorkoutPlanDoc[] = [
  {
    workoutId: 'dorm_blast_10',
    title: '10-Min Express Dorm Blast',
    description: 'A high-cadence bodyweight routine designed for tight dorm spaces without any equipment.',
    creatorId: 'system',
    sport: 'fitness',
    difficulty: 'beginner',
    targetGoal: 'fitness',
    estimatedDuration: 10,
    estimatedCalories: 85,
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks', targetSets: 2, targetReps: 20, restInterval: 20, order: 1, aiSupported: true },
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 2, targetReps: 10, restInterval: 20, order: 2, aiSupported: true },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 2, targetReps: 8, restInterval: 20, order: 3, aiSupported: true },
    ],
    tags: ['quick', 'dorm', 'no-equipment', 'cardio'],
    isCustom: false,
    isPublic: true,
    likesCount: 142,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'dorm_blast_20',
    title: '20-Min Dorm Room Blast',
    description: 'Balanced full-body routine targeting core stability, lower power, and upper chest strength.',
    creatorId: 'system',
    sport: 'fitness',
    difficulty: 'beginner',
    targetGoal: 'fitness',
    estimatedDuration: 20,
    estimatedCalories: 170,
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 3, targetReps: 12, restInterval: 30, order: 1, aiSupported: true },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 3, targetReps: 10, restInterval: 30, order: 2, aiSupported: true },
      { exerciseId: 'plank', name: 'Core Plank', targetSets: 3, targetHoldSeconds: 45, restInterval: 30, order: 3, aiSupported: true },
    ],
    tags: ['full-body', 'dorm', 'core', 'daily-essential'],
    isCustom: false,
    isPublic: true,
    likesCount: 389,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'strength_30',
    title: '30-Min Strength Builder',
    description: 'Progressive overload training to develop foundational strength in chest, legs, and biceps.',
    creatorId: 'system',
    sport: 'strength',
    difficulty: 'intermediate',
    targetGoal: 'strength',
    estimatedDuration: 30,
    estimatedCalories: 260,
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 4, targetReps: 15, restInterval: 45, order: 1, aiSupported: true },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 4, targetReps: 12, restInterval: 45, order: 2, aiSupported: true },
      { exerciseId: 'bicep_curl', name: 'Bicep Curls', targetSets: 3, targetReps: 12, restInterval: 30, order: 3, aiSupported: true },
      { exerciseId: 'plank', name: 'Core Plank', targetSets: 3, targetHoldSeconds: 60, restInterval: 30, order: 4, aiSupported: true },
    ],
    tags: ['hypertrophy', 'muscle', 'intermediate'],
    isCustom: false,
    isPublic: true,
    likesCount: 512,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'endurance_45',
    title: '45-Min Athletic Endurance Circuit',
    description: 'High volume conditioning circuit built to amplify aerobic stamina and muscular endurance.',
    creatorId: 'system',
    sport: 'athletics',
    difficulty: 'advanced',
    targetGoal: 'endurance',
    estimatedDuration: 45,
    estimatedCalories: 420,
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks', targetSets: 4, targetReps: 30, restInterval: 20, order: 1, aiSupported: true },
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 4, targetReps: 20, restInterval: 30, order: 2, aiSupported: true },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 4, targetReps: 15, restInterval: 30, order: 3, aiSupported: true },
      { exerciseId: 'bicep_curl', name: 'Bicep Curls', targetSets: 3, targetReps: 15, restInterval: 30, order: 4, aiSupported: true },
      { exerciseId: 'plank', name: 'Core Plank', targetSets: 3, targetHoldSeconds: 90, restInterval: 30, order: 5, aiSupported: true },
    ],
    tags: ['endurance', 'cardio', 'advanced', 'sweat'],
    isCustom: false,
    isPublic: true,
    likesCount: 275,
    createdAt: new Date().toISOString(),
  },
];

export class WorkoutRepository {
  static async getAll(filters?: {
    difficulty?: string;
    goal?: string;
    maxDuration?: number;
    sport?: string;
  }): Promise<WorkoutPlanDoc[]> {
    try {
      let query: FirebaseFirestore.Query = db.collection(COLLECTION);
      if (filters?.goal) query = query.where('targetGoal', '==', filters.goal);
      if (filters?.difficulty) query = query.where('difficulty', '==', filters.difficulty);

      const snapshot = await query.get();
      let results: WorkoutPlanDoc[] = [];

      if (snapshot.empty) {
        results = INITIAL_WORKOUTS;
      } else {
        results = snapshot.docs.map((doc) => doc.data() as WorkoutPlanDoc);
      }

      if (filters?.maxDuration) {
        results = results.filter((p) => p.estimatedDuration <= Number(filters.maxDuration));
      }
      if (filters?.goal) {
        results = results.filter((p) => p.targetGoal === filters.goal);
      }

      return results.length > 0 ? results : INITIAL_WORKOUTS;
    } catch (err) {
      logger.error('Error fetching workouts:', err);
      return INITIAL_WORKOUTS;
    }
  }

  static async getById(workoutId: string): Promise<WorkoutPlanDoc | null> {
    try {
      const doc = await db.collection(COLLECTION).doc(workoutId).get();
      if (doc.exists) {
        return doc.data() as WorkoutPlanDoc;
      }
      return INITIAL_WORKOUTS.find((w) => w.workoutId === workoutId) || null;
    } catch (err) {
      return INITIAL_WORKOUTS.find((w) => w.workoutId === workoutId) || null;
    }
  }

  static async create(workout: WorkoutPlanDoc): Promise<WorkoutPlanDoc> {
    await db.collection(COLLECTION).doc(workout.workoutId).set(workout);
    return workout;
  }

  static async seedInitialWorkouts(): Promise<number> {
    const batch = db.batch();
    for (const plan of INITIAL_WORKOUTS) {
      const docRef = db.collection(COLLECTION).doc(plan.workoutId);
      batch.set(docRef, plan, { merge: true });
    }
    await batch.commit();
    return INITIAL_WORKOUTS.length;
  }
}
