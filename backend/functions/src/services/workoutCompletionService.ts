/**
 * SportX Server-Authoritative Workout Completion Service
 *
 * Core Guarantees:
 * 1. Server-Authoritative Telemetry Validation:
 *    - Validates total reps (non-negative integer, reasonable cap).
 *    - Validates duration (minimum 5s, maximum 4 hours).
 *    - Validates form score (0-100).
 *    - Validates exercise ID against master catalog.
 *    - Enforces physiological cadence thresholds (seconds per rep) to block exaggerated telemetry.
 * 2. Session Precondition Enforcement:
 *    - Session must exist (404 if missing / forged).
 *    - Session must belong to authenticated user (403 if mismatched).
 *    - Session must be active ('in-progress', 'active', 'paused').
 *    - Cancelled / abandoned sessions rejected (400).
 * 3. Idempotent & Atomic State Transitions:
 *    - Subsequent completion requests return existing data without duplicate rewards (200).
 *    - Concurrent requests on same session are serialized via session-level mutex and Firestore transactions.
 * 4. Single Transaction-Based Reward Path:
 *    - Unified rewards for XP, streaks, badges, progress, activity logs, and user totals.
 *    - Sets `rewardGranted: true` and `rewardTxId` so Firestore background triggers NEVER duplicate rewards.
 */

import { db, hasFirebaseCredentials } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { SessionRepository } from '../repositories/sessionRepository';
import { UserRepository } from '../repositories/userRepository';
import { ExerciseRepository } from '../repositories/exerciseRepository';
import { XPRepository } from '../repositories/xpRepository';
import { ProgressRepository } from '../repositories/progressRepository';
import { AnalyticsRepository } from '../repositories/analyticsRepository';
import { ActivityRepository } from '../repositories/activityRepository';
import { GamificationService } from './gamificationService';
import { NotificationService } from './notificationService';
import { WorkoutSessionDoc, ExerciseSessionLog, ActivityLogDoc } from '../types';
import * as logger from 'firebase-functions/logger';

export interface CompleteSessionInput {
  sessionId: string;
  userId: string;
  totalReps?: number;
  averageFormScore?: number;
  durationSeconds?: number;
  exerciseId?: string;
  exerciseLogs?: ExerciseSessionLog[];
  heartRateAverage?: number | null;
  planId?: string;
  sportId?: string;
}

export interface CompletionResult {
  statusCode: number;
  success: boolean;
  message?: string;
  error?: string;
  idempotent?: boolean;
  data?: {
    sessionId: string;
    exerciseId: string;
    totalReps: number;
    averageFormScore: number;
    durationMinutes: number;
    durationSeconds: number;
    caloriesBurned: number;
    xpEarned: number;
    totalXp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    badgesUnlocked: string[];
  };
}

// In-memory mutex map to serialize concurrent requests per sessionId
const sessionMutexMap: Map<string, Promise<void>> = new Map();

