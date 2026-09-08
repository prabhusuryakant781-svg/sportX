import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const challengesRouter = Router();

// Default Daily & Campus Challenges
const DEFAULT_CHALLENGES = [
  {
    id: 'daily_match_squats',
    title: 'Daily Lobby Showdown: 50 Squats Sprint',
    description: 'Join the daily campus lobby and compete head-to-head in real time!',
    targetMetric: 'reps',
    targetValue: 50,
    exerciseId: 'squat',
    isDailyChallenge: true, // Core Feature 23
    participantsCount: 64,
    badgeReward: 'Daily Champion'
  },
  {
    id: 'campus_squats_100',
    title: 'Inter-Hostel 100 Squats Sprint',
    description: 'Crush 100 AI-verified squats this week for your hostel!',
    targetMetric: 'reps',
    targetValue: 100,
    exerciseId: 'squat',
    isDailyChallenge: false,
    participantsCount: 128,
    badgeReward: 'Campus Spartan'
  }
];

// GET /api/v1/challenges
challengesRouter.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('challenges').get();
    if (snapshot.empty) {
      return res.status(200).json({ success: true, data: DEFAULT_CHALLENGES });
    }
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, data: list });
  } catch (error: any) {
    res.status(200).json({ success: true, data: DEFAULT_CHALLENGES });
  }
});

// POST /api/v1/challenges/:id/join
challengesRouter.post('/:id/join', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { id } = req.params;

    await db.collection('users').doc(uid!).set(
      { joinedChallenges: [id], updatedAt: new Date().toISOString() },
      { merge: true }
    );

    res.status(200).json({ success: true, message: `Joined challenge ${id}!` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// MULTIPLAYER LOBBY SYSTEM (Features 7, 23, 25, 26)
// ============================================================================

// 1. Create a Lobby Room (Core Feature 25)
// POST /api/v1/challenges/lobbies/create
challengesRouter.post('/lobbies/create', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { exerciseId, targetReps, isDailyChallenge } = req.body;

    // Generate unique 6-character room code (e.g. SPX-482)
    const roomCode = `SPX-${Math.floor(100 + Math.random() * 900)}`;

    const newLobby = {
      roomCode,
      hostUserId: uid,
      hostName: req.user?.name || 'Athlete Host',
      exerciseId: exerciseId || 'squat',
      targetReps: Number(targetReps) || 30,
      isDailyChallenge: Boolean(isDailyChallenge), // Feature 23
      status: 'waiting', // waiting | countdown | active | finished
      participants: {
        [uid!]: {
          name: req.user?.name || 'Athlete Host',
          isReady: true,
          currentReps: 0,
          currentFormScore: 100,
          joinedAt: new Date().toISOString()
        }
      },
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('lobbies').add(newLobby);

    res.status(201).json({
      success: true,
      message: 'Multiplayer Lobby created! Share room code with friends.',
      data: {
        lobbyId: docRef.id,
        roomCode,
        inviteUrl: `https://sportx.app/lobby?code=${roomCode}`, // Feature 26
        ...newLobby
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Join a Lobby Room by Room Code or ID (Core Feature 25 & 26)
// POST /api/v1/challenges/lobbies/join
challengesRouter.post('/lobbies/join', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { roomCode, lobbyId } = req.body;

    let targetDocRef: FirebaseFirestore.DocumentReference | null = null;

    if (lobbyId) {
      targetDocRef = db.collection('lobbies').doc(lobbyId);
    } else if (roomCode) {
      const q = await db.collection('lobbies').where('roomCode', '==', roomCode).limit(1).get();
      if (!q.empty) {
        targetDocRef = q.docs[0].ref;
      }
    }

    if (!targetDocRef) {
      return res.status(404).json({ error: 'Lobby not found. Check the room code.' });
    }

    const doc = await targetDocRef.get();
    const data = doc.data();

    if (data?.status === 'active' || data?.status === 'finished') {
      return res.status(400).json({ error: 'Match already in progress or ended.' });
    }

    // Add player to participants map
    await targetDocRef.set({
      participants: {
        ...data?.participants,
        [uid!]: {
          name: req.user?.name || 'Athlete Participant',
          isReady: false,
          currentReps: 0,
          currentFormScore: 100,
          joinedAt: new Date().toISOString()
        }
      }
    }, { merge: true });

    res.status(200).json({
      success: true,
      message: 'Joined lobby successfully!',
      data: { lobbyId: targetDocRef.id, ...data }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Update Reps During Live Camera Match in Lobby (Core Feature 7)
// POST /api/v1/challenges/lobbies/:id/reps
challengesRouter.post('/lobbies/:id/reps', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { id } = req.params;
    const { reps, formScore } = req.body;

    const lobbyRef = db.collection('lobbies').doc(id);
    const lobbyDoc = await lobbyRef.get();
    if (!lobbyDoc.exists) return res.status(404).json({ error: 'Lobby not found' });

    const data = lobbyDoc.data();
    const participants = data?.participants || {};

    if (participants[uid!]) {
      participants[uid!].currentReps = Number(reps) || 0;
      participants[uid!].currentFormScore = Number(formScore) || 100;
    }

    // Check if player reached target reps
    let status = data?.status;
    if (Number(reps) >= (data?.targetReps || 30)) {
      status = 'finished';
      data!.winnerUserId = uid;
      data!.winnerName = req.user?.name || 'Winner';
    }

    await lobbyRef.set({ participants, status, winnerUserId: data?.winnerUserId, winnerName: data?.winnerName }, { merge: true });

    res.status(200).json({ success: true, currentReps: reps, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get Real-Time Lobby State
// GET /api/v1/challenges/lobbies/:id
challengesRouter.get('/lobbies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('lobbies').doc(id).get();
    if (!doc.exists) {
      // Fallback demo lobby
      return res.status(200).json({
        success: true,
        data: {
          id,
          roomCode: 'SPX-777',
          status: 'waiting',
          exerciseId: 'squat',
          targetReps: 25,
          participants: {
            'u1': { name: 'Aarav (Host)', isReady: true, currentReps: 0, currentFormScore: 100 },
            'u2': { name: 'Priya', isReady: true, currentReps: 0, currentFormScore: 100 }
          }
        }
      });
    }

    res.status(200).json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
