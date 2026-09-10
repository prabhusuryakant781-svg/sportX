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
 */

import { buildCoachContext, CoachUserContext } from './contextBuilder';
import { db, hasFirebaseCredentials } from '../config/firebase';
import { demoWorkoutPlans, nextId } from '../config/demoStore';
import * as logger from 'firebase-functions/logger';

export interface WorkoutExerciseItem {
  exerciseId: string;
  name?: string;
  sets: number;
  reps: number;
  durationSeconds?: number;
  restSeconds?: number;
  cue?: string;
}

export interface GeneratedWorkout {
  workoutName: string;
  duration: number; // minutes
  exercises: WorkoutExerciseItem[];
  targetGoal?: string;
  difficulty?: string;
  sport?: string;
  focusCue?: string;
  id?: string;
  createdAt?: string;
}

export interface WorkoutValidationResult {
  isValid: boolean;
  data?: GeneratedWorkout;
  errors: string[];
}

export const VALID_EXERCISE_IDS = new Set<string>([
  'squat',
  'pushup',
  'bicep_curl',
  'plank',
  'jumping_jacks',
  'lunge',
  'burpee'
]);

const EXERCISE_NAMES: Record<string, string> = {
  squat: 'Bodyweight Squats',
  pushup: 'Standard Push-ups',
  bicep_curl: 'Dumbbell / Resistance Bicep Curls',
  plank: 'Core Forearm Plank',
  jumping_jacks: 'Jumping Jacks',
  lunge: 'Walking Lunges',
  burpee: 'Full Body Burpees'
};

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
  const duration = obj.duration ?? obj.estimatedDurationMinutes;
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
        const cleanId = ex.exerciseId.trim().toLowerCase();
        if (!VALID_EXERCISE_IDS.has(cleanId)) {
          errors.push(`Exercise at index ${i} has unrecognized exerciseId "${ex.exerciseId}". Must be one of: ${Array.from(VALID_EXERCISE_IDS).join(', ')}`);
        }
      }

      // Validate sets (targetSets or sets)
      const sets = ex.sets ?? ex.targetSets;
      if (typeof sets !== 'number' || !Number.isInteger(sets) || sets < 1 || sets > 10) {
        errors.push(`Exercise at index ${i} ("${ex.exerciseId || i}") must specify "sets" between 1 and 10`);
      }

      // Validate reps or durationSeconds
      const reps = ex.reps ?? ex.targetReps;
      const durationSeconds = ex.durationSeconds ?? ex.targetDurationSeconds;

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

  const validatedExercises: WorkoutExerciseItem[] = obj.exercises.map((ex: any) => {
    const cleanId = String(ex.exerciseId).trim().toLowerCase();
    return {
      exerciseId: cleanId,
      name: ex.name || EXERCISE_NAMES[cleanId] || cleanId.replace(/_/g, ' '),
      sets: Number(ex.sets ?? ex.targetSets),
      reps: Number(ex.reps ?? ex.targetReps ?? 10),
      ...(ex.durationSeconds || ex.targetDurationSeconds ? { durationSeconds: Number(ex.durationSeconds || ex.targetDurationSeconds) } : {}),
      restSeconds: Number(ex.restSeconds || 30),
      ...(ex.cue ? { cue: String(ex.cue).trim() } : {})
    };
  });

  const validatedPlan: GeneratedWorkout = {
    workoutName: String(name).trim(),
    duration: Number(duration),
    exercises: validatedExercises,
    targetGoal: obj.targetGoal ? String(obj.targetGoal).trim() : 'fitness',
    difficulty: obj.difficulty ? String(obj.difficulty).trim() : 'beginner',
    sport: obj.sport ? String(obj.sport).trim() : 'general_fitness',
    focusCue: obj.focusCue || obj.coachingTip || 'Focus on controlled tempo and steady breathing throughout each set.'
  };

  return {
    isValid: true,
    data: validatedPlan,
    errors: []
  };
}

/**
 * Deterministic local generator for test environments
 */
