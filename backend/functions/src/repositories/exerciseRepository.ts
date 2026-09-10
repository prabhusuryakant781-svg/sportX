/**
 * SportX Exercise Repository
 * Firestore Data Access for exercises/{exerciseId}
 */
import { db } from '../config/firebase';
import { ExerciseDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'exercises';

export const INITIAL_EXERCISES: ExerciseDoc[] = [
  {
    exerciseId: 'squat',
    name: 'Bodyweight Squats',
    sportId: 'general',
    description: 'Fundamental lower-body compound movement training quads, glutes, and core stability.',
    targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    secondaryMuscles: ['Core', 'Calves'],
    equipmentNeeded: ['none'],
    difficulty: 'beginner',
    instructions: [
      'Stand with feet shoulder-width apart, toes pointing slightly outwards.',
      'Hinge your hips backwards and bend your knees as if sitting into a chair.',
      'Descend until thighs are parallel to the floor, maintaining an upright chest.',
      'Drive upwards through your heels back to the starting position.',
    ],
    commonErrors: ['Knees caving inwards (valgus collapse)', 'Heels lifting off the floor', 'Rounding the lumbar spine'],
    videoUrl: 'https://assets.sportx.app/exercises/squat.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/squat.json',
    thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500',
    formRules: {
      minKneeAngle: 85,
      maxKneeAngle: 165,
      cadenceSecondsMin: 1.2,
      postureRules: ['Keep spine neutral', 'Knees tracking over toes', 'Do not let heels lift'],
      repConditions: { inflectionPoint: 'bottom', thresholdAngle: 95, completionAngle: 160 },
    },
    calorieFactor: 0.35,
    baseRepXP: 10,
    aiSupported: true,
    category: 'lower_body',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    exerciseId: 'pushup',
    name: 'Standard Push-ups',
    sportId: 'general',
    description: 'Classic horizontal pushing bodyweight exercise targeting chest, triceps, and anterior delts.',
    targetMuscles: ['Chest', 'Anterior Deltoids', 'Triceps'],
    secondaryMuscles: ['Core', 'Serratus Anterior'],
    equipmentNeeded: ['none'],
    difficulty: 'intermediate',
    instructions: [
      'Begin in a high plank position with hands slightly wider than shoulder-width.',
      'Engage your glutes and core to keep your body in a rigid straight line.',
      'Lower your chest until your elbows reach approximately 90 degrees.',
      'Firmly press the ground away and return to the high plank.',
    ],
    commonErrors: ['Sagging hips / anterior pelvic tilt', 'Flaring elbows 90 degrees out', 'Incomplete range of motion'],
    videoUrl: 'https://assets.sportx.app/exercises/pushup.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/pushup.json',
    thumbnail: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=500',
    formRules: {
      minElbowAngle: 85,
      maxElbowAngle: 165,
      cadenceSecondsMin: 1.0,
      postureRules: ['Maintain straight line from head to heels', 'Elbows at 45 degree angle to torso', 'Avoid sagging hips'],
      repConditions: { inflectionPoint: 'bottom', thresholdAngle: 90, completionAngle: 155 },
    },
    calorieFactor: 0.4,
    baseRepXP: 12,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    exerciseId: 'bicep_curl',
    name: 'Bicep Curls',
    sportId: 'general',
    description: 'Isolation pulling exercise designed to strengthen elbow flexors and forearms.',
    targetMuscles: ['Biceps Brachii', 'Brachialis'],
    secondaryMuscles: ['Forearms'],
    equipmentNeeded: ['dumbbells', 'resistance_bands'],
    difficulty: 'beginner',
    instructions: [
      'Stand tall with dumbbells at your sides, palms facing forward.',
      'Keep your elbows pinned close to your torso.',
      'Curl the weights upward towards shoulder level while contracting biceps.',
      'Lower under steady control back to the starting hang.',
    ],
    commonErrors: ['Using momentum / swinging torso', 'Moving elbows forward during flexion', 'Dropping weight without control'],
    videoUrl: 'https://assets.sportx.app/exercises/bicep_curl.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/bicep_curl.json',
    thumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500',
    formRules: {
      minAngle: 40,
      maxAngle: 155,
      cadenceSecondsMin: 1.5,
      postureRules: ['Do not swing your back', 'Keep elbows stationary at sides'],
    },
    calorieFactor: 0.25,
    baseRepXP: 8,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    exerciseId: 'plank',
    name: 'Forearm Core Plank',
    sportId: 'general',
    description: 'Isometric anti-extension core hold strengthening transverse abdominis and lower back.',
    targetMuscles: ['Rectus Abdominis', 'Transverse Abdominis'],
    secondaryMuscles: ['Lower Back', 'Shoulders', 'Glutes'],
    equipmentNeeded: ['none'],
    difficulty: 'beginner',
    instructions: [
      'Plant forearms on the floor with elbows aligned directly under shoulders.',
      'Extend legs straight behind on toes, creating a straight line from crown to heels.',
      'Brace your core tightly, squeeze glutes, and hold steady.',
    ],
    commonErrors: ['Hips sagging towards the floor', 'Piking hips into a teepee shape', 'Holding breath'],
    videoUrl: 'https://assets.sportx.app/exercises/plank.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/plank.json',
    thumbnail: 'https://images.unsplash.com/photo-1566241134883-13eb2393a3cc?w=500',
    formRules: {
      postureRules: ['Do not allow lower back to arch or hips to pike upwards', 'Keep neck in neutral alignment'],
    },
    calorieFactor: 0.15,
    baseRepXP: 15,
    aiSupported: true,
    category: 'core',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    exerciseId: 'jumping_jacks',
    name: 'Jumping Jacks',
    sportId: 'athletics',
    description: 'Full-body cardiovascular calisthenic movement improving aerobic capacity and coordination.',
    targetMuscles: ['Full Body', 'Cardiovascular'],
    secondaryMuscles: ['Calves', 'Deltoids', 'Glutes'],
    equipmentNeeded: ['none'],
    difficulty: 'beginner',
    instructions: [
      'Stand upright with your feet together and arms at your sides.',
      'Jump slightly into the air, spreading your feet wide while clapping arms overhead.',
      'Jump back to the initial starting posture smoothly.',
    ],
    commonErrors: ['Landing flat-footed with heavy impact', 'Arms not reaching overhead', 'Inconsistent pacing'],
    videoUrl: 'https://assets.sportx.app/exercises/jumping_jacks.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/jumping_jacks.json',
    thumbnail: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=500',
    formRules: {
      minAngle: 140,
      cadenceSecondsMin: 0.8,
      postureRules: ['Land softly on balls of feet', 'Maintain steady rhythm'],
    },
    calorieFactor: 0.2,
    baseRepXP: 5,
    aiSupported: true,
    category: 'cardio',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export class ExerciseRepository {
  /**
   * List all exercises with optional query/filters
   */
  static async getAll(filters?: {
    sportId?: string;
    difficulty?: string;
    targetMuscle?: string;
  }): Promise<ExerciseDoc[]> {
    try {
      let query: FirebaseFirestore.Query = db.collection(COLLECTION);

      if (filters?.sportId) {
        query = query.where('sportId', '==', filters.sportId);
      }
      if (filters?.difficulty) {
        query = query.where('difficulty', '==', filters.difficulty);
      }

      const snapshot = await query.get();
      if (snapshot.empty) {
        // Fallback to initial exercises
        let list = INITIAL_EXERCISES;
        if (filters?.sportId) list = list.filter((e) => e.sportId === filters.sportId);
        if (filters?.difficulty) list = list.filter((e) => e.difficulty === filters.difficulty);
        return list;
      }

      return snapshot.docs.map((doc) => doc.data() as ExerciseDoc);
    } catch (err) {
      logger.error('Error fetching exercises:', err);
      return INITIAL_EXERCISES;
    }
  }

  /**
   * Get exercise by ID
   */
  static async getById(exerciseId: string): Promise<ExerciseDoc | null> {
    try {
      const docSnap = await db.collection(COLLECTION).doc(exerciseId).get();
      if (docSnap.exists) {
        return docSnap.data() as ExerciseDoc;
      }
      const initial = INITIAL_EXERCISES.find((e) => e.exerciseId === exerciseId);
      return initial || null;
    } catch (err) {
      logger.error(`Error fetching exercise ${exerciseId}:`, err);
      return INITIAL_EXERCISES.find((e) => e.exerciseId === exerciseId) || null;
    }
  }

  /**
   * Seed or insert exercise
   */
  static async set(exercise: ExerciseDoc): Promise<void> {
    await db.collection(COLLECTION).doc(exercise.exerciseId).set(exercise, { merge: true });
  }

  /**
   * Seed all initial exercises into Firestore if empty
   */
  static async seedInitialExercises(): Promise<number> {
    const batch = db.batch();
    for (const ex of INITIAL_EXERCISES) {
      const docRef = db.collection(COLLECTION).doc(ex.exerciseId);
      batch.set(docRef, ex, { merge: true });
    }
    await batch.commit();
    return INITIAL_EXERCISES.length;
  }
}
