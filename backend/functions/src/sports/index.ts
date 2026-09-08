/**
 * Sports Routes: GET /sports, POST /sports/select
 * Core Feature: 3 (Sports Selection)
 */
import { Router, Response } from 'express';
import { users } from '../config/demoStore';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const sportsRouter = Router();

const SPORTS_CATALOGUE = [
  { id: 'badminton', name: 'Badminton', category: 'Racquet', icon: '🏸', caloriePerHour: 400 },
  { id: 'football', name: 'Football / Soccer', category: 'Team Sport', icon: '⚽', caloriePerHour: 550 },
  { id: 'cricket', name: 'Cricket', category: 'Team Sport', icon: '🏏', caloriePerHour: 350 },
  { id: 'basketball', name: 'Basketball', category: 'Team Sport', icon: '🏀', caloriePerHour: 600 },
  { id: 'running', name: 'Campus Running', category: 'Athletics', icon: '🏃', caloriePerHour: 500 },
  { id: 'table_tennis', name: 'Table Tennis', category: 'Racquet', icon: '🏓', caloriePerHour: 300 },
];

// GET /api/v1/sports
sportsRouter.get('/', (_req, res) => {
  res.status(200).json({ success: true, data: SPORTS_CATALOGUE });
});

// POST /api/v1/sports/select
sportsRouter.post('/select', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user!.uid;
  const { sports } = req.body;

  if (!Array.isArray(sports)) {
    return res.status(400).json({ error: 'sports must be an array of sport IDs' });
  }

  const user = users.get(uid);
  if (user) {
    user.selectedSports = sports;
    users.set(uid, user);
  }

  res.status(200).json({ success: true, message: 'Sports updated', sports });
});
