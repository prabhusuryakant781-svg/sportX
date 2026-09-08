import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const sportsRouter = Router();

// Default catalogue of campus sports
const DEFAULT_SPORTS = [
  { id: 'badminton', name: 'Badminton', category: 'Racquet', icon: '🏸', caloriePerHour: 400 },
  { id: 'football', name: 'Football / Soccer', category: 'Team Sport', icon: '⚽', caloriePerHour: 550 },
  { id: 'cricket', name: 'Cricket', category: 'Team Sport', icon: '🏏', caloriePerHour: 350 },
  { id: 'basketball', name: 'Basketball', category: 'Team Sport', icon: '🏀', caloriePerHour: 600 },
  { id: 'running', name: 'Campus Running', category: 'Athletics', icon: '🏃', caloriePerHour: 500 },
  { id: 'table_tennis', name: 'Table Tennis', category: 'Racquet', icon: '🏓', caloriePerHour: 300 }
];

// GET /api/v1/sports
sportsRouter.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('sports').get();
    if (snapshot.empty) {
      return res.status(200).json({ success: true, data: DEFAULT_SPORTS });
    }
    const sports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, data: sports });
  } catch (error: any) {
    res.status(200).json({ success: true, data: DEFAULT_SPORTS });
  }
});

// POST /api/v1/sports/select
sportsRouter.post('/select', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { sports } = req.body; // e.g. ['badminton', 'football']

    if (!Array.isArray(sports)) {
      return res.status(400).json({ error: 'sports must be an array of sport IDs' });
    }

    await db.collection('users').doc(uid!).set(
      { selectedSports: sports, updatedAt: new Date().toISOString() },
      { merge: true }
    );

    res.status(200).json({ success: true, message: 'Sports updated successfully', sports });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
