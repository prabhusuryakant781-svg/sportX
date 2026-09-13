/**
 * SportX AI Coach — Personalized Workout Generator (Phase 4)
 * Generates custom, scientifically tailored workout routines based on:
 * - Fitness level & goals
 * - Selected sport & available time
 * - Workout history & recent performance
 * - Previous biomechanical form issues from Computer Vision
 * 
 * Rules:
 * 1. Validate every AI-generated workout before saving (exercise exists, sets/reps valid, duration valid).
 * 2. Never blindly save unvalidated AI plans.
 * 3. Incorporate detected form flaws into warmup/cues.
 * 4. Ground exercises strictly in the SportX exercise catalog.
 * 5. Accurately indicate computer vision camera support (squat, pushup, jumping_jacks).
 */

import { buildCoachContext, CoachUserContext } from './contextBuilder';
import { db, hasFirebaseCredentials } from '../config/firebase';
import { demoWorkoutPlans } from '../config/demoStore';
import * as logger from 'firebase-functions/logger';

export interface WorkoutExerciseItem {
  exerciseId: string;
  name?: string;
  sets: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds?: number;
  cue?: string;
  order?: number;
  section?: 'warmup' | 'main' | 'cooldown';
  aiSupported?: boolean;
  // Compatibility aliases
  targetSets?: number;
  targetReps?: number;
  targetHoldSeconds?: number;
  restInterval?: number;
}

export interface GeneratedWorkout {
  workoutName: string;
  title?: string; // Compatibility alias
  duration: number; // minutes
  estimatedDuration?: number; // Compatibility alias
  estimatedDurationMinutes?: number; // Compatibility alias
  exercises: WorkoutExerciseItem[];
  targetGoal?: string;
  difficulty?: string;
  sport?: string;
  focusCue?: string;
  warmup?: string;
  cooldown?: string;
  id?: string;
  createdAt?: string;
  userId?: string;
}

export interface WorkoutValidationResult {
  isValid: boolean;
  data?: GeneratedWorkout;
  errors: string[];
}

/**
 * Real-time MediaPipe computer-vision camera supported exercises in SportX.
 */
export const CAMERA_TRACKED_EXERCISES = new Set<string>([
  'squat',
  'pushup',
  'jumping_jacks'
]);

/**
 * Canonical exercise alias map to resolve singular/plural and hyphenated variants.
 */
export const EXERCISE_ALIASES: Record<string, string> = {
  lunge: 'lunges',
  lunges: 'lunges',
  walking_lunges: 'lunges',
  burpee: 'burpees',
  burpees: 'burpees',
  squat: 'squat',
  squats: 'squat',
  bodyweight_squat: 'squat',
  bodyweight_squats: 'squat',
  pushup: 'pushup',
  pushups: 'pushup',
  push_up: 'pushup',
  push_ups: 'pushup',
  jumping_jack: 'jumping_jacks',
  jumping_jacks: 'jumping_jacks',
  jumpingjack: 'jumping_jacks',
  jumpingjacks: 'jumping_jacks',
  plank: 'plank',
  plank_hold: 'plank',
  forearm_plank: 'plank',
  bicep_curl: 'bicep_curl',
  bicep_curls: 'bicep_curl',
  glute_bridge: 'glute_bridge',
  calf_raise: 'calf_raise',
  calf_raises: 'calf_raise',
  high_knees: 'high_knees',
  high_knee: 'high_knees',
  mountain_climber: 'mountain_climbers',
  mountain_climbers: 'mountain_climbers',
  reverse_lunge: 'lunge',
  reverse_lunges: 'reverse_lunges',
  jump_squat: 'jump_squats',
  jump_squats: 'jump_squats',
  wall_sit: 'wall_sit',
  side_plank: 'side_plank',
  situp: 'situps',
  situps: 'situps',
  crunch: 'crunches',
  crunches: 'crunches',
  leg_raise: 'leg_raises',
  leg_raises: 'leg_raises',
  russian_twist: 'russian_twist',
  superman_hold: 'superman_hold',
  shoulder_press: 'shoulder_press',
  overhead_press: 'shoulder_press',
  dumbbell_overhead_press: 'shoulder_press',
  dumbbell_shoulder_press: 'shoulder_press',
  worlds_greatest_stretch: 'worlds_greatest_stretch',
  cat_cow: 'cat_cow',
  hip_flexor_stretch: 'hip_flexor_stretch',
  downward_dog: 'downward_dog'
};

/**
 * Valid exercise catalog verified against SportX exercise database.
 */
export const VALID_EXERCISE_IDS = new Set<string>([
  'squat',
  'pushup',
  'bicep_curl',
  'plank',
  'jumping_jacks',
  'lunge',
  'lunges',
  'reverse_lunges',
  'glute_bridge',
  'calf_raise',
  'high_knees',
  'mountain_climbers',
  'shoulder_press',
  'lateral_raise',
  'front_raise',
  'hammer_curl',
  'tricep_extension',
  'tricep_kickback',
  'tricep_dips',
  'bent_over_row',
  'chest_press',
  'situps',
  'crunches',
  'leg_raises',
  'bicycle_crunches',
  'side_lunge',
  'side_plank',
  'russian_twist',
  'deadlift_bodyweight',
  'wide_pushup',
  'diamond_pushup',
  'incline_pushup',
  'pullup',
  'superman_hold',
  'pike_pushup',
  'bulgarian_split_squat',
  'jump_squats',
  'wall_sit',
  'burpee',
  'burpees',
  'outdoor_run',
  'campus_jog',
  'sprint_intervals',
  'brisk_walk',
  'worlds_greatest_stretch',
  'cat_cow',
  'hip_flexor_stretch',
  'thoracic_rotation',
  'downward_dog'
]);

