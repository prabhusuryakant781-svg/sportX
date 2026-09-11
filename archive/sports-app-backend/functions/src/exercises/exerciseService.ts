import { db } from '../config/firebase';
import { ExerciseDoc, FitnessLevel } from '../types';

export const DEFAULT_EXERCISES: ExerciseDoc[] = [
  {
    id: 'squat',
    name: 'Bodyweight Squat',
    category: 'Lower Body',
    difficulty: 'beginner',
    targetMuscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Core'],
    equipment: 'None',
    instructions: [
      'Stand with feet shoulder-width apart, toes pointing slightly outward.',
      'Engage core and hinge at hips and knees simultaneously.',
      'Lower hips until thighs are at least parallel to the floor.',
      'Drive through heels and midfoot to return to the starting upright position.',
    ],
    commonErrors: [
      'Knees caving inward (knee valgus)',
      'Heels lifting off the ground',
      'Rounding the lower back',
      'Not squatting to parallel depth',
    ],
    formRules: {
      minKneeAngleAtBottom: 90,
      cadenceMinSeconds: 1.2,
      hipKneeAlignmentCheck: true,
    },
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'pushup',
    name: 'Push-up',
    category: 'Upper Body',
    difficulty: 'intermediate',
    targetMuscles: ['Pectorals', 'Triceps', 'Anterior Deltoids', 'Core'],
    equipment: 'None',
    instructions: [
      'Place hands shoulder-width apart on the floor, legs extended behind in a plank.',
      'Keep body in a rigid straight line from heels to crown.',
      'Lower chest until elbows bend to 90 degrees or chest grazes floor.',
      'Push firmly away from floor back to full arm extension without locking elbows.',
    ],
    commonErrors: [
      'Sagging hips / hyperextending lumbar spine',
      'Flaring elbows out at 90 degrees',
      'Incomplete range of motion',
      'Dropping head forward',
    ],
    formRules: {
      minElbowAngleAtBottom: 90,
      cadenceMinSeconds: 1.0,
      spinePlankThreshold: 15,
    },
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'bicep_curl',
    name: 'Bicep Curl',
    category: 'Arms',
    difficulty: 'beginner',
    targetMuscles: ['Biceps Brachii', 'Brachialis', 'Forearms'],
    equipment: 'Dumbbells or Resistance Bands',
    instructions: [
      'Stand upright with weights at your sides, elbows tucked close to torso.',
      'Curl weights upward while rotating forearms until palms face shoulders.',
      'Squeeze biceps at peak contraction for one second.',
      'Lower weights in a slow, controlled eccentric motion to start.',
    ],
    commonErrors: [
      'Swinging torso / using momentum',
      'Elbows drifting forward during the curl',
      'Rushing the lowering (eccentric) phase',
      'Incomplete extension at the bottom',
    ],
    formRules: {
      elbowPositionTolerance: 15,
      cadenceMinSeconds: 1.1,
      peakContractionHoldSeconds: 0.5,
    },
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plank',
    name: 'Forearm Plank',
    category: 'Core',
    difficulty: 'beginner',
    targetMuscles: ['Rectus Abdominis', 'Transverse Abdominis', 'Glutes', 'Shoulders'],
    equipment: 'None',
    instructions: [
      'Place forearms on floor with elbows aligned directly under shoulders.',
      'Extend legs back, resting on toes.',
      'Keep head in neutral alignment, eyes looking at floor.',
      'Maintain continuous tension in abs and glutes, breathing steadily.',
    ],
    commonErrors: [
      'Sagging lower back',
      'Piking hips too high in the air',
      'Holding breath',
      'Head tilting up or sagging down',
    ],
    formRules: {
      hipHeightDisplacementMax: 10,
      minHoldSeconds: 15,
    },
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'lunges',
    name: 'Walking / Alternating Lunges',
    category: 'Lower Body',
    difficulty: 'intermediate',
    targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Calves'],
    equipment: 'None',
    instructions: [
      'Stand tall with feet hip-width apart and hands on hips.',
      'Step forward with right leg and lower hips until both knees bend at 90 degrees.',
      'Ensure front knee remains stacked directly above ankle.',
      'Push through right heel to return to start and repeat on opposite side.',
    ],
    commonErrors: [
      'Front knee extending far past toes',
      'Back knee slamming onto floor',
      'Leaning torso excessively forward',
      'Losing balance due to stepping in a narrow tightrope line',
    ],
    formRules: {
      frontKneeAngleMin: 90,
      cadenceMinSeconds: 1.3,
    },
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export class ExerciseService {
  /**
   * List exercises with optional filters
   */
  static async getExercises(filters?: {
    category?: string;
    difficulty?: FitnessLevel;
    targetMuscle?: string;
  }): Promise<ExerciseDoc[]> {
    let query: FirebaseFirestore.Query = db.collection('exercises').where('isActive', '==', true);

    if (filters?.category) {
      query = query.where('category', '==', filters.category);
    }
    if (filters?.difficulty) {
      query = query.where('difficulty', '==', filters.difficulty);
    }

    const snap = await query.get();
    let exercises = snap.docs.map((d) => d.data() as ExerciseDoc);

    // Fallback to in-memory catalogue if database is unseeded
    if (exercises.length === 0) {
      exercises = DEFAULT_EXERCISES.filter((ex) => {
        if (filters?.category && ex.category !== filters.category) return false;
        if (filters?.difficulty && ex.difficulty !== filters.difficulty) return false;
        return true;
      });
    }

    if (filters?.targetMuscle) {
      const target = filters.targetMuscle.toLowerCase();
      exercises = exercises.filter((ex) =>
        ex.targetMuscles.some((m) => m.toLowerCase().includes(target))
      );
    }

    return exercises;
  }

  /**
   * Get exercise by ID
   */
  static async getExerciseById(id: string): Promise<ExerciseDoc | null> {
    const doc = await db.collection('exercises').doc(id).get();
    if (doc.exists) return doc.data() as ExerciseDoc;

    // Fallback to default catalog
    const found = DEFAULT_EXERCISES.find((e) => e.id === id);
    return found || null;
  }

  /**
   * Upsert an exercise (Admin only)
   */
  static async upsertExercise(exercise: Partial<ExerciseDoc> & { name: string }): Promise<ExerciseDoc> {
    const id = exercise.id || exercise.name.toLowerCase().replace(/\s+/g, '_');
    const exerciseRef = db.collection('exercises').doc(id);

    const now = new Date().toISOString();
    const doc: ExerciseDoc = {
      id,
      name: exercise.name,
      category: exercise.category || 'General',
      difficulty: exercise.difficulty || 'beginner',
      targetMuscles: exercise.targetMuscles || ['Full Body'],
      equipment: exercise.equipment || 'None',
      instructions: exercise.instructions || [],
      commonErrors: exercise.commonErrors || [],
      formRules: exercise.formRules || {},
      isActive: exercise.isActive !== undefined ? exercise.isActive : true,
      createdAt: exercise.createdAt || now,
      updatedAt: now,
    };

    await exerciseRef.set(doc, { merge: true });
    return doc;
  }
}
