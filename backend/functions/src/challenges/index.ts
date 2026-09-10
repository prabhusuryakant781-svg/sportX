/**
 * Challenges Routes: POST /challenges, GET /challenges, PATCH /challenges/:id/respond
 * Core Features: Peer Challenges stored in Firestore challenges/{challengeId}
 */
import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import * as logger from 'firebase-functions/logger';

export const challengesRouter = Router();
const COLLECTION = 'challenges';

// POST /api/v1/challenges
challengesRouter.post('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { challengeeId, exerciseId, targetReps, message } = req.body;

    if (!challengeeId || !exerciseId || !targetReps) {
      return res.status(400).json({ success: false, error: 'challengeeId, exerciseId and targetReps are required' });
    }

    const challengeId = `challenge_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newChallenge = {
      id: challengeId,
      creatorId: req.user!.uid,
      creatorName: req.user!.name || 'Athlete',
      challengeeId,
      challengeeName: '(pending)',
      exerciseId,
      targetReps: Number(targetReps),
      message: message ?? `I challenge you to ${targetReps} ${exerciseId}s!`,
      status: 'pending',
      expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    await db.collection(COLLECTION).doc(challengeId).set(newChallenge);

    res.status(201).json({
      success: true,
      message: '⚡ Challenge sent! Let the battle begin!',
      data: newChallenge,
    });
  } catch (err: any) {
    logger.error('Error creating challenge:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/challenges
challengesRouter.get('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;

    // Query challenges where user is creator OR challengee
    const creatorSnap = await db.collection(COLLECTION).where('creatorId', '==', uid).get();
    const challengeeSnap = await db.collection(COLLECTION).where('challengeeId', '==', uid).get();

    const challengeMap = new Map<string, any>();
    creatorSnap.docs.forEach((d) => challengeMap.set(d.id, d.data()));
    challengeeSnap.docs.forEach((d) => challengeMap.set(d.id, d.data()));

    const myChallenges = Array.from(challengeMap.values());
    res.status(200).json({ success: true, count: myChallenges.length, data: myChallenges });
  } catch (err: any) {
    logger.error('Error listing challenges:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/challenges/:id/respond
challengesRouter.patch('/:id/respond', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action } = req.body; // 'accept' or 'decline'
    const docRef = db.collection(COLLECTION).doc(req.params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    const newStatus = action === 'accept' ? 'active' : 'declined';
    await docRef.update({ status: newStatus, respondedAt: new Date().toISOString() });

    const updated = { ...docSnap.data(), status: newStatus };
    res.status(200).json({ success: true, message: `Challenge ${newStatus}`, data: updated });
  } catch (err: any) {
    logger.error('Error responding to challenge:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
