/**
 * SportX Challenges — Complete Challenge & XP Awarding (Phase 5)
 * Finalizes challenge completion, awards server-side XP, updates user streaks,
 * and determines winners.
 * 
 * Rules:
 * 1. Server-side XP calculation (anti-cheat: client cannot self-award scores or XP).
 * 2. Update user profile and streak via gamification engine.
 */

import { Challenge } from './types';
import { getChallengeById, saveChallenge } from './joinChallenge';
import { db, hasFirebaseCredentials } from '../config/firebase';
import { users as demoUsers } from '../config/demoStore';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

export interface ChallengeCompletionResult {
  challenge: Challenge;
  xpAwarded: number;
  isWinner: boolean;
}

/**
 * Internal logic for finalizing participant challenge completion and awarding XP.
 */
export async function completeChallengeInternal(
  challenge: Challenge,
  userId: string
): Promise<ChallengeCompletionResult> {
  const participant = challenge.participants[userId];
  if (!participant) {
    const err: any = new Error('User is not a participant in this challenge');
    err.statusCode = 403;
    throw err;
  }

  const now = new Date().toISOString();
  participant.status = 'completed';
  participant.completedAt = now;

  // Determine if this user is the winner
  let isWinner = false;
  if (!challenge.winnerId) {
    challenge.winnerId = userId;
    isWinner = true;
  } else if (challenge.winnerId === userId) {
    isWinner = true;
  }

  // Calculate XP Server-Side (Anti-Cheat)
  let xpAwarded = challenge.rewardXp || 150;
  if (isWinner) {
    xpAwarded += 50; // First-place winner bonus
  }
  if (participant.formScoreAvg && participant.formScoreAvg >= 85) {
    xpAwarded += 30; // Form accuracy bonus
  }

  participant.xpAwarded = xpAwarded;

  // Check if all accepted participants have finished
  const acceptedParticipants = Object.values(challenge.participants).filter(
    p => p.status === 'accepted' || p.status === 'completed'
  );
  const allCompleted = acceptedParticipants.every(p => p.status === 'completed');

  if (allCompleted || isWinner) {
    challenge.status = 'completed';
  }

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore user XP update timeout')), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

  // Update user profile with awarded XP and streak
  try {
    const demoUser = demoUsers.get(userId);
    if (demoUser) {
      demoUser.totalXp = (demoUser.totalXp || 0) + xpAwarded;
      demoUser.lastWorkoutDate = now.split('T')[0];
    }

    if (hasFirebaseCredentials) {
      const userRef = db.collection('users').doc(userId);
      await withTimeout(
        userRef.set(
          {
            totalXp: admin.firestore.FieldValue.increment(xpAwarded),
            lastWorkoutDate: now.split('T')[0]
          },
          { merge: true }
        ),
        2000
      );
    }
  } catch (gamificationErr) {
    logger.warn('[Challenges] Could not update Firestore XP for user:', gamificationErr);
  }

  await saveChallenge(challenge);
  logger.info(`[Challenges] User ${userId} completed challenge ${challenge.id}. Awarded ${xpAwarded} XP! (Winner: ${isWinner})`);

  return {
    challenge,
    xpAwarded,
    isWinner
  };
}

/**
 * Endpoint-callable completion function.
 */
export async function completeChallenge(
  challengeId: string,
  authenticatedUid: string
): Promise<ChallengeCompletionResult> {
  const challenge = await getChallengeById(challengeId);
  if (!challenge) {
    const err: any = new Error(`Challenge "${challengeId}" not found`);
    err.statusCode = 404;
    throw err;
  }

  const participant = challenge.participants[authenticatedUid];
  if (!participant) {
    const err: any = new Error('Forbidden: You are not a participant in this challenge.');
    err.statusCode = 403;
    throw err;
  }

  if (participant.currentProgress < challenge.targetReps) {
    const err: any = new Error(
      `Cannot complete challenge: Current progress (${participant.currentProgress}) has not reached the target (${challenge.targetReps})`
    );
    err.statusCode = 400;
    throw err;
  }

  return await completeChallengeInternal(challenge, authenticatedUid);
}
