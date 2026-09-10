/**
 * SportX Callable Cloud Functions (2nd Gen)
 * High-performance remote procedure calls for verification, gamification preview, and recommendations
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GamificationService } from '../services/gamificationService';
import { ExerciseRepository } from '../repositories/exerciseRepository';
import { UserRepository } from '../repositories/userRepository';
import { WorkoutRepository } from '../repositories/workoutRepository';
import * as logger from 'firebase-functions/logger';

/**
 * Callable Function: verifyWorkoutSession
 * Anti-cheat validation of session telemetry and biomechanical cadence
 */
export const verifyWorkoutSession = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required to verify workout session.');
  }

  const { totalReps = 0, durationSeconds = 0, averageFormScore = 0, exerciseId } = request.data || {};

  const reps = Number(totalReps);
  const duration = Number(durationSeconds);
  const score = Number(averageFormScore);

  // Validation rules:
  // 1. Reps must be non-negative
  if (reps < 0) {
    throw new HttpsError('invalid-argument', 'Total reps cannot be negative.');
  }

  // 2. Realistic cadence check (e.g. human cannot do more than 1 rep every 0.75 seconds sustainably)
  if (reps > 0 && duration > 0) {
    const secondsPerRep = duration / reps;
    if (secondsPerRep < 0.7) {
      logger.warn(`[Anti-Cheat] Suspicious cadence detected for user ${request.auth.uid}: ${secondsPerRep.toFixed(2)}s/rep`);
      return {
        verified: false,
        reason: 'Suspicious cadence: Rep rate exceeds realistic human biomechanics.',
        adjustedXP: 0,
      };
    }
  }

  // 3. Form accuracy must be within valid bounds
  const validForm = Math.min(100, Math.max(0, score));

  // Compute authorized XP
  const durationMin = Math.max(1, Math.round(duration / 60));
  const authorizedXP = GamificationService.calculateSessionXP({
    totalReps: reps,
    formAccuracyAverage: validForm,
    durationMinutes: durationMin,
    isCompleted: true,
  });

  return {
    verified: true,
    totalReps: reps,
    durationSeconds: duration,
    formScore: validForm,
    authorizedXP,
    message: 'Session telemetry verified successfully by SportX Intelligence Engine.',
  };
});

/**
 * Callable Function: calculateWorkoutXP
 * Authoritative preview of XP before/during workout
 */
export const calculateWorkoutXP = onCall({ cors: true }, async (request) => {
  const { totalReps = 0, formAccuracy = 85, durationMinutes = 15, isCompleted = true } = request.data || {};

  const xp = GamificationService.calculateSessionXP({
    totalReps: Number(totalReps),
    formAccuracyAverage: Number(formAccuracy),
    durationMinutes: Number(durationMinutes),
    isCompleted: Boolean(isCompleted),
  });

  return {
    estimatedXP: xp,
    breakdown: {
      repXP: Math.round(Number(totalReps) * 10 * (Number(formAccuracy) / 100)),
      durationBonus: Math.round(Math.min(60, Number(durationMinutes)) * 5),
      completionBonus: isCompleted ? 50 : 0,
    },
  };
});

/**
 * Callable Function: searchExercises
 * Search exercise library with filters
 */
export const searchExercises = onCall({ cors: true }, async (request) => {
  const { query, muscle, equipment, difficulty, sportId } = request.data || {};

  let list = await ExerciseRepository.getAll({
    sportId,
    difficulty,
    targetMuscle: muscle,
  });

  if (query) {
    const q = String(query).toLowerCase();
    list = list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.targetMuscles.some((m) => m.toLowerCase().includes(q))
    );
  }
  if (equipment) {
    list = list.filter((e) => e.equipmentNeeded.includes(equipment));
  }

  return {
    count: list.length,
    exercises: list,
  };
});

/**
 * Callable Function: getAICoachRecommendation
 * Personalized coaching recommendation based on user stats and goals
 */
export const getAICoachRecommendation = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated to receive coach recommendations.');
  }

  const uid = request.auth.uid;
  const user = await UserRepository.getById(uid);
  const workouts = await WorkoutRepository.getAll();

  const userGoals = user?.goals || ['fitness'];
  const userLevel = user?.fitnessLevel || 'beginner';
  const streak = user?.currentStreak || 0;

  // Pick workout tailored to goal & level
  const recommendedWorkout =
    workouts.find((w) => w.targetGoal === userGoals[0] && w.difficulty === userLevel) ||
    workouts.find((w) => w.difficulty === userLevel) ||
    workouts[0];

  let coachingTip = 'Remember to keep your core engaged and maintain steady breathing throughout each set.';
  if (streak > 5) {
    coachingTip = `Incredible ${streak}-day streak! Focus on recovery and hydration today to avoid fatigue.`;
  } else if (userLevel === 'beginner') {
    coachingTip = 'Focus on controlled form rather than speed. 10 clean reps beats 20 rushed reps every time.';
  }

  return {
    userId: uid,
    recommendedWorkout,
    coachingTip,
    targetCalories: user?.targetCalories || 300,
    currentStreak: streak,
    level: user?.level || 1,
    generatedAt: new Date().toISOString(),
  };
});
