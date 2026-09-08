import { db } from '../config/firebase';

export interface AICoachContext {
  userId: string;
  studentName: string;
  fitnessLevel: string;
  goal: string;
  availableTimeMinutes: number;
  recentWorkouts: number;
  averageFormScore: number;
  streak: number;
  commonErrors: string[];
  latestSession?: {
    exercise: string;
    reps: number;
    formScore: number;
    durationSeconds: number;
    errors: string[];
  };
}

/**
 * Builds high-density structured context for the AI Coach
 * as specified in Section 3 & 5 of SportX Backend Requirements.
 */
export async function buildAICoachContext(userId: string): Promise<AICoachContext> {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data() || {};

  // Fetch recent 5 workout sessions
  const sessionsSnapshot = await db.collection('workoutSessions')
    .where('userId', '==', userId)
    .orderBy('startedAt', 'desc')
    .limit(5)
    .get();

  let scoreSum = 0;
  let count = 0;
  const errorMap: Record<string, number> = {};

  sessionsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.averageFormScore) {
      scoreSum += data.averageFormScore;
      count++;
    }
    if (Array.isArray(data.formErrors)) {
      data.formErrors.forEach((err: any) => {
        const key = typeof err === 'string' ? err : err.errorType;
        if (key) errorMap[key] = (errorMap[key] || 0) + 1;
      });
    }
  });

  const averageFormScore = count > 0 ? Math.round(scoreSum / count) : 85;
  const commonErrors = Object.keys(errorMap).sort((a, b) => errorMap[b] - errorMap[a]).slice(0, 3);

  let latestSession: AICoachContext['latestSession'] = undefined;
  if (!sessionsSnapshot.empty) {
    const latestData = sessionsSnapshot.docs[0].data();
    latestSession = {
      exercise: latestData.exerciseId || 'squat',
      reps: latestData.totalReps || 15,
      formScore: latestData.averageFormScore || 82,
      durationSeconds: latestData.durationSeconds || 120,
      errors: latestData.formErrors || ['knees_inward']
    };
  }

  return {
    userId,
    studentName: userData.name || 'Student Athlete',
    fitnessLevel: userData.fitnessLevel || 'beginner',
    goal: userData.fitnessGoal || 'fitness',
    availableTimeMinutes: userData.availableTimeMinutes || 20,
    recentWorkouts: sessionsSnapshot.docs.length || 3,
    averageFormScore,
    streak: userData.currentStreak || 3,
    commonErrors: commonErrors.length > 0 ? commonErrors : ['knees_inward'],
    latestSession
  };
}