function generateLocalAdaptiveWorkout(context: CoachUserContext): GeneratedWorkout {
  const goal = context.user.goal || 'fitness';
  const sport = context.user.sport || 'general_fitness';
  const level = context.user.fitnessLevel || 'beginner';
  const formIssue = context.recentIssues.find(i => i.startsWith('error_'));

  let exercises: WorkoutExerciseItem[] = [];

  if (goal.toLowerCase().includes('strength')) {
    exercises = [
      {
        exerciseId: 'squat',
        name: 'Bodyweight Squats',
        sets: 3,
        reps: context.performance.averagePerformance >= 85 ? 15 : 12,
        restSeconds: 45,
        cue: formIssue?.includes('knees_inward') ? 'Drive knees outward over toes during descent.' : 'Descend with control.'
      },
      {
        exerciseId: 'pushup',
        name: 'Standard Push-ups',
        sets: 3,
        reps: level === 'advanced' ? 15 : 10,
        restSeconds: 45,
        cue: 'Maintain neutral spine and keep core engaged.'
      },
      {
        exerciseId: 'bicep_curl',
        name: 'Bicep Curls',
        sets: 3,
        reps: 12,
        restSeconds: 30,
        cue: 'Pin elbows to ribs without swinging.'
      }
    ];
  } else {
    exercises = [
      {
        exerciseId: 'jumping_jacks',
        name: 'Jumping Jacks',
        sets: 3,
        reps: 25,
        restSeconds: 30,
        cue: 'Land softly on balls of feet.'
      },
      {
        exerciseId: 'squat',
        name: 'Bodyweight Squats',
        sets: 3,
        reps: 12,
        restSeconds: 30,
        cue: 'Keep chest upright.'
      },
      {
        exerciseId: 'plank',
        name: 'Core Forearm Plank',
        sets: 3,
        reps: 1,
        durationSeconds: 45,
        restSeconds: 30,
        cue: 'Squeeze glutes and brace core.'
      }
    ];
  }

  const focusCue = formIssue
    ? `Form Correction: Pay special attention to avoiding ${formIssue.replace('error_', '').replace(/_/g, ' ')}!`
    : 'Prioritize full range of motion and steady breathing on all repetitions.';

  return {
    workoutName: `${sport.charAt(0).toUpperCase() + sport.slice(1)} ${goal.charAt(0).toUpperCase() + goal.slice(1)} Session`,
    duration: 30,
    exercises,
    targetGoal: goal,
    difficulty: level,
    sport,
    focusCue
  };
}

/**
 * Generates and validates a personalized workout routine for a user.
 */
export async function generatePersonalizedWorkout(
  userId: string,
  options?: { apiKey?: string; model?: string; requestedDuration?: number }
): Promise<GeneratedWorkout> {
  const context = await buildCoachContext(userId);

  // Generate workout plan (using simulated local generator in test mode or Gemini REST API)
  let rawPlan: any = null;

  if (process.env.NODE_ENV === 'test' || process.env.LOCAL_TEST === 'true' || !process.env.GEMINI_API_KEY) {
    logger.info('[Workout Generator] Generating adaptive workout using local intelligence engine');
    rawPlan = generateLocalAdaptiveWorkout(context);
    if (options?.requestedDuration) {
      rawPlan.duration = options.requestedDuration;
    }
  } else {
    // Call Gemini API server-side
    const prompt = `Generate a personalized workout session in strict JSON for this athlete:
Profile: Level ${context.user.fitnessLevel}, Goal: ${context.user.goal}, Sport: ${context.user.sport}
Recent Workouts: ${context.performance.recentWorkouts}, Avg Form Score: ${context.performance.averagePerformance}%
Previous Issues: ${JSON.stringify(context.recentIssues)}

JSON Schema required:
{
  "workoutName": "string",
  "duration": 30,
  "exercises": [
    { "exerciseId": "squat", "sets": 3, "reps": 12, "cue": "optional form cue" }
  ],
  "focusCue": "string"
}`;

    const { callGeminiApi } = await import('./coach');
    const rawText = await callGeminiApi(
      options?.apiKey || process.env.GEMINI_API_KEY!,
      prompt,
      options?.model || 'gemini-2.5-flash',
      10000,
      'You are the SportX AI Strength and Conditioning Coach. Return ONLY valid JSON matching the workout schema.'
    );

    try {
      const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      rawPlan = JSON.parse(cleanJson);
    } catch (e) {
      rawPlan = generateLocalAdaptiveWorkout(context);
    }
  }

  // 1. Validate plan strictly before saving
  const validation = validateWorkout(rawPlan);
  if (!validation.isValid || !validation.data) {
    const errorMsg = `Workout validation failed: ${validation.errors.join('; ')}`;
    logger.error('[Workout Generator]', errorMsg);
    const err: any = new Error(errorMsg);
    err.statusCode = 502;
    throw err;
  }

  const validatedWorkout = validation.data;
  const planId = `plan_${userId}_${Date.now()}`;
  validatedWorkout.id = planId;
  validatedWorkout.createdAt = new Date().toISOString();

  // 2. Persist to database
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

    const requestedDuration = req.body?.duration ? Number(req.body.duration) : undefined;
    const workout = await generatePersonalizedWorkout(user.uid, { requestedDuration });

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
