import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { WorkoutCompletionService } from '../services/workoutCompletionService';
import { WorkoutSessionDoc } from '../types';
import * as logger from 'firebase-functions/logger';

/**
 * 2nd Gen Firestore Trigger: onWorkoutCompleted
 * Watches workoutSessions/{sessionId} for newly completed workouts.
 * Uses the exact same single transaction-based reward path via WorkoutCompletionService.
 */
export const onWorkoutCompleted = onDocumentWritten(
  'workoutSessions/{sessionId}',
  async (event) => {
    const after = event.data?.after;
    if (!after || !after.exists) {
      return; // Document deleted
    }

    const session = after.data() as WorkoutSessionDoc;

    // Only process when session transitioned to or was created as 'completed'
    if (session.status !== 'completed') {
      return;
    }

    // Single unified reward path & idempotency guard:
    // If reward was already granted via API route or previous run, exit immediately to prevent duplicate rewards.
    if (session.rewardGranted || session.processedByTrigger) {
      logger.info(`[Firestore Trigger] Session ${event.params.sessionId} already granted rewards / processed. Skipping.`);
      return;
    }

    const sessionId = event.params.sessionId;
    const userId = session.userId;
    logger.info(`[Firestore Trigger] Processing onWorkoutCompleted for session: ${sessionId}, user: ${userId}`);

    try {
      // Mark trigger as processed to prevent any re-entrance
      await after.ref.update({ processedByTrigger: true });

      // Apply rewards using the single transaction-based reward path
      const result = await WorkoutCompletionService.completeSession({
        sessionId,
        userId,
        totalReps: session.totalReps,
        averageFormScore: session.formAccuracyAverage,
        durationSeconds: session.durationSeconds || (session.durationMinutes * 60),
        exerciseId: session.exerciseId,
        exerciseLogs: session.exerciseLogs,
        heartRateAverage: session.heartRateAverage,
        planId: session.workoutId,
        sportId: session.sportId,
      });

      if (!result.success && !result.idempotent) {
        logger.warn(`[Firestore Trigger] WorkoutCompletionService returned error for session ${sessionId}:`, result.error);
      } else {
        logger.info(`[Firestore Trigger] Successfully applied unified rewards for session ${sessionId}`);
      }
    } catch (err) {
      logger.error(`[Firestore Trigger] Error in onWorkoutCompleted for session ${sessionId}:`, err);
    }
  }
);

