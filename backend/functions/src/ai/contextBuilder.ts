/**
 * SportX AI Coach — Context Builder (Phase 2)
 * Collects relevant user and performance information from Firestore.
 * 
 * Rules:
 * 1. Only collect data relevant to the current AI Coach request.
 * 2. Do NOT send the entire Firestore database to the AI.
 * 3. Use actual existing Firestore schema (users, workoutSessions).
 * 4. Handle missing data gracefully with fast-fallbacks.
 */

import { UserRepository } from '../repositories/userRepository';
import { SessionRepository } from '../repositories/sessionRepository';
import { assertProductionSafe } from '../config/productionSafety';

export interface CoachUserContext {
  user: {
    fitnessLevel: string;
    goal: string;
    goals?: string[];
    sport: string;
    sports?: string[];
    availableWorkoutTime?: number;
  };
  performance: {
    recentWorkouts: number;
    currentStreak: number;
    averagePerformance: number;
    personalRecords?: Record<string, number>;
    exerciseStats?: Record<string, { totalReps: number; avgScore: number; count: number }>;
  };
  recentIssues: string[];
  latestSessionFeedback?: {
    exercise: string;
    reps: number;
    formScore: number;
    errors: string[];
  };

  // Compatibility aliases
  streak: number;
  currentStreak: number;
  averageFormScore: number;
  fitnessLevel: string;
  goal: string;
  goals?: string[];
  sport: string;
  selectedSports?: string[];
  availableTimeMinutes: number;
  commonErrors: string[];
  personalRecords?: Record<string, number>;
}

/**
 * Builds a clean, focused context object for the AI Coach.
 * @param userId Authenticated user UID
 */
