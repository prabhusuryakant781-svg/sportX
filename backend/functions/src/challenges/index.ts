/**
 * Challenges Routes: POST /challenges, GET /challenges
 * Core Features: 25 (Peer Challenges)
 */
import { Router, Response } from 'express';
import { nextId } from '../config/demoStore';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const challengesRouter = Router();

const challenges: any[] = [
  {
    id: 'ch_demo_001',
    creatorId: 'demo_student_01',
    creatorName: 'Aarav Sharma',
    challengeeId: 'u4',
    challengeeName: 'Rohan Verma',
    exerciseId: 'pushup',
    targetReps: 20,
    status: 'pending',
    expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

// POST /api/v1/challenges
challengesRouter.post('/', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const { challengeeId, exerciseId, targetReps, message } = req.body;

  if (!challengeeId || !exerciseId || !targetReps) {
    return res.status(400).json({ error: 'challengeeId, exerciseId and targetReps are required' });
  }

  const newChallenge = {
    id: nextId('challenge'),
    creatorId: req.user!.uid,
    creatorName: req.user!.name,
    challengeeId,
    challengeeName: '(pending)',
    exerciseId,
    targetReps: Number(targetReps),
    message: message ?? `I challenge you to ${targetReps} ${exerciseId}s!`,
    status: 'pending',
    expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  challenges.push(newChallenge);

  res.status(201).json({
    success: true,
    message: '⚡ Challenge sent! Let the battle begin!',
    data: newChallenge,
  });
});

// GET /api/v1/challenges
challengesRouter.get('/', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user!.uid;
  const myChallenges = challenges.filter(c => c.creatorId === uid || c.challengeeId === uid);
  res.status(200).json({ success: true, count: myChallenges.length, data: myChallenges });
});

// PATCH /api/v1/challenges/:id/respond
challengesRouter.patch('/:id/respond', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const { action } = req.body; // 'accept' or 'decline'
  const ch = challenges.find(c => c.id === req.params.id);
  if (!ch) return res.status(404).json({ error: 'Challenge not found' });
  ch.status = action === 'accept' ? 'active' : 'declined';
  res.status(200).json({ success: true, message: `Challenge ${ch.status}`, data: ch });
});
