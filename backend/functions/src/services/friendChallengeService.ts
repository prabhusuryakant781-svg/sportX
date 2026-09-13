/**
 * SportX Friend Challenge Service
 * Authoritative lifecycle management for peer-to-peer friend challenges:
 * Creation -> Acceptance -> Real Vision Telemetry Submission -> Server Verification -> Rewards
 * 
 * Rules:
 * - Both athletes must be confirmed friends.
 * - Supported exercises are strictly camera-tracked: squat, pushup, jumping_jacks.
 * - Server authoritatively computes winners and assigns XP / streaks without double-granting.
 */

import { db, hasFirebaseCredentials } from '../config/firebase';
import {
  FriendChallengeDoc,
  FriendChallengeType,
  FriendChallengeParticipantResult,
  CompetitiveVerificationPayload,
} from '../types/competitive';
import { FriendRepository } from '../repositories/friendRepository';
import { UserRepository } from '../repositories/userRepository';
import { NotificationRepository } from '../repositories/notificationRepository';
import * as logger from 'firebase-functions/logger';

const FRIEND_CHALLENGES_COLLECTION = 'friendChallenges';

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore friend challenge operation timeout')), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

const localFriendChallengesCache: Map<string, FriendChallengeDoc> = new Map();

export class FriendChallengeService {
  /**
   * Create a new friend challenge
   */
  static async createChallenge(params: {
    challengerId: string;
    opponentId: string;
    exerciseId: string;
    sportId?: string;
    challengeType?: FriendChallengeType;
    targetReps?: number;
    durationSeconds?: number;
    rules?: string;
  }): Promise<FriendChallengeDoc> {
    const {
      challengerId,
      opponentId,
      exerciseId,
      sportId = 'athletics',
      challengeType = 'most_reps',
      targetReps = 25,
      durationSeconds = 60,
      rules,
    } = params;

    if (!challengerId || !opponentId) {
      throw new Error('Both challengerId and opponentId are required');
    }
    if (challengerId === opponentId) {
      throw new Error('Cannot challenge yourself');
    }

    // Verify friendship
    const areFriends = await FriendRepository.isFriend(challengerId, opponentId);
    if (!areFriends) {
      throw new Error('You can only send challenges to confirmed friends');
    }

    const [challenger, opponent] = await Promise.all([
      UserRepository.getById(challengerId),
      UserRepository.getById(opponentId),
    ]);
    if (!challenger || !opponent) {
      throw new Error('User not found');
    }

    const validExercises = ['squat', 'pushup', 'jumping_jacks'];
    const cleanEx = exerciseId.toLowerCase().trim();
    if (!validExercises.includes(cleanEx)) {
      throw new Error(`Exercise "${exerciseId}" is not camera-verified. Must be squat, pushup, or jumping_jacks.`);
    }

    if (durationSeconds < 15 || durationSeconds > 300) {
      throw new Error('Challenge duration must be between 15 and 300 seconds');
    }
    if (targetReps <= 0 || targetReps > 500) {
      throw new Error('Target reps must be between 1 and 500');
    }

    const now = new Date().toISOString();
    const challengeId = `fchal_${challengerId}_${opponentId}_${Date.now()}`;

    const doc: FriendChallengeDoc = {
      challengeId,
      challengerId,
      challengerName: challenger.name || 'Athlete',
      challengerAvatar: challenger.profileImage || '',
      opponentId,
      opponentName: opponent.name || 'Athlete',
      opponentAvatar: opponent.profileImage || '',
      exerciseId: cleanEx,
      sportId,
      challengeType,
      targetReps,
      durationSeconds,
      status: 'pending',
      rules: rules || `Complete ${challengeType === 'most_reps' ? 'the most verified reps' : `${targetReps} reps`} of ${cleanEx} in ${durationSeconds}s.`,
      rewardXp: 150,
      createdAt: now,
      updatedAt: now,
    };

    localFriendChallengesCache.set(challengeId, doc);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(FRIEND_CHALLENGES_COLLECTION).doc(challengeId).set(doc),
          3000
        );
      } catch (err) {
        logger.warn(`[FriendChallenge] createChallenge ${challengeId} failed:`, err);
      }
    }

    // Send notification to friend
    try {
      await NotificationRepository.create({
        notificationId: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: opponentId,
        title: 'New Friend Challenge! ⚔️',
        body: `${challenger.name} challenged you to a ${cleanEx} contest!`,
        type: 'workout_reminder',
        read: false,
        data: { challengeId, challengerId },
        createdAt: now,
      });
    } catch (_) {}

    return doc;
  }

  /**
   * Get challenge by ID
   */
  static async getChallengeById(challengeId: string): Promise<FriendChallengeDoc | null> {
    if (!challengeId) return null;
    if (localFriendChallengesCache.has(challengeId)) {
      return localFriendChallengesCache.get(challengeId)!;
    }

    if (hasFirebaseCredentials) {
      try {
        const snap = await withTimeout(
          db.collection(FRIEND_CHALLENGES_COLLECTION).doc(challengeId).get(),
          2000
        );
        if (snap.exists) {
          const data = snap.data() as FriendChallengeDoc;
          localFriendChallengesCache.set(challengeId, data);
          return data;
        }
      } catch (_) {}
    }

    return null;
  }

  /**
   * Accept friend challenge
   */
  static async acceptChallenge(challengeId: string, currentUserId: string): Promise<FriendChallengeDoc> {
    const challenge = await this.getChallengeById(challengeId);
    if (!challenge) throw new Error('Challenge not found');
    if (challenge.opponentId !== currentUserId) {
      throw new Error('Only the challenged friend can accept this challenge');
    }
    if (challenge.status !== 'pending') {
      throw new Error(`Cannot accept challenge with status "${challenge.status}"`);
    }

    const now = new Date().toISOString();
    challenge.status = 'accepted';
    challenge.updatedAt = now;
    localFriendChallengesCache.set(challengeId, challenge);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(FRIEND_CHALLENGES_COLLECTION).doc(challengeId).set(challenge, { merge: true }),
          2500
        );
      } catch (err) {
        logger.warn(`[FriendChallenge] acceptChallenge failed:`, err);
      }
    }

    return challenge;
  }

  /**
   * Decline friend challenge
   */
  static async declineChallenge(challengeId: string, currentUserId: string): Promise<FriendChallengeDoc> {
    const challenge = await this.getChallengeById(challengeId);
    if (!challenge) throw new Error('Challenge not found');
    if (challenge.opponentId !== currentUserId && challenge.challengerId !== currentUserId) {
      throw new Error('Unauthorized to modify this challenge');
    }

    const now = new Date().toISOString();
    challenge.status = challenge.challengerId === currentUserId ? 'cancelled' : 'declined';
    challenge.updatedAt = now;
    localFriendChallengesCache.set(challengeId, challenge);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(FRIEND_CHALLENGES_COLLECTION).doc(challengeId).set(challenge, { merge: true }),
          2500
        );
      } catch (err) {
        logger.warn(`[FriendChallenge] declineChallenge failed:`, err);
      }
    }

    return challenge;
  }

  /**
   * Submit authoritative Camera / MediaPipe telemetry for a friend challenge.
   * Enforces full anti-cheat verification:
   * - Participant membership
   * - Exercise match
   * - Rep sanity & minimum cadence
   * - Duration bounds
   * - Form score range
   * When both results are in (or target is reached), determines outcome and awards XP authoritatively.
   */
  static async submitResult(
    challengeId: string,
    submittingUserId: string,
    payload: CompetitiveVerificationPayload
  ): Promise<FriendChallengeDoc> {
    const challenge = await this.getChallengeById(challengeId);
    if (!challenge) throw new Error('Challenge not found');

    const isChallenger = challenge.challengerId === submittingUserId;
    const isOpponent = challenge.opponentId === submittingUserId;
    if (!isChallenger && !isOpponent) {
      throw new Error('Unauthorized: You are not a participant in this friend challenge');
    }

    if (challenge.status === 'completed') {
      return challenge; // Idempotent guard
    }
    if (challenge.status === 'cancelled' || challenge.status === 'declined') {
      throw new Error('Cannot submit telemetry for cancelled/declined challenge');
    }

    // 1. Exercise match
    if (payload.exerciseId && payload.exerciseId.toLowerCase() !== challenge.exerciseId.toLowerCase()) {
      throw new Error(`Exercise mismatch: challenge requires ${challenge.exerciseId}, received ${payload.exerciseId}`);
    }

    // 2. Anti-cheat sanity checks
    const reps = payload.validReps !== undefined ? payload.validReps : (payload.reps || 0);
    const formScore = payload.formScore !== undefined ? payload.formScore : 85;
    const duration = payload.durationSeconds || challenge.durationSeconds;

    if (reps < 0) throw new Error('Invalid repetitions: cannot be negative');
    if (reps > 500) throw new Error('Exaggerated repetitions: exceeds maximum human limit');
    if (formScore < 0 || formScore > 100) throw new Error('Form score must be between 0 and 100');
    if (duration < 5 && reps > 0) throw new Error('Duration must be at least 5 seconds for verified reps');
    if (duration > 0 && reps / duration > 2.2) throw new Error('Impossible repetition cadence detected');

    // Calculate score: Reps * (Form / 100) * 10
    const verifiedScore = Math.round(reps * (formScore / 100) * 10);
    const now = new Date().toISOString();

    const participantResult: FriendChallengeParticipantResult = {
      userId: submittingUserId,
      reps,
      formScore,
      verifiedScore,
      durationSeconds: duration,
      visionResultId: payload.sessionId,
      completedAt: now,
    };

    if (isChallenger) {
      challenge.challengerResult = participantResult;
    } else {
      challenge.opponentResult = participantResult;
    }

    challenge.status = 'in_progress';
    challenge.updatedAt = now;

    // Check if both have completed OR if target_reps reached
    const cRes = challenge.challengerResult;
    const oRes = challenge.opponentResult;

    if (cRes && oRes) {
      // Both participants have finished! Finalize challenge.
      challenge.status = 'completed';
      challenge.completedAt = now;

      if (cRes.verifiedScore > oRes.verifiedScore) {
        challenge.winnerId = challenge.challengerId;
        challenge.isDraw = false;
      } else if (oRes.verifiedScore > cRes.verifiedScore) {
        challenge.winnerId = challenge.opponentId;
        challenge.isDraw = false;
      } else {
        challenge.winnerId = null;
        challenge.isDraw = true;
      }

      // Award XP authoritatively
      const winnerXp = challenge.rewardXp || 150;
      const loserXp = Math.round(winnerXp * 0.4);

      if (challenge.winnerId) {
        const loserId = challenge.winnerId === challenge.challengerId ? challenge.opponentId : challenge.challengerId;
        await Promise.all([
          UserRepository.recordQualifyingActivity(challenge.winnerId, {
            activityType: 'challenge',
            activityId: challengeId,
            xpEarned: winnerXp,
            activityDate: now.split('T')[0],
          }).catch(() => {}),
          UserRepository.recordQualifyingActivity(loserId, {
            activityType: 'challenge',
            activityId: challengeId,
            xpEarned: loserXp,
            activityDate: now.split('T')[0],
          }).catch(() => {}),
        ]);
      } else {
        // Draw: both get equal reward
        const drawXp = Math.round(winnerXp * 0.7);
        await Promise.all([
          UserRepository.recordQualifyingActivity(challenge.challengerId, {
            activityType: 'challenge',
            activityId: challengeId,
            xpEarned: drawXp,
            activityDate: now.split('T')[0],
          }).catch(() => {}),
          UserRepository.recordQualifyingActivity(challenge.opponentId, {
            activityType: 'challenge',
            activityId: challengeId,
            xpEarned: drawXp,
            activityDate: now.split('T')[0],
          }).catch(() => {}),
        ]);
      }
    }

    localFriendChallengesCache.set(challengeId, challenge);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(FRIEND_CHALLENGES_COLLECTION).doc(challengeId).set(challenge, { merge: true }),
          3000
        );
      } catch (err) {
        logger.warn(`[FriendChallenge] submitResult Firestore write failed:`, err);
      }
    }

    return challenge;
  }

  /**
   * Get all friend challenges for a user
   */
  static async getUserChallenges(userId: string): Promise<FriendChallengeDoc[]> {
    if (!userId) return [];

    let list: FriendChallengeDoc[] = [];

    if (hasFirebaseCredentials) {
      try {
        const [snap1, snap2] = await Promise.all([
          withTimeout(db.collection(FRIEND_CHALLENGES_COLLECTION).where('challengerId', '==', userId).get(), 2500),
          withTimeout(db.collection(FRIEND_CHALLENGES_COLLECTION).where('opponentId', '==', userId).get(), 2500),
        ]);
        list = [
          ...snap1.docs.map((d) => d.data() as FriendChallengeDoc),
          ...snap2.docs.map((d) => d.data() as FriendChallengeDoc),
        ];
        for (const c of list) {
          localFriendChallengesCache.set(c.challengeId, c);
        }
      } catch (err) {
        logger.warn(`[FriendChallenge] getUserChallenges for ${userId} failed:`, err);
      }
    }

    if (list.length === 0) {
      list = Array.from(localFriendChallengesCache.values()).filter(
        (c) => c.challengerId === userId || c.opponentId === userId
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Clear local cache (for testing)
   */
  static clearCache() {
    localFriendChallengesCache.clear();
  }
}
