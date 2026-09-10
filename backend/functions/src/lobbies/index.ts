/**
 * Multiplayer Lobby Routes: POST /lobbies, GET /lobbies/:id, POST /lobbies/:id/join, POST /lobbies/:id/start
 * Core Features: Multiplayer Workout Mode stored in Firestore lobbies/{lobbyId}
 */
import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

export const lobbiesRouter = Router();
const COLLECTION = 'lobbies';

// POST /api/v1/lobbies — Create a new lobby
lobbiesRouter.post('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { exerciseId = 'squat', maxPlayers = 4, targetReps = 30 } = req.body;

    const lobbyId = `lobby_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newLobby = {
      id: lobbyId,
      hostId: req.user!.uid,
      hostName: req.user!.name || 'Host',
      exerciseId,
      maxPlayers: Number(maxPlayers),
      targetReps: Number(targetReps),
      status: 'waiting',
      players: [
        { userId: req.user!.uid, name: req.user!.name || 'Host', reps: 0, formScore: 0, ready: false },
      ],
      createdAt: new Date().toISOString(),
    };

    await db.collection(COLLECTION).doc(lobbyId).set(newLobby);

    res.status(201).json({
      success: true,
      message: '🎮 Lobby created! Share the lobby ID to invite friends.',
      data: { lobbyId, joinCode: lobbyId.split('_').pop(), lobby: newLobby },
    });
  } catch (err: any) {
    logger.error('Error creating lobby:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/lobbies/:id/join
lobbiesRouter.post('/:id/join', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lobbyRef = db.collection(COLLECTION).doc(req.params.id);
    const lobbySnap = await lobbyRef.get();

    if (!lobbySnap.exists) {
      return res.status(404).json({ success: false, error: 'Lobby not found' });
    }

    const lobby = lobbySnap.data()!;
    const alreadyIn = lobby.players.some((p: any) => p.userId === req.user!.uid);

    if (!alreadyIn) {
      if (lobby.players.length >= lobby.maxPlayers) {
        return res.status(400).json({ success: false, error: 'Lobby is full' });
      }

      await lobbyRef.update({
        players: FieldValue.arrayUnion({
          userId: req.user!.uid,
          name: req.user!.name || 'Player',
          reps: 0,
          formScore: 0,
          ready: false,
        }),
      });
    }

    const updatedSnap = await lobbyRef.get();
    res.status(200).json({ success: true, message: 'Joined lobby!', data: updatedSnap.data() });
  } catch (err: any) {
    logger.error('Error joining lobby:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/lobbies/:id
lobbiesRouter.get('/:id', async (req, res) => {
  try {
    const lobbySnap = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!lobbySnap.exists) {
      return res.status(404).json({ success: false, error: 'Lobby not found' });
    }
    return res.status(200).json({ success: true, data: lobbySnap.data() });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/lobbies/:id/start
lobbiesRouter.post('/:id/start', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lobbyRef = db.collection(COLLECTION).doc(req.params.id);
    const lobbySnap = await lobbyRef.get();

    if (!lobbySnap.exists) {
      return res.status(404).json({ success: false, error: 'Lobby not found' });
    }

    const lobby = lobbySnap.data()!;
    if (lobby.hostId !== req.user!.uid) {
      return res.status(403).json({ success: false, error: 'Only the host can start the workout' });
    }

    await lobbyRef.update({
      status: 'active',
      startedAt: new Date().toISOString(),
    });

    const updatedSnap = await lobbyRef.get();
    res.status(200).json({ success: true, message: '🚀 Workout started!', data: updatedSnap.data() });
  } catch (err: any) {
    logger.error('Error starting lobby:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
