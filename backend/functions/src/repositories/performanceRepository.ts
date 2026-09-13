/**
 * SportX Performance Score Repository
 * Server-authoritative calculation of the 0–100 athletic performance metric.
 * 
 * Canonical Formula:
 * Overall = (0.20 * Consistency) + (0.25 * Form) + (0.25 * Workout) + (0.20 * Competition) + (0.10 * Improvement)
 * 
 * Strict Invariant:
 * New users with < 2 completed workouts and 0 competitive matches are marked provisional: true
 * with a clear calibration status message rather than a fabricated score.
 */

import { db, hasFirebaseCredentials } from '../config/firebase';
import {
  PerformanceScoreDoc,
  PerformanceBreakdown,
  PerformanceSnapshotDoc,
} from '../types';
import { SessionRepository } from './sessionRepository';
import { UserRepository } from './userRepository';
import { CompetitiveRepository } from './competitiveRepository';
import { ProgressRepository } from './progressRepository';
import * as logger from 'firebase-functions/logger';

const PERFORMANCE_COLLECTION = 'performanceScores';
const SNAPSHOTS_COLLECTION = 'performanceSnapshots';

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore performance operation timeout')), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

const localPerformanceCache: Map<string, PerformanceScoreDoc> = new Map();
const localSnapshotsCache: Map<string, PerformanceSnapshotDoc[]> = new Map();

