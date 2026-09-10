/**
 * SportX Challenges Router & Module (Phase 5)
 * Handles challenge creation, participant management, secure progress updates,
 * and completion with server-side XP awarding.
 */

import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { createChallenge } from './createChallenge';
import { joinChallenge, acceptChallenge, getChallengeById } from './joinChallenge';
import { updateChallengeProgress } from './updateChallenge';
import { completeChallenge } from './completeChallenge';
import { challengesStore, Challenge } from './types';
import { db, hasFirebaseCredentials } from '../config/firebase';
import * as logger from 'firebase-functions/logger';

export * from './types';
export * from './createChallenge';
export * from './joinChallenge';
export * from './updateChallenge';
export * from './completeChallenge';

export const challengesRouter = Router();

/**
 * POST /api/v1/challenges
 * Creates a new challenge.
 */
challengesRouter.post('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const creator = {
      uid: req.user!.uid,
      name: req.user!.name
    };

    const newChallenge = await createChallenge(creator, req.body);
    res.status(201).json({
      success: true,
      message: '⚡ Challenge created successfully! Let the competition begin!',
      data: newChallenge
    });
  } catch (err: any) {
    logger.warn('[Challenges API] Error creating challenge:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Failed to create challenge'
    });
  }
});

/**
 * GET /api/v1/challenges
 * Retrieves challenges for the authenticated user.
 */
challengesRouter.get('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    let list: Challenge[] = [];

    if (hasFirebaseCredentials) {
      try {
        const snap = await db.collection('challenges').limit(50).get();
        if (!snap.empty) {
          list = snap.docs.map(d => d.data() as Challenge);
        }
      } catch (e) {
        logger.warn('[Challenges API] Firestore list failed, using memory store:', e);
      }
    }

    if (list.length === 0) {
      list = Array.from(challengesStore.values());
    }

    // Filter where user is creator, challengee, or participant
    const myChallenges = list.filter(
      c => c.creatorId === uid || (c as any).challengeeId === uid || (c.participants && c.participants[uid])
    );

    res.status(200).json({
      success: true,
      count: myChallenges.length,
      data: myChallenges
    });
  } catch (err: any) {
    logger.error('[Challenges API] Error retrieving challenges:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve challenges'
    });
  }
});

/**
 * GET /api/v1/challenges/:id
 * Retrieves details of a specific challenge.
 */
challengesRouter.get('/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const challenge = await getChallengeById(req.params.id);
    if (!challenge) {
      res.status(404).json({ success: false, error: `Challenge "${req.params.id}" not found` });
      return;
    }

    res.status(200).json({
      success: true,
      data: challenge
    });
  } catch (err: any) {
    logger.error('[Challenges API] Error fetching challenge:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch challenge' });
  }
});

/**
 * POST /api/v1/challenges/:id/join
 * Join an existing challenge as a participant.
 */
challengesRouter.post('/:id/join', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = {
      uid: req.user!.uid,
      name: req.user!.name
    };

    const updated = await joinChallenge(req.params.id, user);
    res.status(200).json({
      success: true,
      message: 'Joined challenge successfully!',
      data: updated
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Failed to join challenge'
    });
  }
});

/**
 * POST /api/v1/challenges/:id/accept
 * Accept an invitation to a challenge.
 */
challengesRouter.post('/:id/accept', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const updated = await acceptChallenge(req.params.id, uid);
    res.status(200).json({
      success: true,
      message: 'Challenge accepted!',
      data: updated
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Failed to accept challenge'
    });
  }
});

/**
 * PATCH /api/v1/challenges/:id/progress
 * Securely updates the authenticated user's progress towards the challenge target.
 */
challengesRouter.patch('/:id/progress', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const updated = await updateChallengeProgress(req.params.id, uid, req.body);
    res.status(200).json({
      success: true,
      message: 'Challenge progress updated successfully',
      data: updated
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Failed to update challenge progress'
    });
  }
});

/**
 * POST /api/v1/challenges/:id/complete
 * Manually finalizes challenge completion and claims server-side XP reward.
 */
challengesRouter.post('/:id/complete', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const result = await completeChallenge(req.params.id, uid);
    res.status(200).json({
      success: true,
      message: `🎉 Challenge completed! Awarded ${result.xpAwarded} XP!`,
      data: result
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Failed to complete challenge'
    });
  }
});

/**
 * Backward compatibility: PATCH /api/v1/challenges/:id/respond
 */
challengesRouter.patch('/:id/respond', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { action } = req.body;
  const uid = req.user!.uid;

  try {
    if (action === 'accept') {
      const updated = await acceptChallenge(req.params.id, uid);
      res.status(200).json({ success: true, message: 'Challenge active', data: updated });
    } else {
      const challenge = await getChallengeById(req.params.id);
      if (!challenge) {
        res.status(404).json({ error: 'Challenge not found' });
        return;
      }
      if (challenge.participants[uid]) {
        challenge.participants[uid].status = 'declined';
      }
      challenge.status = 'declined';
      res.status(200).json({ success: true, message: 'Challenge declined', data: challenge });
    }
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});
