/**
 * Multiplayer Lobby Routes: POST /lobbies, GET /lobbies/:id
 * Core Features: 23 (Multiplayer Workout Mode)
 */
import { Router, Response } from 'express';
import { lobbies, nextId } from '../config/demoStore';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const lobbiesRouter = Router();

// POST /api/v1/lobbies — Create a new lobby
lobbiesRouter.post('/', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const { exerciseId = 'squat', maxPlayers = 4, targetReps = 30 } = req.body;

  const lobbyId = nextId('lobby');
  const newLobby = {
    id: lobbyId,
    hostId: req.user!.uid,
    hostName: req.user!.name,
    exerciseId,
    maxPlayers: Number(maxPlayers),
    targetReps: Number(targetReps),
    status: 'waiting',
    players: [
      { userId: req.user!.uid, name: req.user!.name, reps: 0, formScore: 0, ready: false },
    ],
    createdAt: new Date().toISOString(),
  };

  lobbies.set(lobbyId, newLobby);

  res.status(201).json({
    success: true,
    message: '🎮 Lobby created! Share the lobby ID to invite friends.',
    data: { lobbyId, joinCode: lobbyId.split('_').pop(), lobby: newLobby },
  });
});

// POST /api/v1/lobbies/:id/join
lobbiesRouter.post('/:id/join', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const lobby = lobbies.get(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });

  const alreadyIn = lobby.players.some((p: any) => p.userId === req.user!.uid);
  if (!alreadyIn) {
    if (lobby.players.length >= lobby.maxPlayers) {
      return res.status(400).json({ error: 'Lobby is full' });
    }
    lobby.players.push({ userId: req.user!.uid, name: req.user!.name, reps: 0, formScore: 0, ready: false });
    lobbies.set(lobby.id, lobby);
  }

  res.status(200).json({ success: true, message: 'Joined lobby!', data: lobby });
});

// GET /api/v1/lobbies/:id
lobbiesRouter.get('/:id', (_req, res) => {
  const lobby = lobbies.get(_req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });
  res.status(200).json({ success: true, data: lobby });
});

// POST /api/v1/lobbies/:id/start
lobbiesRouter.post('/:id/start', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const lobby = lobbies.get(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });
  if (lobby.hostId !== req.user!.uid) return res.status(403).json({ error: 'Only host can start' });
  lobby.status = 'active';
  lobby.startedAt = new Date().toISOString();
  lobbies.set(lobby.id, lobby);
  res.status(200).json({ success: true, message: '🚀 Workout started!', data: lobby });
});