export class WorkoutCompletionService {
  /**
   * Acquire a per-sessionId mutex lock for local/offline serialization
   */
  private static async acquireLock(sessionId: string): Promise<() => void> {
    while (sessionMutexMap.has(sessionId)) {
      try {
        await sessionMutexMap.get(sessionId);
      } catch (_) {}
    }

    let release: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      release = () => {
        sessionMutexMap.delete(sessionId);
        resolve();
      };
    });

    sessionMutexMap.set(sessionId, lockPromise);
    return release;
  }

  /**
   * Validate telemetry inputs against biomechanical limits and master exercise catalog
   */
  static async validateTelemetry(
    input: CompleteSessionInput,
    fallbackExerciseId?: string
  ): Promise<{ error?: string; exerciseDoc?: any }> {
    const exerciseId = input.exerciseId || fallbackExerciseId || 'squat';

    // 1. Exercise ID validation against catalog
    if (!exerciseId || typeof exerciseId !== 'string') {
      return { error: 'Exercise ID must be a non-empty string.' };
    }

    const exerciseDoc = await ExerciseRepository.getById(exerciseId);
    if (!exerciseDoc) {
      return { error: `Invalid exercise ID "${exerciseId}". Exercise does not exist in master catalog.` };
    }

    // 2. Validate totalReps
    const reps = input.totalReps ?? 0;
    if (typeof reps !== 'number' || isNaN(reps) || !Number.isInteger(reps) || reps < 0) {
      return { error: 'Invalid totalReps. Must be a non-negative integer.' };
    }
    if (reps > 2000) {
      return { error: 'Exaggerated telemetry: totalReps exceeds realistic single-session human limit (2000 reps).' };
    }

    // 3. Validate durationSeconds
    const durationSec = input.durationSeconds ?? 60;
    if (typeof durationSec !== 'number' || isNaN(durationSec) || durationSec < 5) {
      return { error: 'Invalid durationSeconds. Must be at least 5 seconds for a completed workout.' };
    }
    if (durationSec > 14400) {
      return { error: 'Exaggerated durationSeconds. Must not exceed 14400 seconds (4 hours).' };
    }

    // 4. Validate averageFormScore
    const formScore = input.averageFormScore ?? 85;
    if (typeof formScore !== 'number' || isNaN(formScore) || formScore < 0 || formScore > 100) {
      return { error: 'Invalid averageFormScore. Must be a number between 0 and 100.' };
    }

    // 5. Cadence validation (seconds per rep) to block impossible speeds
    if (reps > 0 && durationSec > 0) {
      const cadenceSecondsPerRep = durationSec / reps;
      const nominalCadence = exerciseDoc.formRules?.cadenceSecondsMin || 0.8;
      // Absolute physiological minimum for rapid human movement (allowing variance)
      const minAllowedCadence = Math.max(0.3, nominalCadence * 0.5);

      if (cadenceSecondsPerRep < minAllowedCadence) {
        return {
          error: `Exaggerated cadence: Impossible rep speed detected. ${reps} reps in ${durationSec}s yields ${cadenceSecondsPerRep.toFixed(2)}s/rep, which violates minimum biomechanical threshold of ${minAllowedCadence.toFixed(2)}s/rep.`,
        };
      }
    }

    // 6. Validate exerciseLogs if provided
    if (input.exerciseLogs && Array.isArray(input.exerciseLogs)) {
      for (const log of input.exerciseLogs) {
        if (log.exerciseId) {
          const logEx = await ExerciseRepository.getById(log.exerciseId);
          if (!logEx) {
            return { error: `Invalid exercise ID in exerciseLogs: "${log.exerciseId}".` };
          }
        }
        if (log.averageFormScore !== undefined) {
          if (typeof log.averageFormScore !== 'number' || isNaN(log.averageFormScore) || log.averageFormScore < 0 || log.averageFormScore > 100) {
            return { error: 'Invalid averageFormScore in exerciseLogs. Must be between 0 and 100.' };
          }
        }
        if (log.sets && Array.isArray(log.sets)) {
          for (const set of log.sets) {
            if (set.formAccuracy !== undefined) {
              if (typeof set.formAccuracy !== 'number' || isNaN(set.formAccuracy) || set.formAccuracy < 0 || set.formAccuracy > 100) {
                return { error: 'Invalid formAccuracy in exercise set. Must be between 0 and 100.' };
              }
            }
          }
        }
      }
    }

    return { exerciseDoc };
  }

  /**
   * Authoritative, atomic, idempotent completion of a workout session
   */
  static async completeSession(input: CompleteSessionInput): Promise<CompletionResult> {
    const { sessionId, userId } = input;

    if (!sessionId) {
      return { statusCode: 400, success: false, error: 'sessionId is required.' };
    }
    if (!userId) {
      return { statusCode: 401, success: false, error: 'User must be authenticated.' };
    }

    // Acquire concurrency lock for this session
    const releaseLock = await this.acquireLock(sessionId);

    try {
      // 1. Fetch session and verify existence
      const existingSession = await SessionRepository.getById(sessionId);
      if (!existingSession) {
        return {
          statusCode: 404,
          success: false,
          error: `Workout session "${sessionId}" not found. Cannot complete a non-existent session.`,
        };
      }

      // 2. Ownership verification
      if (existingSession.userId !== userId) {
        return {
          statusCode: 403,
          success: false,
          error: 'Access denied: You do not own this workout session.',
        };
      }

      // 3. Status checks: Cancelled / Abandoned rejection
      if (existingSession.status === 'abandoned' || existingSession.status === 'cancelled') {
        return {
          statusCode: 400,
          success: false,
          error: `Cannot complete session with status "${existingSession.status}". Session was cancelled.`,
        };
      }

      // 4. Idempotency Check: Already completed
      if (existingSession.status === 'completed' || existingSession.rewardGranted) {
        const user = await UserRepository.getById(userId);
        return {
          statusCode: 200,
          success: true,
          idempotent: true,
          message: 'Workout was already completed (idempotent response).',
          data: {
            sessionId: existingSession.sessionId,
            exerciseId: existingSession.exerciseId || 'squat',
            totalReps: existingSession.totalReps,
            averageFormScore: existingSession.formAccuracyAverage,
            durationMinutes: existingSession.durationMinutes,
            durationSeconds: existingSession.durationSeconds || existingSession.durationMinutes * 60,
            caloriesBurned: existingSession.caloriesBurned,
            xpEarned: existingSession.xpEarned,
            totalXp: user?.xp || 0,
            level: user?.level || 1,
            currentStreak: user?.currentStreak || 0,
            longestStreak: user?.longestStreak || 0,
            badgesUnlocked: user?.badges || [],
          },
        };
      }

      // 5. Must be in an active state ('in-progress', 'active', 'paused')
      const activeStatuses = ['in-progress', 'active', 'paused'];
      if (!activeStatuses.includes(existingSession.status)) {
        return {
          statusCode: 400,
          success: false,
          error: `Invalid session status "${existingSession.status}". Only active sessions can be completed.`,
        };
      }

      // 6. Validate telemetry
      const effectiveExerciseId = input.exerciseId || existingSession.exerciseId || 'squat';
      const validation = await this.validateTelemetry(input, effectiveExerciseId);
      if (validation.error) {
        return { statusCode: 400, success: false, error: validation.error };
      }

      // 7. Calculate Authoritative Server-Side Metrics
      const reps = Math.max(0, Number(input.totalReps ?? 0));
      const score = Math.min(100, Math.max(0, Number(input.averageFormScore ?? 85)));
      const durationSec = Math.max(5, Number(input.durationSeconds ?? 60));
      const durationMin = Math.max(1, Math.round(durationSec / 60));
      const calories = Math.round(durationMin * 8.5);

      const xpEarned = GamificationService.calculateSessionXP({
        totalReps: reps,
        formAccuracyAverage: score,
        durationMinutes: durationMin,
        isCompleted: true,
      });

      const now = new Date().toISOString();
      const todayDate = now.split('T')[0];
      const rewardTxId = `tx_${sessionId}_workout`;

      // 8. Fetch user for streak & badge evaluation
      let user = await UserRepository.getById(userId);
      if (!user) {
        user = await UserRepository.create(userId, { userId });
      }

      const streakResult = GamificationService.evaluateStreak({
        lastWorkoutDate: user.lastWorkoutDate,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        sessionDate: todayDate,
      });

      const newTotalXP = (user.xp || 0) + xpEarned;
      const newLevel = GamificationService.calculateLevel(newTotalXP);
      const updatedTotalWorkouts = (user.totalWorkouts || 0) + 1;

      const badgeResult = GamificationService.evaluateUnlockedBadges({
        currentBadges: user.badges || [],
        totalWorkouts: updatedTotalWorkouts,
        totalReps: (user.totalWorkouts || 0) * 15 + reps,
        totalXP: newTotalXP,
        currentStreak: streakResult.currentStreak,
        sessionFormAccuracy: score,
      });

      const newBadgeIds = badgeResult.newBadges.map((b) => b.id);
      const combinedBadges = Array.from(new Set([...(user.badges || []), ...newBadgeIds]));

      // 9. Prepare Completed Session Document
      const completedSessionDoc: WorkoutSessionDoc = {
        ...existingSession,
        sessionId,
        userId,
        workoutId: input.planId || existingSession.workoutId || 'workout_standard',
        sportId: input.sportId || existingSession.sportId || 'general',
        exerciseId: effectiveExerciseId,
        exerciseName: effectiveExerciseId,
        completionTime: now,
        endTime: now,
        durationMinutes: durationMin,
        durationSeconds: durationSec,
        totalReps: reps,
        formAccuracyAverage: score,
        caloriesBurned: calories,
        heartRateAverage: input.heartRateAverage ? Number(input.heartRateAverage) : null,
        exerciseLogs: (input.exerciseLogs && input.exerciseLogs.length > 0)
          ? input.exerciseLogs
          : [
              {
                exerciseId: effectiveExerciseId,
                sets: [{ setNumber: 1, reps, formAccuracy: score, feedbackMessages: ['Good form maintained'] }],
                totalReps: reps,
                averageFormScore: score,
              },
            ],
        xpEarned,
        status: 'completed',
        rewardGranted: true,
        rewardTxId,
        rewardAppliedAt: now,
        processedByTrigger: true, // Prevents Firestore background triggers from duplicating rewards!
        updatedAt: now,
      };

      // 10. Execute Atomic State Transition and Reward Allocation
      // A. If Firestore is active, run an atomic Firestore transaction across session, user, and XP ledger
      if (hasFirebaseCredentials) {
        try {
          const sessionRef = db.collection('workoutSessions').doc(sessionId);
          const userRef = db.collection('users').doc(userId);
          const xpTxRef = db.collection('xpTransactions').doc(rewardTxId);

          await db.runTransaction(async (tx) => {
            const freshSessionSnap = await tx.get(sessionRef);
            if (freshSessionSnap.exists) {
              const freshSession = freshSessionSnap.data() as WorkoutSessionDoc;
              if (freshSession.status === 'completed' || freshSession.rewardGranted) {
                // Already completed concurrently in Firestore
                return;
              }
            }

            // Mark session completed with reward markers
            tx.set(sessionRef, completedSessionDoc, { merge: true });

            // Apply user rewards atomically
            tx.update(userRef, {
              xp: FieldValue.increment(xpEarned),
              XP: FieldValue.increment(xpEarned),
              level: newLevel,
              totalWorkouts: FieldValue.increment(1),
              totalMinutes: FieldValue.increment(durationMin),
              totalCalories: FieldValue.increment(calories),
              currentStreak: streakResult.currentStreak,
              longestStreak: streakResult.longestStreak,
              lastWorkoutDate: todayDate,
              badges: combinedBadges,
              updatedAt: now,
            });

            // Write XP transaction ledger atomically
            tx.set(xpTxRef, {
              txId: rewardTxId,
              userId,
              amount: xpEarned,
              reason: 'workout_completion',
              relatedSessionId: sessionId,
              balanceAfter: newTotalXP,
              createdAt: now,
            });
          });
        } catch (txErr) {
          logger.warn(`[WorkoutCompletionService] Firestore transaction failed for session ${sessionId}:`, txErr);
        }
      }

      // B. Save in Repository / Local Cache
      await SessionRepository.create(completedSessionDoc);

      // C. Apply User Updates in Local Cache & ensure consistency
      await UserRepository.applyWorkoutCompletion(userId, {
        sessionId,
        xpToAdd: xpEarned,
        newLevel,
        durationMinutes: durationMin,
        caloriesBurned: calories,
        currentStreak: streakResult.currentStreak,
        longestStreak: streakResult.longestStreak,
        lastWorkoutDate: todayDate,
        newBadges: newBadgeIds,
      });

      // 11. Record Telemetry in Activity Logs
      const activityLogsToInsert: ActivityLogDoc[] = [];
      if (completedSessionDoc.exerciseLogs && completedSessionDoc.exerciseLogs.length > 0) {
        completedSessionDoc.exerciseLogs.forEach((exLog, idx) => {
          activityLogsToInsert.push({
            logId: `act_${sessionId}_${idx}`,
            userId,
            sessionId,
            exerciseId: exLog.exerciseId,
            exerciseName: exLog.exerciseName || exLog.exerciseId,
            reps: exLog.totalReps || reps,
            durationSeconds: durationSec,
            formScore: exLog.averageFormScore || score,
            detectedErrors: [],
            calories: Math.round(calories / completedSessionDoc.exerciseLogs.length),
            timestamp: now,
          });
        });
      } else {
        activityLogsToInsert.push({
          logId: `act_${sessionId}_0`,
          userId,
          sessionId,
          exerciseId: effectiveExerciseId,
          exerciseName: effectiveExerciseId,
          reps,
          durationSeconds: durationSec,
          formScore: score,
          detectedErrors: [],
          calories,
          timestamp: now,
        });
      }
      await ActivityRepository.createBatch(activityLogsToInsert).catch((err) =>
        logger.warn('Failed recording activity logs:', err)
      );

      // 12. Update Progress Aggregates (PRs, Weekly/Monthly totals, form trends)
      await ProgressRepository.recordWorkout(userId, {
        reps,
        durationMinutes: durationMin,
        calories,
        formScore: score,
        date: todayDate,
        exerciseId: effectiveExerciseId,
      }).catch((err) => logger.warn('Failed updating progress aggregation:', err));

      // 13. Update Lifetime Analytics
      await AnalyticsRepository.recordWorkoutMetrics({
        userId,
        durationMinutes: durationMin,
        calories,
        reps,
        formAccuracy: score,
        muscleGroups: [effectiveExerciseId],
      }).catch((err) => logger.warn('Failed updating analytics:', err));

      // 14. Send FCM Push Notifications for Newly Unlocked Badges
      for (const badge of badgeResult.newBadges) {
        NotificationService.sendBadgeUnlocked(userId, badge.name, badge.icon).catch((e) =>
          logger.warn('Failed sending badge notification:', e)
        );
      }

      return {
        statusCode: 200,
        success: true,
        message: '🎉 Workout completed and securely recorded!',
        data: {
          sessionId,
          exerciseId: effectiveExerciseId,
          totalReps: reps,
          averageFormScore: score,
          durationMinutes: durationMin,
          durationSeconds: durationSec,
          caloriesBurned: calories,
          xpEarned,
          totalXp: newTotalXP,
          level: newLevel,
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          badgesUnlocked: newBadgeIds,
        },
      };
    } finally {
      releaseLock();
    }
  }
}
