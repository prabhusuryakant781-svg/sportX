/**
 * SportX Challenges — Create Challenge (Phase 5)
 * Initializes a new peer or open challenge with target metrics, participants, and reward XP.
 */

import { Challenge, CreateChallengePayload, challengesStore } from './types';
import { db, hasFirebaseCredentials } from '../config/firebase';
import { nextId } from '../config/demoStore';
import * as logger from 'firebase-functions/logger';

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore challenge operation timeout')), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Creates a new fitness challenge.
 */
export async function createChallenge(
  creator: { uid: string; name?: string },
  payload: CreateChallengePayload
): Promise<Challenge> {
  if (!payload || typeof payload !== 'object') {
    const err: any = new Error('Challenge payload must be a non-null object');
    err.statusCode = 400;
    throw err;
  }

  // 1. Validate exerciseId
  if (!payload.exerciseId || typeof payload.exerciseId !== 'string' || payload.exerciseId.trim().length === 0) {
    const err: any = new Error('Field "exerciseId" is required');
    err.statusCode = 400;
    throw err;
  }
  const cleanExerciseId = payload.exerciseId.trim().toLowerCase();

  // 2. Validate targetReps
  const targetReps = Number(payload.targetReps);
  if (isNaN(targetReps) || !Number.isInteger(targetReps) || targetReps < 5 || targetReps > 500) {
    const err: any = new Error('Field "targetReps" is required and must be an integer between 5 and 500');
    err.statusCode = 400;
    throw err;
  }

  const challengeId = nextId('ch');
  const now = new Date().toISOString();
  const durationDays = Math.min(Math.max(Number(payload.durationDays) || 3, 1), 30);
  const endTime = new Date(Date.now() + durationDays * 86400000).toISOString();
  const rewardXp = payload.rewardXp ? Math.max(50, Number(payload.rewardXp)) : Math.max(100, targetReps * 4);

  const creatorName = creator.name || 'Student Athlete';

  const newChallenge: Challenge = {
    id: challengeId,
    creatorId: creator.uid,
    creatorName,
    exerciseId: cleanExerciseId,
    targetReps,
    status: 'pending',
    rewardXp,
    message: payload.message || `I challenge you to ${targetReps} ${cleanExerciseId}s!`,
    participants: {
      [creator.uid]: {
        userId: creator.uid,
        userName: creatorName,
        status: 'accepted',
        currentProgress: 0,
        lastActiveAt: now
      }
    },
    createdAt: now,
    updatedAt: now,
    endTime
  };

  // If a specific opponent was challenged, add them as invited
  if (payload.challengeeId && payload.challengeeId !== creator.uid) {
    newChallenge.participants[payload.challengeeId] = {
      userId: payload.challengeeId,
      userName: payload.challengeeName || 'Challenged Athlete',
      status: 'invited',
      currentProgress: 0
    };
  }

  // Persist to Firestore or demo store
  if (hasFirebaseCredentials) {
    try {
      await withTimeout(db.collection('challenges').doc(challengeId).set(newChallenge), 2500);
      logger.info(`[Challenges] Created challenge ${challengeId} in Firestore`);
      return newChallenge;
    } catch (err) {
      logger.warn('[Challenges] Firestore save failed, using demoStore fallback:', err);
    }
  }

  challengesStore.set(challengeId, newChallenge);
  return newChallenge;
}