export const EXERCISE_NAMES: Record<string, string> = {
  squat: 'Bodyweight Squats',
  pushup: 'Standard Push-ups',
  bicep_curl: 'Dumbbell / Resistance Bicep Curls',
  plank: 'Core Forearm Plank',
  jumping_jacks: 'Jumping Jacks',
  lunge: 'Walking Lunges',
  lunges: 'Forward Walking Lunges',
  reverse_lunges: 'Reverse Lunges',
  glute_bridge: 'Floor Glute Bridges',
  calf_raise: 'Standing Calf Raises',
  high_knees: 'High Knees Running',
  mountain_climbers: 'Mountain Climbers',
  shoulder_press: 'Overhead Shoulder Press',
  jump_squats: 'Explosive Jump Squats',
  wall_sit: 'Wall Sit Isometric Hold',
  burpee: 'Full Body Burpees',
  burpees: 'Full Body Burpees',
  side_plank: 'Side Plank Stability Hold',
  situps: 'Standard Floor Sit-ups',
  crunches: 'Abdominal Crunches',
  leg_raises: 'Lying Leg Raises',
  russian_twist: 'Rotational Russian Twists',
  superman_hold: 'Superman Back Extension Hold',
  worlds_greatest_stretch: "The World's Greatest Stretch",
  cat_cow: 'Cat-Cow Spinal Waves',
  hip_flexor_stretch: 'Half-Kneeling Hip Flexor Stretch',
  downward_dog: 'Downward Dog to Cobra Flow'
};

/**
 * Normalizes an exercise identifier to its canonical SportX ID.
 */
