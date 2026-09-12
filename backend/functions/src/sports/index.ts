/**
 * Sports Routes: GET /sports, POST /sports/select, GET /sports/:id
 * Core Feature: Sports Catalogue & User Sport Selections
 */
import { Router, Response } from 'express';
import { SportRepository } from '../repositories/sportRepository';
import { UserRepository } from '../repositories/userRepository';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import * as logger from 'firebase-functions/logger';

export const sportsRouter = Router();

// GET /api/v1/sports
sportsRouter.get('/', async (_req, res) => {
  try {
    const sports = await SportRepository.getAll();
    const formatted = sports.map((s) => ({
      ...s,
      id: s.sportId,
      icon: s.iconUrl || '🏅',
    }));
    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (err: any) {
    logger.error('Error in /sports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/sports/:id
sportsRouter.get('/:id', async (req, res) => {
  try {
    const sport = await SportRepository.getById(req.params.id);
    if (!sport) {
      return res.status(404).json({ success: false, error: 'Sport not found' });
    }
    const formatted = {
      ...sport,
      id: sport.sportId,
      icon: sport.iconUrl || '🏅',
    };
    return res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/sports/select
sportsRouter.post('/select', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { sports } = req.body;

    if (!Array.isArray(sports)) {
      return res.status(400).json({ success: false, error: 'sports must be an array of sport IDs' });
    }

    await UserRepository.update(uid, { selectedSports: sports });
    return res.status(200).json({ success: true, message: 'Sports updated successfully', sports });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
