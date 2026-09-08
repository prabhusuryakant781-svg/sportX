import { Router, Response } from 'express';
import { db } from '../config/firebase';

export const exercisesRouter = Router();

export const DEFAULT_EXERCISES = [
  {
    id: 'squat',
    name: 'Bodyweight Squats',
    category: 'lower_body',
    difficulty: 'beginner',
    targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['none'],
    instructions: [
      'Stand with feet shoulder-width apart, toes pointing slightly outward.',
      'Hinge hips backward and bend knees until thighs are parallel to ground.',
      'Drive through heels to return to standing position.'
    ],
    commonErrors: [
      'knees_inward (Knees caving inwards)',
      'shallow_depth (Hips not reaching 90 degrees)',
      'chest_collapse (Upper body leaning excessively forward)'
    ],
    formRules: {
      minKneeAngle: 85,
      maxKneeAngle: 165,
      cadenceSecondsMin: 1.2
    },
    aiSupported: true
  },
  {
    id: 'pushup',
    name: 'Standard Push-ups',
    category: 'upper_body',
    difficulty: 'intermediate',
    targetMuscles: ['Chest', 'Anterior Deltoids', 'Triceps', 'Core'],
    equipment: ['none'],
    instructions: [
      'Start in a high plank position with hands slightly wider than shoulders.',
      'Lower chest towards floor until elbows form a 90-degree angle.',
      'Push firmly against floor back to top plank.'
    ],
    commonErrors: [
      'hip_sag (Core sagging downward)',
      'elbow_flare (Elbows flaring too wide at 90 deg)',
      'half_rep (Not going all the way down)'
    ],
    formRules: {
      minElbowAngle: 90,
      maxElbowAngle: 160,
      cadenceSecondsMin: 1.0
    },
    aiSupported: true
  },
  {
    id: 'bicep_curl',
    name: 'Bicep Curls',
    category: 'upper_body',
    difficulty: 'beginner',
    targetMuscles: ['Biceps Brachii', 'Forearms'],
    equipment: ['dumbbells', 'resistance_bands'],
    instructions: [
      'Hold weights at sides with palms facing forward.',
      'Curl weights upward while keeping elbows pinned to sides.',
      'Lower weights back down with controlled cadence.'
    ],
    commonErrors: [
      'elbow_swing (Swinging elbows forward)',
      'back_sway (Arching back to generate momentum)'
    ],
    formRules: {
      minAngle: 40,
      maxAngle: 155
    },
    aiSupported: true
  },
  {
    id: 'plank',
    name: 'Forearm Core Plank',
    category: 'core',
    difficulty: 'beginner',
    targetMuscles: ['Rectus Abdominis', 'Transverse Abdominis', 'Lower Back'],
    equipment: ['none', 'mat'],
    instructions: [
      'Rest on forearms and toes with elbows directly below shoulders.',
      'Hold body in a straight line from crown of head to heels.'
    ],
    commonErrors: [
      'hip_pike (Butt raised too high)',
      'hip_sag (Lower back hyperextended)'
    ],
    formRules: {
      spineAngleMin: 170,
      spineAngleMax: 185
    },
    aiSupported: true
  }
];

// GET /api/v1/exercises
exercisesRouter.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('exercises').get();
    if (snapshot.empty) {
      return res.status(200).json({ success: true, data: DEFAULT_EXERCISES });
    }
    const exercises = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, data: exercises });
  } catch (error: any) {
    res.status(200).json({ success: true, data: DEFAULT_EXERCISES });
  }
});

// GET /api/v1/exercises/:id
exercisesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('exercises').doc(id).get();
    if (doc.exists) {
      return res.status(200).json({ success: true, data: { id: doc.id, ...doc.data() } });
    }
    const fallback = DEFAULT_EXERCISES.find(e => e.id === id);
    if (fallback) {
      return res.status(200).json({ success: true, data: fallback });
    }
    res.status(404).json({ error: 'Exercise not found' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