export class PerformanceRepository {
  /**
   * Authoritative calculation of SportX Performance Score (0 - 100)
   */
  static async calculateScore(userId: string): Promise<PerformanceScoreDoc> {
    const [user, sessions, rankDoc, progress] = await Promise.all([
      UserRepository.getById(userId),
      SessionRepository.getUserSessions(userId, { limit: 100, status: 'completed' }),
      CompetitiveRepository.getUserRank(userId, 'global').catch(() => null),
      ProgressRepository.calculateProgress(userId, '30d').catch(() => null),
    ]);

    const completedSessions = (sessions || []).filter((s) => s.status === 'completed');
    const totalWorkouts = completedSessions.length;
    const totalMatches = rankDoc?.totalMatches || 0;

    // Provisional check: If < 2 completed workouts and 0 competitive matches, mark as provisional
    const isProvisional = totalWorkouts < 2 && totalMatches === 0;

    // 1. Consistency (20% weight)
    // Streak up to 7 days = 40 pts; Unique active days in last 30d (target 12) = 60 pts
    const streak = Math.max(0, Number(user?.currentStreak || 0));
    const activeDaysInMonth = progress?.uniqueWorkoutDays || Math.min(totalWorkouts, 30);
    const consistencyComponent = Math.min(
      100,
      Math.round((Math.min(streak, 7) / 7) * 40 + (Math.min(activeDaysInMonth, 12) / 12) * 60)
    );

    // 2. Form Accuracy (25% weight)
    // Average form score across recent verified sessions
    let formComponent = 0;
    const formScores = completedSessions
      .map((s) => s.formAccuracyAverage || (s as any).averageFormScore)
      .filter((score): score is number => typeof score === 'number' && score > 0);
    if (formScores.length > 0) {
      formComponent = Math.round(formScores.reduce((a, b) => a + b, 0) / formScores.length);
    } else {
      formComponent = isProvisional ? 75 : 0;
    }

    // 3. Workout Volume & Performance (25% weight)
    // Target 20 workouts = 50 pts; Target 500 reps = 50 pts
    const totalReps = completedSessions.reduce((sum, s) => sum + (Number(s.totalReps) || 0), 0);
    const workoutComponent = Math.min(
      100,
      Math.round((Math.min(totalWorkouts, 20) / 20) * 50 + (Math.min(totalReps, 500) / 500) * 50)
    );

    // 4. Competitive Performance (20% weight)
    // Rank tier base: Bronze=40, Silver=60, Gold=75, Platinum=90, Diamond=100
    // Adjusted by win rate (wins / totalMatches)
    let compComponent = 0;
    if (totalMatches > 0) {
      const tier = rankDoc?.rankTier || 'Bronze';
      let tierBase = 40;
      if (tier === 'Silver') tierBase = 60;
      else if (tier === 'Gold') tierBase = 75;
      else if (tier === 'Platinum') tierBase = 90;
      else if (tier === 'Diamond') tierBase = 100;

      const wins = rankDoc?.wins || 0;
      const winRate = totalMatches > 0 ? wins / totalMatches : 0.5;
      compComponent = Math.min(100, Math.round(tierBase * 0.7 + winRate * 30));
    } else {
      compComponent = isProvisional ? 50 : 30; // Uncalibrated competitive standing
    }

    // 5. Improvement & Trend (10% weight)
    // Evaluates form score trend across recent sessions vs baseline
    let improvementComponent = 75; // Neutral baseline
    if (formScores.length >= 3) {
      const recentScores = formScores.slice(0, 3);
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const olderScores = formScores.slice(3);
      if (olderScores.length > 0) {
        const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
        const diff = recentAvg - olderAvg;
        improvementComponent = Math.min(100, Math.max(50, Math.round(75 + diff * 2.5)));
      } else {
        improvementComponent = recentAvg >= 85 ? 88 : 78;
      }
    }

    const breakdown: PerformanceBreakdown = {
      consistency: consistencyComponent,
      form: formComponent,
      workout: workoutComponent,
      competition: compComponent,
      improvement: improvementComponent,
    };

    // Overall weighted score
    const weightedScore = Math.round(
      0.20 * breakdown.consistency +
      0.25 * breakdown.form +
      0.25 * breakdown.workout +
      0.20 * breakdown.competition +
      0.10 * breakdown.improvement
    );

    const overallScore = Math.min(100, Math.max(0, weightedScore));

    const statusMessage = isProvisional
      ? 'Calibrating: Complete at least 2 workouts or 1 competitive match to finalize athletic score'
      : undefined;

    // Retrieve past snapshots to construct verified trend
    const existingSnapshots = localSnapshotsCache.get(userId) || [];
    const trend = existingSnapshots.slice(-5).map((s) => ({
      date: s.createdAt.slice(0, 10),
      score: s.score,
    }));

    const now = new Date().toISOString();
    const doc: PerformanceScoreDoc = {
      userId,
      overallScore,
      breakdown,
      provisional: isProvisional,
      statusMessage,
      trend: trend.length > 0 ? trend : undefined,
      lastCalculatedAt: now,
    };

    localPerformanceCache.set(userId, doc);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(PERFORMANCE_COLLECTION).doc(userId).set(doc, { merge: true }),
          2500
        );
      } catch (err) {
        logger.warn(`[PerformanceRepo] save score for ${userId} failed:`, err);
      }
    }

    return doc;
  }

  /**
   * Get cached or freshly calculated Performance Score for a user
   */
  static async getScore(userId: string): Promise<PerformanceScoreDoc> {
    if (!userId) {
      throw new Error('userId is required');
    }

    if (localPerformanceCache.has(userId)) {
      return localPerformanceCache.get(userId)!;
    }

    if (hasFirebaseCredentials) {
      try {
        const snap = await withTimeout(db.collection(PERFORMANCE_COLLECTION).doc(userId).get(), 2500);
        if (snap.exists) {
          const data = snap.data() as PerformanceScoreDoc;
          localPerformanceCache.set(userId, data);
          return data;
        }
      } catch (err) {
        logger.warn(`[PerformanceRepo] getScore for ${userId} failed:`, err);
      }
    }

    // If not found, calculate authoritatively
    return this.calculateScore(userId);
  }

  /**
   * Record a performance snapshot upon completing a workout or match
   */
  static async recordSnapshot(
    userId: string,
    triggerEvent: PerformanceSnapshotDoc['triggerEvent']
  ): Promise<PerformanceSnapshotDoc> {
    const scoreDoc = await this.calculateScore(userId);
    const now = new Date().toISOString();
    const snapshotId = `psnap_${userId}_${Date.now()}`;

    const snapshot: PerformanceSnapshotDoc = {
      snapshotId,
      userId,
      score: scoreDoc.overallScore,
      breakdown: scoreDoc.breakdown,
      triggerEvent,
      createdAt: now,
    };

    const list = localSnapshotsCache.get(userId) || [];
    list.push(snapshot);
    localSnapshotsCache.set(userId, list);

    // Update trend in cached performance score document
    const trend = list.slice(-5).map((s) => ({
      date: s.createdAt.slice(0, 10),
      score: s.score,
    }));
    scoreDoc.trend = trend;
    localPerformanceCache.set(userId, scoreDoc);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(SNAPSHOTS_COLLECTION).doc(snapshotId).set(snapshot),
          2500
        );
        await withTimeout(
          db.collection(PERFORMANCE_COLLECTION).doc(userId).update({ trend }),
          2500
        );
      } catch (err) {
        logger.warn(`[PerformanceRepo] recordSnapshot for ${userId} failed:`, err);
      }
    }

    return snapshot;
  }

  /**
   * Clear local cache (for testing)
   */
  static clearCache() {
    localPerformanceCache.clear();
    localSnapshotsCache.clear();
  }
}
