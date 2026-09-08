import { Router, Response } from 'express';
import { db } from '../config/firebase';

export const leaderboardRouter = Router();

// GET /api/v1/leaderboard?scope=college|department|global
leaderboardRouter.get('/', async (req, res: Response) => {
  try {
    const { scope = 'college' } = req.query;

    const snapshot = await db.collection('users')
      .orderBy('totalXp', 'desc')
      .limit(10)
      .get();

    let rankings = snapshot.docs.map((doc, idx) => {
      const d = doc.data();
      return {
        rank: idx + 1,
        userId: doc.id,
        name: d.name || 'Anonymous Student',
        college: d.collegeName || 'Campus Tech',
        department: d.department || 'Engineering',
        points: d.totalXp || 0,
        streak: d.currentStreak || 0
      };
    });

    if (rankings.length === 0) {
      rankings = [
        { rank: 1, userId: 'u1', name: 'Aarav Sharma', college: 'IIT Delhi', department: 'CS', points: 1450, streak: 8 },
        { rank: 2, userId: 'u2', name: 'Priya Patel', college: 'IIT Delhi', department: 'EE', points: 1220, streak: 5 },
        { rank: 3, userId: 'u3', name: 'Rohan Mehra (You)', college: 'IIT Delhi', department: 'ME', points: 980, streak: 4 },
        { rank: 4, userId: 'u4', name: 'Ananya Roy', college: 'BITS Pilani', department: 'CS', points: 850, streak: 3 },
        { rank: 5, userId: 'u5', name: 'Vikram Singh', college: 'NIT Trichy', department: 'Civil', points: 710, streak: 2 }
      ];
    }

    res.status(200).json({
      success: true,
      scope,
      updatedAt: new Date().toISOString(),
      data: rankings
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