export async function buildCoachContext(userId: string): Promise<CoachUserContext> {
  let userData: Record<string, any> = {};
  let sessionDocsData: any[] = [];
  let progressDocData: any = null;

  // 1. Fetch user profile from Firestore users/{userId}
  try {
    const userDoc = await UserRepository.getById(userId);
    if (userDoc) {
      userData = userDoc;
    }
  } catch (err) {
    assertProductionSafe('buildCoachContext: fetch user profile', err);
    console.warn(`[contextBuilder] Notice: Could not fetch user ${userId}:`, (err as Error).message);
  }

  // 2. Fetch recent workout sessions from Firestore workoutSessions
  try {
    const sessions = await SessionRepository.getUserSessions(userId, { limit: 10 });
    if (sessions.length > 0) {
      sessionDocsData = sessions;
    }
  } catch (err) {
    assertProductionSafe('buildCoachContext: query workoutSessions', err);
    console.warn(`[contextBuilder] Notice: Could not query workoutSessions for ${userId}:`, (err as Error).message);
  }

  // 2b. Fetch progress document for personal records and trends
  try {
    const { ProgressRepository } = await import('../repositories/progressRepository');
    progressDocData = await ProgressRepository.getByUserId(userId);
  } catch (progErr) {
    // Non-fatal fallback
  }

  // 3. Compute performance metrics, per-exercise stats, and recent issues
  let scoreSum = 0;
  let scoreCount = 0;
  const errorFrequency: Record<string, number> = {};
  const exerciseStats: Record<string, { totalReps: number; avgScore: number; count: number }> = {};

  for (const session of sessionDocsData) {
    const score = session.formAccuracyAverage ?? session.averageFormScore ?? session.formScore;
    if (typeof score === 'number' && !isNaN(score)) {
      scoreSum += score;
      scoreCount++;
    }

    // Tally per-exercise performance
    const exId = session.exerciseId || session.exerciseLogs?.[0]?.exerciseId;
    if (exId && typeof exId === 'string') {
      const cleanExId = exId.toLowerCase().trim();
      const reps = Number(session.totalReps || 0);
      const curScore = typeof score === 'number' && !isNaN(score) ? score : 80;
      if (!exerciseStats[cleanExId]) {
        exerciseStats[cleanExId] = { totalReps: reps, avgScore: curScore, count: 1 };
      } else {
        exerciseStats[cleanExId].totalReps += reps;
        exerciseStats[cleanExId].avgScore = Math.round((exerciseStats[cleanExId].avgScore * exerciseStats[cleanExId].count + curScore) / (exerciseStats[cleanExId].count + 1));
        exerciseStats[cleanExId].count += 1;
      }
    }

    // Gather form errors from exercise logs
    if (Array.isArray(session.exerciseLogs)) {
      for (const log of session.exerciseLogs) {
        if (Array.isArray(log.sets)) {
          for (const set of log.sets) {
            if (Array.isArray(set.feedbackMessages)) {
              for (const msg of set.feedbackMessages) {
                if (typeof msg === 'string' && msg.startsWith('❗')) {
                  errorFrequency[msg] = (errorFrequency[msg] || 0) + 1;
                }
              }
            }
          }
        }
      }
    }

    const errors = session.formErrors || session.errors;
    if (Array.isArray(errors)) {
      for (const err of errors) {
        const errKey = typeof err === 'string' ? err : (err?.errorType || err?.type);
        if (errKey && typeof errKey === 'string') {
          errorFrequency[errKey] = (errorFrequency[errKey] || 0) + 1;
        }
      }
    }
  }

  // 3b. Incorporate recent Vision Results (Phase 3)
  let visionDocsData: any[] = [];
  try {
    const { getVisionResults } = await import('../vision/visionResult');
    visionDocsData = await getVisionResults(userId, 3);
    for (const v of visionDocsData) {
      if (Array.isArray(v.errors)) {
        for (const err of v.errors) {
          const code = typeof err === 'string' ? err : err?.code;
          if (code) {
            errorFrequency[code] = (errorFrequency[code] || 0) + 2; // higher weight for CV detected flaws
          }
        }
      }
    }
  } catch (visionErr) {
    // Non-fatal fallback
  }

  const averagePerformance = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;
  const recentWorkouts = sessionDocsData.length;
  const currentStreak = Number(userData.currentStreak || 0);

  // Derive recent issues objectively
  const recentIssues: string[] = [];

  if (currentStreak <= 1 && recentWorkouts <= 2) {
    recentIssues.push('low_consistency');
  }

  if (scoreCount > 0 && averagePerformance < 75) {
    recentIssues.push('form_accuracy');
  }

  // Add the most frequent form error if any
  const sortedErrors = Object.keys(errorFrequency).sort((a, b) => errorFrequency[b] - errorFrequency[a]);
  if (sortedErrors.length > 0) {
    recentIssues.push(`error_${sortedErrors[0]}`);
  }

  // 4. Extract latest session feedback if available (prioritizing direct Computer Vision data)
  let latestSessionFeedback: CoachUserContext['latestSessionFeedback'] = undefined;
  if (visionDocsData.length > 0) {
    const latestV = visionDocsData[0];
    latestSessionFeedback = {
      exercise: String(latestV.exerciseId || 'exercise'),
      reps: Number(latestV.reps || 0),
      formScore: Number(latestV.formScore || 0),
      errors: (latestV.errors || []).map((e: any) => (typeof e === 'string' ? e : e.code)).filter(Boolean),
    };
  } else if (sessionDocsData.length > 0) {
    const latest = sessionDocsData[0];
    const exerciseId = latest.exerciseLogs?.[0]?.exerciseId || latest.exerciseId || 'general_exercise';
    const errorsList: string[] = [];

    if (Array.isArray(latest.exerciseLogs)) {
      for (const log of latest.exerciseLogs) {
        if (Array.isArray(log.sets)) {
          for (const set of log.sets) {
            if (Array.isArray(set.feedbackMessages)) {
              errorsList.push(...set.feedbackMessages.filter((m: string) => m.startsWith('❗')));
            }
          }
        }
      }
    }

    latestSessionFeedback = {
      exercise: String(exerciseId),
      reps: Number(latest.totalReps || 0),
      formScore: Number(latest.formAccuracyAverage || latest.averageFormScore || 0),
      errors: errorsList,
    };
  }

  // 5. Normalise sports and goals safely
  const rawSports = Array.isArray(userData.selectedSports) && userData.selectedSports.length > 0
    ? userData.selectedSports
    : (userData.sport ? [userData.sport] : (userData.sportId ? [userData.sportId] : ['badminton']));
  const primarySport = String(rawSports[0] || 'badminton');

  const rawGoals = Array.isArray(userData.goals) && userData.goals.length > 0
    ? userData.goals
    : (userData.goal ? [userData.goal] : (userData.fitnessGoal ? [userData.fitnessGoal] : ['fitness']));
  const primaryGoal = String(rawGoals[0] || 'fitness');

  const personalRecords = progressDocData?.personalRecords || {};

  // 6. Structure final context strictly adhering to token efficiency rules
  const context: CoachUserContext = {
    user: {
      fitnessLevel: String(userData.fitnessLevel || 'intermediate').toLowerCase(),
      goal: primaryGoal,
      goals: rawGoals,
      sport: primarySport,
      sports: rawSports,
      availableWorkoutTime: Number(userData.availableWorkoutTime || userData.availableTimeMinutes || 20),
    },
    performance: {
      recentWorkouts,
      currentStreak,
      averagePerformance,
      personalRecords,
      exerciseStats,
    },
    recentIssues,
    latestSessionFeedback,
    streak: currentStreak,
    currentStreak,
    averageFormScore: averagePerformance,
    fitnessLevel: String(userData.fitnessLevel || 'intermediate').toLowerCase(),
    goal: primaryGoal,
    goals: rawGoals,
    sport: primarySport,
    selectedSports: rawSports,
    availableTimeMinutes: Number(userData.availableWorkoutTime || userData.availableTimeMinutes || 20),
    commonErrors: sortedErrors,
    personalRecords,
  };

  return context;
}

