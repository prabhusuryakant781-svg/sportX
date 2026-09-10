/**
 * SportX Challenges — Update Progress (Phase 5)
 * Securely updates a user's challenge progress towards target reps.
 * 
 * Rules:
 * 1. PREVENT USERS FROM MODIFYING OTHER USERS' PROGRESS:
 *    Only the authenticated user's own participant record can be updated.
 * 2. Validate incremental reps (positive, realistic bounds).
 * 3. Enforce active challenge status.
 */

import { Challenge, UpdateProgressPayload } from './types';
import { getChallengeById, saveChallenge } from './joinChallenge';
import { completeChallengeInternal } from './completeChallenge';
import * as logger from 'firebase-functions/logger';

/**
 * Updates an athlete's progress towards a challenge target.
 * 
 * @param challengeId Unique ID of the challenge
 * @param authenticatedUid User UID extracted from authenticated Bearer token
 * @param payload Update progress payload (added reps, optional form score)
 */
export async function updateChallengeProgress(
  challengeId: string,
  authenticatedUid: string,
  payload: UpdateProgressPayload
): Promise<Challenge> {
  const challenge = await getChallengeById(challengeId);
  if (!challenge) {
    const err: any = new Error(`Challenge "${challengeId}" not found`);
    err.statusCode = 404;
    throw err;
  }

  // 1. Challenge status check
  if (challenge.status !== 'active') {
    const err: any = new Error(`Cannot log progress for challenge with status "${challenge.status}". Must be "active".`);
    err.statusCode = 400;
    throw err;
  }

  // 2. Anti-cheat: Ensure the authenticated user is an accepted participant
  const participant = challenge.participants[authenticatedUid];
  if (!participant) {
    logger.warn(`[Anti-Cheat] User ${authenticatedUid} attempted to update progress on challenge ${challengeId} without participating.`);
    const err: any = new Error('Forbidden: You are not a participant in this challenge.');
    err.statusCode = 403;
    throw err;
  }

  if (participant.status !== 'accepted') {
    const err: any = new Error(`Cannot update progress while participant status is "${participant.status}". Must accept first.`);
    err.statusCode = 400;
    throw err;
  }

  // 3. Validate added reps
  const added = Number(payload.addedReps);
  if (isNaN(added) || !Number.isInteger(added) || added <= 0 || added > 200) {
    const err: any = new Error('Field "addedReps" must be a positive integer between 1 and 200');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date().toISOString();
  participant.currentProgress += added;
  participant.lastActiveAt = now;

  if (payload.formScore && typeof payload.formScore === 'number') {
    const prevScore = participant.formScoreAvg || payload.formScore;
    participant.formScoreAvg = Math.round((prevScore + payload.formScore) / 2);
  }

  logger.info(`[Challenges] User ${authenticatedUid} logged +${added} reps on challenge ${challengeId}. Total: ${participant.currentProgress}/${challenge.targetReps}`);

  // 4. Check for target completion
  if (participant.currentProgress >= challenge.targetReps) {
    logger.info(`[Challenges] User ${authenticatedUid} reached target reps for challenge ${challengeId}! Finalizing completion.`);
    const { challenge: completedChallenge } = await completeChallengeInternal(challenge, authenticatedUid);
    return completedChallenge;
  }

  await saveChallenge(challenge);
  return challenge;
}