export function normalizeExerciseId(rawId: string): string {
  const clean = String(rawId || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return EXERCISE_ALIASES[clean] || clean;
}

/**
 * Selects a valid fallback exercise from the SportX library when an AI suggests
 * an unavailable exercise that has no canonical equivalent in SportX.
 * Preserves movement pattern and never invents fake camera support.
 */
export function selectValidLibraryExerciseFallback(
  rawId: string,
  section?: string,
  existingIds: Set<string> = new Set()
): string {
  const normalized = String(rawId || '').toLowerCase().replace(/[\s-]+/g, '_');

  // Upper body pushing / deltoids / chest
  if (
    normalized.includes('press') ||
    normalized.includes('push') ||
    normalized.includes('chest') ||
    normalized.includes('dip') ||
    normalized.includes('delt')
  ) {
    const candidates = ['shoulder_press', 'pushup', 'wide_pushup', 'diamond_pushup'];
    const chosen = candidates.find(c => !existingIds.has(c));
    if (chosen) return chosen;
  }

  // Upper body pulling / biceps / back
  if (
    normalized.includes('pull') ||
    normalized.includes('row') ||
    normalized.includes('curl') ||
    normalized.includes('back') ||
    normalized.includes('lat')
  ) {
    const candidates = ['bicep_curl', 'bent_over_row', 'superman_hold'];
    const chosen = candidates.find(c => !existingIds.has(c));
    if (chosen) return chosen;
  }

  // Lower body (quads, hamstrings, glutes, calves)
  if (
    normalized.includes('squat') ||
    normalized.includes('leg') ||
    normalized.includes('quad') ||
    normalized.includes('lunge') ||
    normalized.includes('calf') ||
    normalized.includes('glute')
  ) {
    const candidates = ['squat', 'lunge', 'glute_bridge', 'calf_raise', 'jump_squats'];
    const chosen = candidates.find(c => !existingIds.has(c));
    if (chosen) return chosen;
  }

  // Core / Abs
  if (
    normalized.includes('plank') ||
    normalized.includes('abs') ||
    normalized.includes('core') ||
    normalized.includes('twist') ||
    normalized.includes('situp') ||
    normalized.includes('crunch')
  ) {
    const candidates = ['plank', 'crunches', 'situps', 'russian_twist', 'side_plank'];
    const chosen = candidates.find(c => !existingIds.has(c));
    if (chosen) return chosen;
  }

  // Warmup / Cardio
  if (
    section === 'warmup' ||
    normalized.includes('warm') ||
    normalized.includes('cardio') ||
    normalized.includes('jump') ||
    normalized.includes('run') ||
    normalized.includes('jack')
  ) {
    const candidates = ['jumping_jacks', 'high_knees', 'mountain_climbers'];
    const chosen = candidates.find(c => !existingIds.has(c));
    if (chosen) return chosen;
  }

  // Cooldown / Mobility
  if (
    section === 'cooldown' ||
    normalized.includes('stretch') ||
    normalized.includes('cool') ||
    normalized.includes('mobility') ||
    normalized.includes('yoga')
  ) {
    const candidates = ['cat_cow', 'worlds_greatest_stretch', 'hip_flexor_stretch', 'downward_dog'];
    const chosen = candidates.find(c => !existingIds.has(c));
    if (chosen) return chosen;
  }

  // General safe fallback from verified SportX library
  const safeFallbacks = ['squat', 'pushup', 'plank', 'jumping_jacks', 'lunge', 'bicep_curl'];
  return safeFallbacks.find(c => !existingIds.has(c)) || 'squat';
}

/**
 * Grounds AI workout generation strictly in the SportX exercise catalog:
 * AI suggestion
 * → Normalize/resolve exercise
 * → Check against SportX exercise library
 * → Use canonical exercise ID
 * → If unavailable, replace with a valid existing exercise
 * → Validate final workout
 * → Return workout
 */
export function groundAIWorkoutPlan(rawPlan: any): any {
  if (!rawPlan || typeof rawPlan !== 'object') return rawPlan;
  if (!Array.isArray(rawPlan.exercises)) return rawPlan;

  // 1. Clean & clamp workout duration (must be integer between 5 and 120)
  const rawDur = rawPlan.duration ?? rawPlan.estimatedDurationMinutes ?? rawPlan.estimatedDuration ?? 20;
  const numDur = Math.round(Number(String(rawDur).replace(/[^\d.]/g, '')) || 20);
  rawPlan.duration = Math.min(120, Math.max(5, numDur));
  rawPlan.estimatedDuration = rawPlan.duration;
  rawPlan.estimatedDurationMinutes = rawPlan.duration;

  // 2. Ensure non-empty workoutName / title
  rawPlan.workoutName = String(rawPlan.workoutName || rawPlan.title || 'Personalized Workout Plan').trim();
  rawPlan.title = rawPlan.workoutName;

  const existingIds = new Set<string>();

  rawPlan.exercises = rawPlan.exercises.map((ex: any, idx: number) => {
    if (!ex || typeof ex !== 'object') return ex;
    const rawId = String(ex.exerciseId || '').trim().toLowerCase();
    let cleanId = normalizeExerciseId(rawId);

    // Check against SportX canonical exercise library
    if (!VALID_EXERCISE_IDS.has(cleanId)) {
      // Exercise does NOT exist in SportX catalog:
      // Ground to a valid library exercise matching section/movement pattern
      cleanId = selectValidLibraryExerciseFallback(rawId, ex.section, existingIds);
      ex.name = EXERCISE_NAMES[cleanId] || cleanId.replace(/_/g, ' ');
    } else {
      if (!ex.name || ex.name === rawId) {
        ex.name = EXERCISE_NAMES[cleanId] || ex.name || cleanId.replace(/_/g, ' ');
      }
    }

    existingIds.add(cleanId);
    ex.exerciseId = cleanId;
    // Set AI camera support STRICTLY based on genuine MediaPipe tracking (squat, pushup, jumping_jacks)
    ex.aiSupported = CAMERA_TRACKED_EXERCISES.has(cleanId);

    // Ensure sets is a clean integer between 1 and 10
    const rawSets = ex.sets ?? ex.targetSets ?? 3;
    const numSets = Math.round(Number(String(rawSets).replace(/[^\d.]/g, '')) || 3);
    ex.sets = Math.min(10, Math.max(1, numSets));
    ex.targetSets = ex.sets;

    // Ensure reps / durationSeconds are clean numbers
    if (ex.durationSeconds !== undefined || ex.targetHoldSeconds !== undefined) {
      const rawSec = ex.durationSeconds ?? ex.targetHoldSeconds;
      const numSec = Math.round(Number(String(rawSec).replace(/[^\d.]/g, '')) || 30);
      ex.durationSeconds = Math.min(600, Math.max(5, numSec));
      ex.targetHoldSeconds = ex.durationSeconds;
    } else {
      const rawReps = ex.reps ?? ex.targetReps ?? 12;
      const numReps = Math.round(Number(String(rawReps).replace(/[^\d.]/g, '')) || 12);
      ex.reps = Math.min(100, Math.max(1, numReps));
      ex.targetReps = ex.reps;
    }

    // Ensure restSeconds is a clean number
    const rawRest = ex.restSeconds ?? ex.restInterval ?? 35;
    const numRest = Math.round(Number(String(rawRest).replace(/[^\d.]/g, '')) || 35);
    ex.restSeconds = Math.min(300, Math.max(0, numRest));
    ex.restInterval = ex.restSeconds;

    // Ensure order is positive integer
    ex.order = Math.max(1, Math.round(Number(ex.order || idx + 1)));

    return ex;
  });

  return rawPlan;
}

/**
 * Validates an AI-generated workout plan against SportX rules before saving.
 */
export function validateWorkout(raw: unknown): WorkoutValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      isValid: false,
      errors: ['Workout plan must be a non-null JSON object']
    };
  }

  const obj = raw as Record<string, any>;

  // 1. Validate workoutName (or title)
  const name = obj.workoutName || obj.title;
  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    errors.push('Field "workoutName" is required and must be at least 3 characters long');
  }

  // 2. Validate duration (estimated duration in minutes)
  let duration = obj.duration ?? obj.estimatedDurationMinutes ?? obj.estimatedDuration;
  if (typeof duration === 'string') {
    const parsed = Number(duration);
    if (!Number.isNaN(parsed)) duration = parsed;
  }
  if (typeof duration !== 'number' || !Number.isInteger(duration) || duration < 5 || duration > 120) {
    errors.push('Field "duration" is required and must be an integer between 5 and 120 minutes');
  }

  // 3. Validate exercises array
  if (!Array.isArray(obj.exercises) || obj.exercises.length === 0) {
    errors.push('Field "exercises" is required and must contain at least one exercise');
  } else if (obj.exercises.length > 10) {
    errors.push('Field "exercises" cannot exceed 10 exercises per session');
  } else {
    for (let i = 0; i < obj.exercises.length; i++) {
      const ex = obj.exercises[i];
      if (!ex || typeof ex !== 'object') {
        errors.push(`Exercise at index ${i} must be an object`);
        continue;
      }

      // Validate exerciseId
      if (!ex.exerciseId || typeof ex.exerciseId !== 'string') {
        errors.push(`Exercise at index ${i} is missing a valid "exerciseId"`);
      } else {
        const cleanId = normalizeExerciseId(ex.exerciseId);
        if (!VALID_EXERCISE_IDS.has(cleanId) && !VALID_EXERCISE_IDS.has(ex.exerciseId.trim().toLowerCase())) {
          errors.push(`Exercise at index ${i} has unrecognized exerciseId "${ex.exerciseId}".`);
        }
      }

      // Validate sets (targetSets or sets)
      let sets = ex.sets ?? ex.targetSets;
      if (typeof sets === 'string') {
        const parsed = Number(sets);
        if (!Number.isNaN(parsed)) sets = parsed;
      }
      if (typeof sets !== 'number' || !Number.isInteger(sets) || sets < 1 || sets > 10) {
        errors.push(`Exercise at index ${i} ("${ex.exerciseId || i}") must specify "sets" between 1 and 10`);
      }

      // Validate reps or durationSeconds
      let reps = ex.reps ?? ex.targetReps;
      if (typeof reps === 'string') {
        const parsed = Number(reps);
        if (!Number.isNaN(parsed)) reps = parsed;
      }
      let durationSeconds = ex.durationSeconds ?? ex.targetDurationSeconds ?? ex.targetHoldSeconds;
      if (typeof durationSeconds === 'string') {
        const parsed = Number(durationSeconds);
        if (!Number.isNaN(parsed)) durationSeconds = parsed;
      }

      if (reps === undefined && durationSeconds === undefined) {
        errors.push(`Exercise at index ${i} ("${ex.exerciseId || i}") must specify either "reps" or "durationSeconds"`);
      } else {
        if (reps !== undefined && (typeof reps !== 'number' || !Number.isInteger(reps) || reps < 1 || reps > 100)) {
          errors.push(`Exercise at index ${i} ("${ex.exerciseId || i}") reps must be an integer between 1 and 100`);
        }
        if (durationSeconds !== undefined && (typeof durationSeconds !== 'number' || durationSeconds < 5 || durationSeconds > 600)) {
          errors.push(`Exercise at index ${i} ("${ex.exerciseId || i}") durationSeconds must be between 5 and 600 seconds`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  const validatedExercises: WorkoutExerciseItem[] = obj.exercises.map((ex: any, idx: number) => {
    const rawId = String(ex.exerciseId).trim().toLowerCase();
    const cleanId = normalizeExerciseId(rawId);
    const sets = Number(ex.sets ?? ex.targetSets ?? 3);
    const reps = ex.reps !== undefined || ex.targetReps !== undefined ? Number(ex.reps ?? ex.targetReps) : undefined;
    const durationSeconds = ex.durationSeconds ?? ex.targetDurationSeconds ?? ex.targetHoldSeconds ? Number(ex.durationSeconds ?? ex.targetDurationSeconds ?? ex.targetHoldSeconds) : undefined;
    const restSeconds = Number(ex.restSeconds ?? ex.restInterval ?? 30);
    const isCamera = CAMERA_TRACKED_EXERCISES.has(cleanId) || CAMERA_TRACKED_EXERCISES.has(rawId);

    return {
      exerciseId: cleanId,
      name: ex.name || EXERCISE_NAMES[cleanId] || EXERCISE_NAMES[rawId] || cleanId.replace(/_/g, ' '),
      sets,
      targetSets: sets,
      ...(reps !== undefined ? { reps, targetReps: reps } : {}),
      ...(durationSeconds !== undefined ? { durationSeconds, targetHoldSeconds: durationSeconds } : {}),
      restSeconds,
      restInterval: restSeconds,
      order: ex.order ?? (idx + 1),
      section: ex.section || (idx === 0 ? 'warmup' : (idx === obj.exercises.length - 1 ? 'cooldown' : 'main')),
      aiSupported: isCamera,
      ...(ex.cue ? { cue: String(ex.cue).trim() } : {})
    };
  });

  const durationNum = Number(duration);
  const validatedPlan: GeneratedWorkout = {
    workoutName: String(name).trim(),
    title: String(name).trim(),
    duration: durationNum,
    estimatedDuration: durationNum,
    estimatedDurationMinutes: durationNum,
    exercises: validatedExercises,
    targetGoal: obj.targetGoal ? String(obj.targetGoal).trim() : 'fitness',
    difficulty: obj.difficulty ? String(obj.difficulty).trim() : 'beginner',
    sport: obj.sport ? String(obj.sport).trim() : 'general_fitness',
    focusCue: obj.focusCue || obj.coachingTip || 'Focus on controlled tempo and steady breathing throughout each set.',
    warmup: obj.warmup || '3-5 minutes dynamic mobility: arm circles, gentle leg swings, and breathing.',
    cooldown: obj.cooldown || '3-5 minutes static recovery: hamstring reach, quad stretch, and chest opener.'
  };

  return {
    isValid: true,
    data: validatedPlan,
    errors: []
  };
}

/**
 * Deterministic adaptive intelligence generator matching:
 * - Fitness level (beginner, intermediate, pro / advanced)
 * - Selected sport (badminton, football, basketball, cricket, running, table_tennis, general)
 * - User goals (strength, endurance, fitness, weight_management, sport_performance)
 * - Previous performance & biomechanical flaws
 * - Session duration (10, 15, 20, 30, 45 mins)
 */
export function generateLocalAdaptiveWorkout(
  context: CoachUserContext,
  requestedDuration?: number,
  requestedGoal?: string,
  requestedSport?: string
): GeneratedWorkout {
  const rawGoal = (requestedGoal || context.user.goal || 'fitness').toLowerCase();
  const rawSport = (requestedSport || context.user.sport || 'general_fitness').toLowerCase();
  const rawLevel = (context.user.fitnessLevel || 'intermediate').toLowerCase();

  // Normalize level: 'beginner', 'intermediate', 'pro'
  const isBeginner = rawLevel === 'beginner';
  const isPro = rawLevel === 'pro' || rawLevel === 'advanced';
  const difficulty = isBeginner ? 'beginner' : isPro ? 'pro' : 'intermediate';

  // Duration in minutes (clamped between 5 and 120, defaulting to context or 20)
  const rawReq = requestedDuration ? Number(requestedDuration) : undefined;
  const rawCtx = context.availableTimeMinutes ? Number(context.availableTimeMinutes) : undefined;
  const initialDur = (rawReq && !Number.isNaN(rawReq) && rawReq >= 5)
    ? rawReq
    : ((rawCtx && !Number.isNaN(rawCtx) && rawCtx >= 5) ? rawCtx : 20);
  const duration = Math.min(120, Math.max(5, Math.round(initialDur)));

  // Form error from previous session telemetry
  const formIssue = context.recentIssues.find(i => i.startsWith('error_'));
  const cleanFormError = formIssue ? formIssue.replace('error_', '').replace(/_/g, ' ') : '';

  // Volume parameters per level
  const setMultiplier = isBeginner ? 2 : isPro ? 4 : 3;
  const repModifier = isBeginner ? 0.8 : isPro ? 1.3 : 1.0;
  const restSec = isBeginner ? 45 : isPro ? 25 : 35;

  // Build sport-specific exercise templates prioritizing camera-supported exercises
  interface ExerciseTemplate {
    id: string;
    name: string;
    baseReps?: number;
    baseHold?: number;
    section: 'warmup' | 'main' | 'cooldown';
    cue?: string;
  }

  let candidates: ExerciseTemplate[] = [];

  if (rawSport.includes('badminton') || rawSport.includes('racquet')) {
    candidates = [
      { id: 'jumping_jacks', name: 'Jumping Jacks', baseReps: 25, section: 'warmup', cue: 'Elevate heart rate and warm up shoulder/ankle elasticity.' },
      { id: 'squat', name: 'Bodyweight Squats', baseReps: 12, section: 'main', cue: formIssue?.includes('knees') ? 'Drive knees outward over toes during descent.' : 'Develop lower body power for deep court lunges.' },
      { id: 'lunges', name: 'Forward Walking Lunges', baseReps: 10, section: 'main', cue: 'Absorb landing through heel and maintain upright torso.' },
      { id: 'calf_raise', name: 'Standing Calf Raises', baseReps: 15, section: 'main', cue: 'Strengthen Achilles tendon reactivity for rapid split-steps.' },
      { id: 'plank', name: 'Core Forearm Plank', baseHold: 40, section: 'main', cue: 'Brace core to stabilize rapid change-of-direction movements.' },
      { id: 'worlds_greatest_stretch', name: "The World's Greatest Stretch", baseReps: 6, section: 'cooldown', cue: 'Restore hip flexor and thoracic rotational mobility.' }
    ];
  } else if (rawSport.includes('football') || rawSport.includes('soccer')) {
    candidates = [
      { id: 'high_knees', name: 'High Knees Running', baseReps: 25, section: 'warmup', cue: 'Drive knees to hip height for running mechanics.' },
      { id: 'squat', name: 'Bodyweight Squats', baseReps: 15, section: 'main', cue: formIssue?.includes('knees') ? 'Keep knees tracking directly over toes.' : 'Drive through heels for sprint acceleration power.' },
      { id: 'pushup', name: 'Standard Push-ups', baseReps: 12, section: 'main', cue: formIssue?.includes('sagging') ? 'Keep hips level and glutes locked.' : 'Shield opponent strength and upper-body resilience.' },
      { id: 'mountain_climbers', name: 'Mountain Climbers', baseReps: 20, section: 'main', cue: 'Maintain steady sprint rhythm and core tightness.' },
      { id: 'plank', name: 'Core Forearm Plank', baseHold: 45, section: 'main', cue: 'Build anti-extension endurance for 90-minute pitch conditioning.' },
      { id: 'hip_flexor_stretch', name: 'Half-Kneeling Hip Flexor Stretch', baseReps: 8, section: 'cooldown', cue: 'Release tight hips after intense kicking and sprinting.' }
    ];
  } else if (rawSport.includes('basketball')) {
    candidates = [
      { id: 'jumping_jacks', name: 'Jumping Jacks', baseReps: 25, section: 'warmup', cue: 'Activate calves and prep shoulders for rebounding.' },
      { id: 'jump_squats', name: 'Explosive Jump Squats', baseReps: 10, section: 'main', cue: 'Land softly on balls of feet with knees bent.' },
      { id: 'pushup', name: 'Standard Push-ups', baseReps: 12, section: 'main', cue: 'Build chest and triceps strength for physical defense.' },
      { id: 'squat', name: 'Bodyweight Squats', baseReps: 15, section: 'main', cue: 'Reinforce deep squat power for vertical leap propulsion.' },
      { id: 'calf_raise', name: 'Standing Calf Raises', baseReps: 16, section: 'main', cue: 'Elevate ankle stiffness for first-step quickness.' },
      { id: 'cat_cow', name: 'Cat-Cow Spinal Waves', baseReps: 8, section: 'cooldown', cue: 'Decompress lumbar spine after high-impact jumping.' }
    ];
  } else if (rawSport.includes('cricket')) {
    candidates = [
      { id: 'jumping_jacks', name: 'Jumping Jacks', baseReps: 20, section: 'warmup', cue: 'Warm up shoulder girdle and calves.' },
      { id: 'pushup', name: 'Standard Push-ups', baseReps: 12, section: 'main', cue: 'Strengthen chest and shoulders for throwing velocity.' },
      { id: 'lunges', name: 'Forward Walking Lunges', baseReps: 10, section: 'main', cue: 'Unilateral deceleration power for bowling follow-through.' },
      { id: 'squat', name: 'Bodyweight Squats', baseReps: 14, section: 'main', cue: 'Build batting stance stamina and lower-body stability.' },
      { id: 'russian_twist', name: 'Rotational Russian Twists', baseReps: 16, section: 'main', cue: 'Rotational core power for explosive batting shots.' },
      { id: 'worlds_greatest_stretch', name: "The World's Greatest Stretch", baseReps: 6, section: 'cooldown', cue: 'Stretch thoracic spine and hips after running between wickets.' }
    ];
  } else if (rawSport.includes('running') || rawSport.includes('athletics')) {
    candidates = [
      { id: 'high_knees', name: 'High Knees Running', baseReps: 25, section: 'warmup', cue: 'Refine cadence and ground contact speed.' },
      { id: 'squat', name: 'Bodyweight Squats', baseReps: 15, section: 'main', cue: 'Maintain upright torso for running economy.' },
      { id: 'glute_bridge', name: 'Floor Glute Bridges', baseReps: 15, section: 'main', cue: 'Fire posterior chain to protect hamstrings and knees.' },
      { id: 'calf_raise', name: 'Standing Calf Raises', baseReps: 18, section: 'main', cue: 'Achilles tendon stiffness and plantarflexion endurance.' },
      { id: 'plank', name: 'Core Forearm Plank', baseHold: 45, section: 'main', cue: 'Resist forward pelvic collapse during late-mile fatigue.' },
      { id: 'downward_dog', name: 'Downward Dog to Cobra Flow', baseReps: 8, section: 'cooldown', cue: 'Lengthen calves, hamstrings, and anterior chain.' }
    ];
  } else {
    // General Fitness / Strength / Conditioning
    candidates = [
      { id: 'jumping_jacks', name: 'Jumping Jacks', baseReps: 25, section: 'warmup', cue: 'Full-body cardiovascular calisthenic warm-up.' },
      { id: 'squat', name: 'Bodyweight Squats', baseReps: 14, section: 'main', cue: formIssue?.includes('knees') ? 'Drive knees outward over toes during descent.' : 'Descend with control until thighs reach parallel.' },
      { id: 'pushup', name: 'Standard Push-ups', baseReps: 10, section: 'main', cue: formIssue?.includes('sagging') ? 'Keep spine in a rigid straight line from head to heels.' : 'Full chest depth with elbows at 45 degrees.' },
      { id: 'lunges', name: 'Forward Walking Lunges', baseReps: 10, section: 'main', cue: 'Single-leg balance and quad engagement.' },
      { id: 'plank', name: 'Core Forearm Plank', baseHold: 45, section: 'main', cue: 'Squeeze glutes tightly and brace core.' },
      { id: 'cat_cow', name: 'Cat-Cow Spinal Waves', baseReps: 8, section: 'cooldown', cue: 'Gentle spinal mobilization and diaphragmatic breathing.' }
    ];
  }

  // Adjust exercise count according to requested duration
  let selectedTemplates: ExerciseTemplate[] = [];
  if (duration <= 15) {
    // 3 exercises for short/express session: Warmup -> 2 Primary Compounds
    selectedTemplates = [candidates[0], candidates[1], candidates[2]];
  } else if (duration <= 25) {
    // 4 exercises for standard 20-min session: Warmup -> 2 Compounds -> 1 Core
    selectedTemplates = [candidates[0], candidates[1], candidates[2], candidates[4] || candidates[3]];
  } else if (duration <= 35) {
    // 5 exercises for 30-min session: Warmup -> 3 Compounds -> 1 Core
    selectedTemplates = [candidates[0], candidates[1], candidates[2], candidates[3], candidates[4] || candidates[1]];
  } else {
    // 6 exercises for 45-min endurance session
    selectedTemplates = candidates.slice(0, 6);
  }

  // Deduplicate and finalize exercise items
  const usedIds = new Set<string>();
  const exercises: WorkoutExerciseItem[] = [];

  selectedTemplates.forEach((t, idx) => {
    if (usedIds.has(t.id)) return;
    usedIds.add(t.id);

    const isCamera = CAMERA_TRACKED_EXERCISES.has(t.id);
    const sets = setMultiplier;

    let reps: number | undefined = undefined;
    let durationSeconds: number | undefined = undefined;

    if (t.baseHold) {
      durationSeconds = Math.round(t.baseHold * repModifier);
    } else {
      let r = Math.round((t.baseReps || 10) * repModifier);
      // If goal is strength, slightly lower reps with higher focus
      if (rawGoal.includes('strength') && !t.baseHold && t.section === 'main') {
        r = Math.max(6, Math.round(r * 0.85));
      } else if (rawGoal.includes('endurance') && !t.baseHold) {
        r = Math.round(r * 1.25);
      }
      reps = Math.min(50, Math.max(5, r));
    }

    // Specific form cue enhancement if user had prior errors on this exercise
    let exerciseCue = t.cue || 'Perform each repetition with controlled cadence and full range of motion.';
    if (cleanFormError && (t.id === 'squat' && cleanFormError.includes('knee'))) {
      exerciseCue = '⚠️ Form Correction: Consciously track knees outward over toes to avoid inward collapse.';
    } else if (cleanFormError && (t.id === 'pushup' && cleanFormError.includes('sag'))) {
      exerciseCue = '⚠️ Form Correction: Lock glutes and tighten core to keep hips in a rigid straight line.';
    }

    exercises.push({
      exerciseId: t.id,
      name: t.name,
      sets,
      targetSets: sets,
      ...(reps !== undefined ? { reps, targetReps: reps } : {}),
      ...(durationSeconds !== undefined ? { durationSeconds, targetHoldSeconds: durationSeconds } : {}),
      restSeconds: restSec,
      restInterval: restSec,
      order: idx + 1,
      section: t.section,
      aiSupported: isCamera,
      cue: exerciseCue
    });
  });

  const sportTitle = rawSport.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const goalTitle = rawGoal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const levelTitle = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  const workoutName = `${sportTitle} ${goalTitle} (${levelTitle}, ${duration}m)`;

  const focusCue = formIssue
    ? `Form Priority: Target correcting ${cleanFormError} during working sets.`
    : isPro
      ? 'High-Performance: Maintain brisk transition pacing while sustaining pristine movement form.'
      : 'Consistency & Control: Emphasize steady breathing and full range of motion on every rep.';

  return {
    workoutName,
    title: workoutName,
    duration,
    estimatedDuration: duration,
    estimatedDurationMinutes: duration,
    exercises,
    targetGoal: rawGoal,
    difficulty,
    sport: rawSport,
    focusCue,
    warmup: `3-5 minutes dynamic warmup tailored for ${sportTitle}: joint circles, light cadence, and breathing.`,
    cooldown: `3-5 minutes static stretch: release hip flexors, hamstrings, and chest.`
  };
}

/**
 * Generates and validates a personalized workout routine for a user.
 */
export async function generatePersonalizedWorkout(
  userId: string,
  options?: {
    apiKey?: string;
    model?: string;
    requestedDuration?: number;
    requestedGoal?: string;
    requestedSport?: string;
  }
): Promise<GeneratedWorkout> {
  const context = await buildCoachContext(userId);

  let rawPlan: any = null;

  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const isTestOrOffline = process.env.NODE_ENV === 'test' || process.env.LOCAL_TEST === 'true' || !apiKey;

  if (isTestOrOffline) {
    logger.info('[Workout Generator] Generating adaptive workout using deterministic local intelligence engine');
    rawPlan = generateLocalAdaptiveWorkout(context, options?.requestedDuration, options?.requestedGoal, options?.requestedSport);
  } else {
    // Call Google Gemini API server-side
    const prompt = `You are the SportX AI Strength and Conditioning Coach.
Generate a scientifically sound, personalized workout routine in strict JSON for this athlete:

ATHLETE PROFILE:
- Fitness Level: ${context.user.fitnessLevel}
- Stated Goals: ${JSON.stringify(context.user.goals || [context.user.goal])}
- Target Sport(s): ${JSON.stringify(context.user.sports || [context.user.sport])}
- Desired Session Duration: ${options?.requestedDuration || context.availableTimeMinutes || 20} minutes

PERFORMANCE TELEMETRY & WEAK AREAS:
- Recent Completed Workouts: ${context.performance.recentWorkouts}
- Current Streak: ${context.performance.currentStreak} days
- Average Form Accuracy: ${context.performance.averagePerformance}%
- Historical Biomechanical Errors: ${JSON.stringify(context.recentIssues)}
- Personal Records: ${JSON.stringify(context.performance.personalRecords || {})}

AVAILABLE SPORTX EXERCISES:
- Camera Computer-Vision Tracked (PREFERRED for main drills): "squat", "pushup", "jumping_jacks"
- Complementary Calisthenic/Gym Drills: "lunges", "reverse_lunges", "shoulder_press", "glute_bridge", "calf_raise", "high_knees", "mountain_climbers", "plank", "side_plank", "bicep_curl", "burpees", "russian_twist"
- Dynamic Warmup/Cool-down: "worlds_greatest_stretch", "cat_cow", "hip_flexor_stretch", "downward_dog"

STRICT CONSTRAINTS:
1. ONLY use exercises from the available list above. Do NOT invent new exercise IDs.
2. Match difficulty: Beginner (2-3 sets, 8-12 reps, 40s rest); Intermediate (3-4 sets, 10-15 reps, 35s rest); Pro (3-5 sets, 15-25 reps, 25s rest).
3. The routine MUST fit within the ${options?.requestedDuration || context.availableTimeMinutes || 20}-minute duration window.
4. If the user has a detected form error (e.g., "knees_inward", "hips_sagging"), include a targeted form cue on that exercise.
5. Provide a warm-up and cool-down cue.

RETURN ONLY VALID JSON MATCHING THIS EXACT SCHEMA:
{
  "workoutName": "Sport/Goal descriptive title",
  "duration": ${options?.requestedDuration || context.availableTimeMinutes || 20},
  "targetGoal": "${options?.requestedGoal || context.user.goal || 'fitness'}",
  "difficulty": "${context.user.fitnessLevel || 'intermediate'}",
  "sport": "${options?.requestedSport || context.user.sport || 'badminton'}",
  "focusCue": "Key coaching cue for this session",
  "warmup": "3-5 min warm-up description",
  "cooldown": "3-5 min cool-down description",
  "exercises": [
    {
      "exerciseId": "jumping_jacks",
      "name": "Jumping Jacks",
      "sets": 3,
      "reps": 25,
      "restSeconds": 30,
      "cue": "Land softly on balls of feet",
      "section": "warmup"
    },
    {
      "exerciseId": "squat",
      "name": "Bodyweight Squats",
      "sets": 3,
      "reps": 12,
      "restSeconds": 35,
      "cue": "Keep knees tracking outward over toes",
      "section": "main"
    }
  ]
}`;

    try {
      const { callGeminiApi } = await import('./coach');
      const rawText = await callGeminiApi(
        apiKey,
        prompt,
        options?.model || process.env.AI_MODEL || 'gemini-3.6-flash',
        25000,
        'You are the SportX AI Strength and Conditioning Coach. Return ONLY valid JSON matching the workout schema.'
      );

      let jsonText = rawText.trim();
      const codeBlock = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlock && codeBlock[1]) {
        jsonText = codeBlock[1].trim();
      } else {
        const braceMatch = jsonText.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          jsonText = braceMatch[0].trim();
        }
      }

      rawPlan = JSON.parse(jsonText);
      // Ground AI output: normalize exercises and safely replace unavailable ones
      rawPlan = groundAIWorkoutPlan(rawPlan);
    } catch (e: any) {
      logger.warn('[Workout Generator] Gemini API failed or unavailable, using adaptive local intelligence engine:', e.message);
      rawPlan = generateLocalAdaptiveWorkout(context, options?.requestedDuration, options?.requestedGoal, options?.requestedSport);
    }
  }

  // 1. Ground and validate plan strictly before saving
  if (rawPlan) {
    rawPlan = groundAIWorkoutPlan(rawPlan);
  }
  const validation = validateWorkout(rawPlan);
  if (!validation.isValid || !validation.data) {
    // If external response failed validation, fallback to certified local generator
    logger.warn('[Workout Generator] Plan validation failed on primary output, generating certified local plan:', validation.errors);
    const localFallback = generateLocalAdaptiveWorkout(context, options?.requestedDuration, options?.requestedGoal, options?.requestedSport);
    const groundedFallback = groundAIWorkoutPlan(localFallback);
    const fallbackVal = validateWorkout(groundedFallback);
    if (fallbackVal.isValid && fallbackVal.data) {
      rawPlan = fallbackVal.data;
    } else {
      logger.warn('[Workout Generator] Using grounded fallback plan directly');
      rawPlan = groundedFallback;
    }
  } else {
    rawPlan = validation.data;
  }

  const validatedWorkout = rawPlan;
  const planId = `plan_${userId}_${Date.now()}`;
  validatedWorkout.id = planId;
  validatedWorkout.userId = userId;
  validatedWorkout.createdAt = new Date().toISOString();

  // 2. Persist to database or demoStore
  if (hasFirebaseCredentials) {
    try {
      await db.collection('workoutPlans').doc(planId).set({
        ...validatedWorkout,
        userId
      });
      logger.info(`[Workout Generator] Saved workout ${planId} to Firestore for user ${userId}`);
    } catch (dbErr) {
      logger.warn('[Workout Generator] Firestore save failed, using demoStore:', dbErr);
      demoWorkoutPlans.unshift({ ...validatedWorkout, userId });
    }
  } else {
    demoWorkoutPlans.unshift({ ...validatedWorkout, userId });
  }

  return validatedWorkout;
}

/**
 * HTTP handler for POST /api/v1/ai/generate-workout
 */
export async function generateWorkoutHandler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed. Please use POST.' });
    return;
  }

  try {
    const { authenticateRequest } = await import('../auth');
    const user = await authenticateRequest(req);
    if (!user || !user.uid) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      return;
    }

    const requestedDuration = req.body?.duration || req.body?.durationMinutes || req.body?.time
      ? Number(req.body.duration || req.body.durationMinutes || req.body.time)
      : undefined;

    const requestedGoal = req.body?.goal || req.body?.focus || req.body?.targetGoal;
    const requestedSport = req.body?.sport || req.body?.sportId;

    const workout = await generatePersonalizedWorkout(user.uid, {
      requestedDuration,
      requestedGoal,
      requestedSport
    });

    res.status(201).json({
      success: true,
      message: 'Personalized AI workout generated and saved successfully',
      data: workout
    });
  } catch (err: any) {
    logger.error('[Workout Generator] Endpoint error:', err);
    res.status(err?.statusCode || 500).json({
      success: false,
      error: err?.message || 'Failed to generate personalized workout'
    });
  }
}
