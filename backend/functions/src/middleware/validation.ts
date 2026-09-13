/**
 * SportX Input Validation & Data Sanitization Middleware
 * Defense-in-depth validation for user profiles, workout plans, and activity telemetry.
 */
import { FitnessLevel, WorkoutExerciseItem } from '../types';

export const PROTECTED_USER_FIELDS = new Set([
  'xp',
  'XP',
  'totalXp',
  'level',
  'currentStreak',
  'longestStreak',
  'lastWorkoutDate',
  'badges',
  'totalWorkouts',
  'totalMinutes',
  'totalCalories',
  'createdAt',
  'updatedAt',
  'userId',
  'id',
  'role',
]);

const VALID_FITNESS_LEVELS: Set<FitnessLevel> = new Set(['beginner', 'intermediate', 'pro', 'advanced']);

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates fitness profile data
 */
export function validateFitnessProfile(data: Record<string, unknown>): ValidationResult {
  if (data.fitnessLevel !== undefined) {
    if (!VALID_FITNESS_LEVELS.has(data.fitnessLevel as FitnessLevel)) {
      return {
        isValid: false,
        error: `Invalid fitnessLevel '${data.fitnessLevel}'. Must be one of: beginner, intermediate, pro, advanced`,
      };
    }
  }

  if (data.goals !== undefined && !Array.isArray(data.goals)) {
    return { isValid: false, error: 'goals must be an array of strings' };
  }

  if (data.selectedSports !== undefined && !Array.isArray(data.selectedSports)) {
    return { isValid: false, error: 'selectedSports must be an array of strings' };
  }

  if (data.availableWorkoutTime !== undefined) {
    const time = Number(data.availableWorkoutTime);
    if (isNaN(time) || time <= 0) {
      return { isValid: false, error: 'availableWorkoutTime must be a positive number of minutes' };
    }
  }

  return { isValid: true };
}

/**
 * Strips client-tampered protected gamification, role, and audit fields
 */
export function sanitizeUserProfileUpdate(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (!PROTECTED_USER_FIELDS.has(key)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validates workout plan structure
 */
export function validateWorkoutPlan(data: Record<string, unknown>): ValidationResult {
  const name = (data.title || data.name) as string | undefined;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { isValid: false, error: 'Workout title/name is required' };
  }

  if (!Array.isArray(data.exercises) || data.exercises.length === 0) {
    return { isValid: false, error: 'Workout plan must contain at least one exercise in exercises[]' };
  }

  for (let i = 0; i < data.exercises.length; i++) {
    const ex = data.exercises[i] as any;
    if (!ex.exerciseId || typeof ex.exerciseId !== 'string') {
      return { isValid: false, error: `Exercise at index ${i} missing valid exerciseId` };
    }
    const sets = ex.sets ?? ex.targetSets;
    if (sets !== undefined && (typeof sets !== 'number' || sets <= 0)) {
      return { isValid: false, error: `Exercise at index ${i} must have positive sets count` };
    }
    const reps = ex.reps ?? ex.targetReps;
    if (reps !== undefined && (typeof reps !== 'number' || reps <= 0)) {
      return { isValid: false, error: `Exercise at index ${i} must have positive reps count` };
    }
    const rest = ex.restSeconds ?? ex.restInterval;
    if (rest !== undefined && (typeof rest !== 'number' || rest < 0)) {
      return { isValid: false, error: `Exercise at index ${i} must have non-negative restSeconds` };
    }
  }

  return { isValid: true };
}

/**
 * Validates incoming CV / Activity telemetry log
 */
export function validateActivityLog(data: Record<string, unknown>): ValidationResult {
  if (!data.exerciseId || typeof data.exerciseId !== 'string') {
    return { isValid: false, error: 'exerciseId is required' };
  }

  if (typeof data.reps !== 'number' || data.reps < 0 || !Number.isInteger(data.reps)) {
    return { isValid: false, error: 'reps must be a non-negative integer' };
  }

  if (typeof data.duration !== 'number' || data.duration < 0) {
    return { isValid: false, error: 'duration must be a non-negative number of seconds' };
  }

  if (typeof data.formScore !== 'number' || data.formScore < 0 || data.formScore > 100) {
    return { isValid: false, error: 'formScore must be a number between 0 and 100' };
  }

  if (data.errors !== undefined && !Array.isArray(data.errors)) {
    return { isValid: false, error: 'errors must be an array of strings' };
  }

  return { isValid: true };
}
