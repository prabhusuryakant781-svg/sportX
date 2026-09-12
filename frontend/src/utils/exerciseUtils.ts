/**
 * Normalizes any raw exercise identifier into one of the canonical SportX exercise IDs:
 * - 'squat'
 * - 'pushup'
 * - 'jumping_jacks'
 */
export function normalizeExerciseId(rawId?: string | null): string {
  if (!rawId || typeof rawId !== 'string') return 'squat';

  const clean = rawId.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (
    clean === 'jumping_jack' ||
    clean === 'jumping_jacks' ||
    clean === 'jumpingjack' ||
    clean === 'jumpingjacks'
  ) {
    return 'jumping_jacks';
  }

  if (
    clean === 'pushup' ||
    clean === 'pushups' ||
    clean === 'push_up' ||
    clean === 'push_ups'
  ) {
    return 'pushup';
  }

  if (clean === 'squat' || clean === 'squats') {
    return 'squat';
  }

  // If already a known ID or custom exercise, return the sanitized string
  return clean || 'squat';
}

/**
 * Safely extracts the plan ID from a workout plan object or string.
 * Ensures the result is never undefined or the literal string "undefined".
 */
export function getPlanId(plan?: any): string {
  if (!plan) return 'free';
  if (typeof plan === 'string') {
    const trimmed = plan.trim();
    return (!trimmed || trimmed === 'undefined' || trimmed === 'null') ? 'free' : trimmed;
  }
  const id = plan.workoutId || plan.planId || plan.id;
  if (!id || id === 'undefined' || id === 'null') return 'free';
  return String(id).trim();
}

/**
 * Safely extracts the canonical exercise ID from an exercise object or string.
 * Ensures the result is never undefined or the literal string "undefined".
 */
export function getExerciseId(ex?: any): string {
  if (!ex) return 'squat';
  if (typeof ex === 'string') {
    if (ex === 'undefined' || ex === 'null' || !ex.trim()) return 'squat';
    return normalizeExerciseId(ex);
  }
  const id = ex.exerciseId || ex.id;
  return normalizeExerciseId(id);
}

/**
 * Generates the canonical camera route path for a given plan and exercise.
 * Guarantees zero "undefined" segments in the URL.
 * 
 * Examples:
 *   buildCameraRoute('free', 'jumping_jacks') -> '/camera/free/jumping_jacks'
 *   buildCameraRoute(undefined, 'jumping-jacks') -> '/camera/free/jumping_jacks'
 *   buildCameraRoute('dorm_blast_10', 'pushup') -> '/camera/dorm_blast_10/pushup'
 */
export function buildCameraRoute(plan?: any, exercise?: any): string {
  const cleanPlan = getPlanId(plan);
  const cleanExercise = getExerciseId(exercise);
  return `/camera/${cleanPlan}/${cleanExercise}`;
}
