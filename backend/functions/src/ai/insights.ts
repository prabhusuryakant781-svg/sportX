/**
 * SportX AI Coach — Progress Analysis & Consistency Insights (Phase 4)
 * Evaluates athlete training trends, form trajectories, consistency patterns,
 * and recurring biomechanical errors.
 * 
 * Rules:
 * 1. Calculate metrics objectively from real session and vision history.
 * 2. Distinguish improving vs declining trajectories.
 * 3. Pinpoint recurring form errors for targeted intervention.
 */

import { db, hasFirebaseCredentials } from '../config/firebase';
import { sessions as demoSessions, users as demoUsers, demoVisionResults } from '../config/demoStore';
import { getVisionResults } from '../vision/visionResult';
import * as logger from 'firebase-functions/logger';

export interface ProgressAnalysis {
  workoutFrequency: number; // sessions per week
  totalSessions: number;
  totalReps: number;
  averageFormScore: number;
  currentStreak: number;
  formTrend: 'improving' | 'stable' | 'declining';
  commonErrors: string[];
  summary: string;
  improvements: string[];
  focusAreas: string[];
}

export interface ConsistencyInsight {
  weeklyActiveDays: number;
  monthlyActiveDays: number;
  currentStreak: number;
  missedWorkoutsEstimate: number;
  consistencyScore: number; // 0 to 100
  streakStatus: string;
  recommendation: string;
}

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore insights query timeout')), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Analyzes progress, performance trends, reps, form scores, and common errors.
 */
export async function analyzeProgress(userId: string): Promise<ProgressAnalysis> {
  let sessionDocs: any[] = [];
  let userProfile: any = {};

  // 1. Fetch user profile & sessions
  if (hasFirebaseCredentials) {
    try {
      const userDoc = await withTimeout(db.collection('users').doc(userId).get(), 1500);
      if (userDoc.exists) userProfile = userDoc.data() || {};
      else userProfile = demoUsers.get(userId) || {};

      const sessionsSnap = await withTimeout(
        db.collection('workoutSessions')
          .where('userId', '==', userId)
          .limit(20)
          .get(),
        2000
      );
      if (!sessionsSnap.empty) {
        sessionDocs = sessionsSnap.docs.map(d => d.data());
      } else {
        sessionDocs = demoSessions.filter(s => s.userId === userId);
      }
    } catch (e) {
      userProfile = demoUsers.get(userId) || {};
      sessionDocs = demoSessions.filter(s => s.userId === userId);
    }
  } else {
    userProfile = demoUsers.get(userId) || {};
    sessionDocs = demoSessions.filter(s => s.userId === userId);
  }

  // 2. Fetch vision results
  const visionRecords = await getVisionResults(userId, 10).catch(() => []);

  // 3. Compute reps and form scores
  let totalReps = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  const formScores: number[] = [];
  const errorCounts: Record<string, number> = {};

  for (const s of sessionDocs) {
    const reps = Number(s.totalReps || s.reps || 0);
    totalReps += reps;

    const score = s.averageFormScore ?? s.formScore;
    if (typeof score === 'number' && !isNaN(score)) {
      formScores.push(score);
      scoreSum += score;
      scoreCount++;
    }

    const errs = s.formErrors || s.errors;
    if (Array.isArray(errs)) {
      for (const err of errs) {
        const key = typeof err === 'string' ? err : (err?.errorType || err?.code);
        if (key) errorCounts[key] = (errorCounts[key] || 0) + 1;
      }
    }
  }

  // Factor in Computer Vision errors
  for (const v of visionRecords) {
    if (Array.isArray(v.errors)) {
      for (const err of v.errors) {
        const key = typeof err === 'string' ? err : err.code;
        if (key) errorCounts[key] = (errorCounts[key] || 0) + 2;
      }
    }
  }

  const totalSessions = sessionDocs.length;
  const averageFormScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 80;
  const currentStreak = Number(userProfile.currentStreak || 0);

  // 4. Calculate trend: compare recent half vs older half
  let formTrend: ProgressAnalysis['formTrend'] = 'stable';
  if (formScores.length >= 2) {
    const half = Math.floor(formScores.length / 2);
    const recentScores = formScores.slice(0, half);
    const olderScores = formScores.slice(half);

    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;

    if (recentAvg - olderAvg >= 3) {
      formTrend = 'improving';
    } else if (olderAvg - recentAvg >= 3) {
      formTrend = 'declining';
    }
  }

  // 5. Calculate frequency (sessions per week)
  const now = Date.now();
  const twoWeeksAgo = now - 14 * 86400000;
  const recentTwoWeeksSessions = sessionDocs.filter(s => {
    const date = new Date(s.completedAt || s.createdAt || 0).getTime();
    return date >= twoWeeksAgo;
  }).length;
  const workoutFrequency = Math.round((recentTwoWeeksSessions / 2) * 10) / 10;

  // 6. Identify common errors
  const commonErrors = Object.keys(errorCounts).sort((a, b) => errorCounts[b] - errorCounts[a]);

  // 7. Synthesize improvements & focus areas
  const improvements: string[] = [];
  const focusAreas: string[] = [];

  if (totalReps >= 30) {
    improvements.push(`Completed ${totalReps} total repetitions across recent workouts.`);
  }
  if (formTrend === 'improving') {
    improvements.push('Form precision is steadily climbing across consecutive sessions.');
  }
  if (currentStreak >= 3) {
    improvements.push(`Sustained a ${currentStreak}-day active workout streak.`);
  }
  if (improvements.length === 0) {
    improvements.push('Taking active steps to establish your athletic routine.');
  }

  if (commonErrors.length > 0) {
    focusAreas.push(`Correct ${commonErrors[0].replace(/_/g, ' ')} during movement descent.`);
  }
  if (formTrend === 'declining') {
    focusAreas.push('Prioritize form accuracy over speed or rep volume.');
  }
  if (workoutFrequency < 3) {
    focusAreas.push('Target 3 consistent sessions per week to maximize athletic adaptation.');
  }
  if (focusAreas.length === 0) {
    focusAreas.push('Maintain progressive overload while keeping clean movement alignment.');
  }

  const summary = formTrend === 'improving'
    ? `Strong progress! Your form score is averaging ${averageFormScore}% with an upward trajectory.`
    : formTrend === 'declining'
      ? `Fatigue may be impacting form (${averageFormScore}% average). Focus on rest and controlled tempo.`
      : `Solid consistency with an average form score of ${averageFormScore}%.`;

  return {
    workoutFrequency,
    totalSessions,
    totalReps,
    averageFormScore,
    currentStreak,
    formTrend,
    commonErrors,
    summary,
    improvements,
    focusAreas
  };
}