export const buildAICoachContext = buildCoachContext;

export interface SessionAnalysisContext {
  userId: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  reps: number;
  durationSeconds: number;
  formScore: number;
  detectedErrors: string[];
  metrics: Record<string, any>;
  personalRecordReps: number;
  previousAverageFormScore: number;
  userGoal: string;
  fitnessLevel: string;
  sport: string;
}

/**
 * Builds a targeted, authoritative context for analyzing a specific completed workout session.
 */
export async function buildSessionAnalysisContext(
  userId: string,
  sessionId: string
): Promise<SessionAnalysisContext> {
  // 1. Fetch authoritative session
  const session = await SessionRepository.getById(sessionId);
  if (!session) {
    const err: any = new Error(`Session "${sessionId}" not found`);
    err.statusCode = 404;
    throw err;
  }

  if (session.userId !== userId) {
    const err: any = new Error('Access denied: You do not own this session');
    err.statusCode = 403;
    throw err;
  }

  // 2. Fetch linked Vision result if available
  const { getVisionResultBySession } = await import('../vision/visionResult');
  const visionRecord = await getVisionResultBySession(sessionId).catch(() => null);

  // 3. Fetch user profile & progress
  const user = await UserRepository.getById(userId).catch((err) => {
    assertProductionSafe('buildSessionAnalysisContext: fetch user profile', err);
    return null;
  });
  const { ProgressRepository } = await import('../repositories/progressRepository');
  const progress = await ProgressRepository.getByUserId(userId).catch((err) => {
    assertProductionSafe('buildSessionAnalysisContext: fetch progress', err);
    return null;
  });

  const exerciseId = session.exerciseId || visionRecord?.exerciseId || session.exerciseLogs?.[0]?.exerciseId || 'squat';
  const exerciseName = session.exerciseName || visionRecord?.exerciseId || exerciseId;
  const reps = session.totalReps ?? visionRecord?.reps ?? 0;
  const formScore = session.formAccuracyAverage ?? visionRecord?.formScore ?? 80;
  const durationSeconds = session.durationSeconds ?? (session.durationMinutes ? session.durationMinutes * 60 : 60);

  // Extract errors from vision record and session logs
  const detectedErrors: string[] = [];
  if (visionRecord && Array.isArray(visionRecord.errors)) {
    for (const e of visionRecord.errors) {
      const code = typeof e === 'string' ? e : e?.code;
      if (code && !detectedErrors.includes(code)) detectedErrors.push(code);
    }
  }
  if (session.formErrors && Array.isArray(session.formErrors)) {
    for (const code of session.formErrors) {
      if (code && !detectedErrors.includes(code)) detectedErrors.push(code);
    }
  }

  const prKey = `${exerciseId}_max_reps`;
  const personalRecordReps = progress?.personalRecords?.[prKey] || reps;
  const trends = progress?.formScoreTrends || [];
  const previousAverageFormScore = trends.length > 0
    ? Math.round(trends.reduce((a, b) => a + b.score, 0) / trends.length)
    : formScore;

  return {
    userId,
    sessionId,
    exerciseId,
    exerciseName,
    reps,
    durationSeconds,
    formScore,
    detectedErrors,
    metrics: session.metrics || {},
    personalRecordReps,
    previousAverageFormScore,
    userGoal: String(Array.isArray(user?.goals) ? user.goals[0] : (user?.goals || 'fitness')),
    fitnessLevel: String(user?.fitnessLevel || 'intermediate'),
    sport: String(Array.isArray(user?.selectedSports) ? user.selectedSports[0] : 'general'),
  };
}

