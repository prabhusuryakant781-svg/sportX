/**
 * Exercises Routes: GET /exercises, GET /exercises/:id
 * Core Feature: 11 (Exercise Library)
 */
import { Router } from 'express';

export const exercisesRouter = Router();

export const EXERCISES = [
  {
    id: 'squat',
    name: 'Bodyweight Squats',
    category: 'lower_body',
    difficulty: 'beginner',
    targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['none'],
    instructions: [
      'Stand with feet shoulder-width apart, toes slightly outward.',
      'Hinge hips back and bend knees until thighs are parallel to floor.',
      'Drive through heels to return to standing.',
    ],
    commonErrors: ['knees_inward', 'shallow_depth', 'chest_collapse'],
    formRules: { minKneeAngle: 85, maxKneeAngle: 165, cadenceSecondsMin: 1.2 },
    aiSupported: true,
  },
  {
    id: 'pushup',
    name: 'Standard Push-ups',
    category: 'upper_body',
    difficulty: 'intermediate',
    targetMuscles: ['Chest', 'Anterior Deltoids', 'Triceps', 'Core'],
    equipment: ['none'],
    instructions: [
      'Start in a high plank with hands slightly wider than shoulders.',
      'Lower chest until elbows reach 90 degrees.',
      'Push firmly back to top.',
    ],
    commonErrors: ['hip_sag', 'elbow_flare', 'half_rep'],
    formRules: { minElbowAngle: 90, maxElbowAngle: 160, cadenceSecondsMin: 1.0 },
    aiSupported: true,
  },
  {
    id: 'bicep_curl',
    name: 'Bicep Curls',
    category: 'upper_body',
    difficulty: 'beginner',
    targetMuscles: ['Biceps Brachii', 'Forearms'],
    equipment: ['dumbbells', 'resistance_bands'],
    instructions: [
      'Hold weights at sides, palms forward.',
      'Curl weights upward keeping elbows pinned.',
      'Lower with controlled tempo.',
    ],
    commonErrors: ['elbow_swing', 'back_sway'],
    formRules: { minAngle: 40, maxAngle: 155 },
    aiSupported: true,
  },
  {
    id: 'plank',
    name: 'Forearm Core Plank',
    category: 'core',
    difficulty: 'beginner',
    targetMuscles: ['Rectus Abdominis', 'Transverse Abdominis', 'Lower Back'],
    equipment: ['none'],
    instructions: [
      'Rest on forearms and toes, elbows below shoulders.',
      'Hold body in a straight line from head to heels.',
    ],
    commonErrors: ['hip_pike', 'hip_sag'],
    formRules: { spineAngleMin: 170, spineAngleMax: 185 },
    aiSupported: true,
  },
  {
    id: 'jumping_jacks',
    name: 'Jumping Jacks',
    category: 'cardio',
    difficulty: 'beginner',
    targetMuscles: ['Full Body', 'Cardio'],
    equipment: ['none'],
    instructions: [
      'Stand with feet together, arms at sides.',
      'Jump while spreading feet wide and raising arms overhead.',
      'Return to start.',
    ],
    commonErrors: ['arms_not_overhead'],
    formRules: { minArmAngle: 140 },
    aiSupported: true,
  },
];

// GET /api/v1/exercises
exercisesRouter.get('/', (_req, res) => {
  res.status(200).json({ success: true, count: EXERCISES.length, data: EXERCISES });
});

// GET /api/v1/exercises/:id
exercisesRouter.get('/:id', (req, res) => {
  const ex = EXERCISES.find(e => e.id === req.params.id);
  if (!ex) return res.status(404).json({ error: 'Exercise not found' });
  res.status(200).json({ success: true, data: ex });
});
