/**
 * SportX Challenges — Join & Accept Challenge (Phase 5)
 * Handles athlete joining open challenges and accepting peer invitations.
 */

import { Challenge, challengesStore } from './types';
import { db, hasFirebaseCredentials } from '../config/firebase';
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
 * Retrieves a challenge by its unique ID.
 */
export async function getChallengeById(challengeId: string): Promise<Challenge | null> {
  if (hasFirebaseCredentials) {
    try {
      const snap = await withTimeout(db.collection('challenges').doc(challengeId).get(), 1500);
      if (snap.exists) return snap.data() as Challenge;
    } catch (e) {
      logger.warn('[Challenges] Firestore query failed, falling back to demoStore:', e);
    }
  }
  return challengesStore.get(challengeId) || null;
}

/**
 * Persists challenge state updates to database.
 */
export async function saveChallenge(challenge: Challenge): Promise<void> {
  challenge.updatedAt = new Date().toISOString();

  if (hasFirebaseCredentials) {
    try {
      await withTimeout(db.collection('challenges').doc(challenge.id).set(challenge, { merge: true }), 2000);
      return;
    } catch (e) {
      logger.warn('[Challenges] Firestore update failed, writing to demoStore:', e);
    }
  }

  challengesStore.set(challenge.id, challenge);
}

/**
 * Adds an authenticated user as a participant to a challenge.
 */
export async function joinChallenge(
  challengeId: string,
  user: { uid: string; name?: string }
): Promise<Challenge> {
  const challenge = await getChallengeById(challengeId);
  if (!challenge) {
    const err: any = new Error(`Challenge "${challengeId}" not found`);
    err.statusCode = 404;
    throw err;
  }

  if (challenge.status === 'completed' || challenge.status === 'cancelled' || challenge.status === 'expired') {
    const err: any = new Error(`Cannot join challenge with status "${challenge.status}"`);
    err.statusCode = 400;
    throw err;
  }

  const now = new Date().toISOString();
  const userName = user.name || 'Participant';

  challenge.participants[user.uid] = {
    userId: user.uid,
    userName,
    status: 'accepted',
    currentProgress: challenge.participants[user.uid]?.currentProgress || 0,
    lastActiveAt: now
  };

  // If was pending, start the challenge
  if (challenge.status === 'pending') {
    challenge.status = 'active';
    if (!challenge.startTime) challenge.startTime = now;
  }

  await saveChallenge(challenge);
  logger.info(`[Challenges] User ${user.uid} joined challenge ${challengeId}`);
  return challenge;
}

/**
 * Accepts an invitation to an existing challenge.
 */
export async function acceptChallenge(
  challengeId: string,
  userId: string
): Promise<Challenge> {
  const challenge = await getChallengeById(challengeId);
  if (!challenge) {
    const err: any = new Error(`Challenge "${challengeId}" not found`);
    err.statusCode = 404;
    throw err;
  }

  const participant = challenge.participants[userId];
  if (!participant) {
    const err: any = new Error(`User is not listed as an invited participant in challenge "${challengeId}"`);
    err.statusCode = 403;
    throw err;
  }

  const now = new Date().toISOString();
  participant.status = 'accepted';
  participant.lastActiveAt = now;

  // Set challenge to active
  challenge.status = 'active';
  if (!challenge.startTime) challenge.startTime = now;

  await saveChallenge(challenge);
  logger.info(`[Challenges] User ${userId} accepted challenge ${challengeId}`);
  return challenge;
}
