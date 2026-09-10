/**
 * SportX AI Coach — Context Builder (Phase 2)
 * Collects relevant user and performance information from Firestore.
 * 
 * Rules:
 * 1. Only collect data relevant to the current AI Coach request.
 * 2. Do NOT send the entire Firestore database to the AI.
 * 3. Use actual existing Firestore schema (users, workoutSessions).
 * 4. Handle missing data gracefully.
 */

import { db, hasFirebaseCredentials } from '../config/firebase';
import { users as demoUsers, sessions as demoSessions } from '../config/demoStore';

export interface CoachUserContext {
  user: {
    fitnessLevel: string;
    goal: string;
    sport: string;
  };
  performance: {
    recentWorkouts: number;
    currentStreak: number;
    averagePerformance: number;
  };
  recentIssues: string[];
  latestSessionFeedback?: {
    exercise: string;
    reps: number;
    formScore: number;
    errors: string[];
  };
}

function withTimeout<T>(promise: Promise<T>, ms = 1500): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore operation timeout')), ms);
  });
  // Prevent unhandled promise rejection if the query rejects after the timeout fires
  promise.catch(() => {});
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Builds a clean, focused context object for the AI Coach.
 * @param userId Authenticated user UID
 */
export async function buildCoachContext(userId: string): Promise<CoachUserContext> {
  let userData: Record<string, any> = {};
  let sessionDocsData: any[] = [];

  // 1 & 2. Fetch from Firestore if credentials are configured, or fast-fallback to demoStore
  if (hasFirebaseCredentials) {
    try {
      const userDoc = await withTimeout(db.collection('users').doc(userId).get(), 1500);
      if (userDoc.exists) {
        userData = userDoc.data() || {};
      } else {
        const demoUser = demoUsers.get(userId);
        if (demoUser) {
          userData = demoUser;
        }
      }
    } catch (err) {
      const demoUser = demoUsers.get(userId);
      if (demoUser) {
        userData = demoUser;
      }
    }

    try {
      const sessionsSnapshot = await withTimeout(
        db.collection('workoutSessions')
          .where('userId', '==', userId)
          .limit(5)
          .get(),
        1500
      );

      if (!sessionsSnapshot.empty) {
        sessionDocsData = sessionsSnapshot.docs.map(d => d.data());
      } else {
        const matchedDemoSessions = demoSessions.filter(s => s.userId === userId);
        if (matchedDemoSessions.length > 0) {
          sessionDocsData = matchedDemoSessions;
        }
      }
    } catch (err) {
      const matchedDemoSessions = demoSessions.filter(s => s.userId === userId);
      if (matchedDemoSessions.length > 0) {
        sessionDocsData = matchedDemoSessions;
      }
    }
  } else {
    const demoUser = demoUsers.get(userId);
    if (demoUser) {
      userData = demoUser;
    }
    const matchedDemoSessions = demoSessions.filter(s => s.userId === userId);
    if (matchedDemoSessions.length > 0) {
      sessionDocsData = matchedDemoSessions;
    }
  }

  // 3. Compute performance metrics and recent issues
  let scoreSum = 0;
  let scoreCount = 0;
  const errorFrequency: Record<string, number> = {};

  for (const session of sessionDocsData) {
    const score = session.averageFormScore ?? session.formScore;
    if (typeof score === 'number' && !isNaN(score)) {
      scoreSum += score;
      scoreCount++;
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

  // 4. Extract latest session feedback if available
  let latestSessionFeedback: CoachUserContext['latestSessionFeedback'] = undefined;
  if (sessionDocsData.length > 0) {
    const latest = sessionDocsData[0];
    const errorsList = Array.isArray(latest.formErrors)
      ? latest.formErrors.map((e: any) => (typeof e === 'string' ? e : e?.errorType)).filter(Boolean)
      : (Array.isArray(latest.errors) ? latest.errors : []);

    latestSessionFeedback = {
      exercise: String(latest.exerciseId || latest.exercise || 'general_exercise'),
      reps: Number(latest.totalReps || latest.reps || 0),
      formScore: Number(latest.averageFormScore || latest.formScore || 0),
      errors: errorsList,
    };
  }

  // 5. Structure user profile fields
  const sports = Array.isArray(userData.selectedSports) && userData.selectedSports.length > 0
    ? userData.selectedSports[0]
    : 'general_fitness';

  return {
    user: {
      fitnessLevel: String(userData.fitnessLevel || 'beginner'),
      goal: String(userData.fitnessGoal || 'fitness'),
      sport: String(sports),
    },
    performance: {
      recentWorkouts,
      currentStreak,
      averagePerformance,
    },
    recentIssues,
    ...(latestSessionFeedback ? { latestSessionFeedback } : {})
  };
}

/**
 * Backward compatibility wrapper for existing insights and workout generator
 */
export async function buildAICoachContext(userId: string): Promise<any> {
  const ctx = await buildCoachContext(userId);
  return {
    userId,
    studentName: 'Student Athlete',
    fitnessLevel: ctx.user.fitnessLevel,
    goal: ctx.user.goal,
    availableTimeMinutes: 20,
    recentWorkouts: ctx.performance.recentWorkouts,
    averageFormScore: ctx.performance.averagePerformance || 85,
    streak: ctx.performance.currentStreak,
    commonErrors: ctx.recentIssues.filter(i => i.startsWith('error_')).map(i => i.replace('error_', '')),
    latestSession: ctx.latestSessionFeedback
  };
}