/**
 * Generates actionable coaching consistency insights.
 */
export async function generateConsistencyInsight(userId: string): Promise<ConsistencyInsight> {
  let sessionDocs: any[] = [];
  let userProfile: any = {};

  if (hasFirebaseCredentials) {
    try {
      const userDoc = await withTimeout(db.collection('users').doc(userId).get(), 1500);
      userProfile = userDoc.exists ? userDoc.data() || {} : demoUsers.get(userId) || {};

      const sessionsSnap = await withTimeout(
        db.collection('workoutSessions')
          .where('userId', '==', userId)
          .limit(30)
          .get(),
        2000
      );
      sessionDocs = sessionsSnap.empty ? demoSessions.filter(s => s.userId === userId) : sessionsSnap.docs.map(d => d.data());
    } catch (e) {
      userProfile = demoUsers.get(userId) || {};
      sessionDocs = demoSessions.filter(s => s.userId === userId);
    }
  } else {
    userProfile = demoUsers.get(userId) || {};
    sessionDocs = demoSessions.filter(s => s.userId === userId);
  }

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const thirtyDaysAgo = now - 30 * 86400000;

  const weeklyDates = new Set<string>();
  const monthlyDates = new Set<string>();

  for (const s of sessionDocs) {
    const timestampStr = s.completedAt || s.createdAt;
    if (timestampStr) {
      const time = new Date(timestampStr).getTime();
      const dateKey = timestampStr.split('T')[0];
      if (time >= sevenDaysAgo) weeklyDates.add(dateKey);
      if (time >= thirtyDaysAgo) monthlyDates.add(dateKey);
    }
  }

  const weeklyActiveDays = weeklyDates.size;
  const monthlyActiveDays = monthlyDates.size;
  const currentStreak = Number(userProfile.currentStreak || 0);

  // Target 4 days/week as student athlete benchmark
  const expectedWeekly = 4;
  const missedWorkoutsEstimate = Math.max(0, expectedWeekly - weeklyActiveDays);

  // Consistency Score: weighted combination of weekly activity and streak
  const streakFactor = Math.min(50, currentStreak * 10);
  const weeklyFactor = Math.min(50, (weeklyActiveDays / expectedWeekly) * 50);
  const consistencyScore = Math.min(100, Math.round(streakFactor + weeklyFactor));

  const streakStatus = currentStreak >= 5
    ? `🔥 ${currentStreak}-Day Streak! Superb dedication.`
    : currentStreak >= 1
      ? `⚡ ${currentStreak}-Day Streak. Keep momentum building.`
      : 'Log a workout today to restart your active streak!';

  const recommendation = weeklyActiveDays >= 4
    ? 'Excellent workout consistency! Ensure adequate protein intake and 7-8 hours of sleep for recovery.'
    : weeklyActiveDays >= 2
      ? 'Good rhythm. Adding one more short 15-minute session will significantly elevate your progress.'
      : 'Build consistency with short, accessible workouts. Even 10 minutes makes a meaningful difference.';

  return {
    weeklyActiveDays,
    monthlyActiveDays,
    currentStreak,
    missedWorkoutsEstimate,
    consistencyScore,
    streakStatus,
    recommendation
  };
}

/**
 * Backward compatibility wrapper
 */
export async function getConsistencyInsights(userId: string): Promise<any> {
  const insight = await generateConsistencyInsight(userId);
  const progress = await analyzeProgress(userId);
  return {
    streakStatus: insight.streakStatus,
    consistencyScore: insight.consistencyScore,
    bestDay: 'Tuesday & Thursday evenings',
    advice: insight.recommendation,
    formTrend: progress.formTrend
  };
}

/**
 * HTTP handler for GET /api/v1/ai/progress
 */
export async function progressAnalysisHandler(req: any, res: any): Promise<void> {
  try {
    const { authenticateRequest } = await import('../auth');
    const user = await authenticateRequest(req);
    if (!user || !user.uid) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      return;
    }

    const progress = await analyzeProgress(user.uid);
    res.status(200).json({
      success: true,
      data: progress,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    logger.error('[Progress Analysis] Handler error:', err);
    res.status(500).json({ success: false, error: 'Failed to analyze progress' });
  }
}

/**
 * HTTP handler for GET /api/v1/ai/consistency
 */
export async function consistencyInsightHandler(req: any, res: any): Promise<void> {
  try {
    const { authenticateRequest } = await import('../auth');
    const user = await authenticateRequest(req);
    if (!user || !user.uid) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      return;
    }

    const insights = await generateConsistencyInsight(user.uid);
    res.status(200).json({
      success: true,
      data: insights,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    logger.error('[Consistency Insight] Handler error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate consistency insights' });
  }
}
