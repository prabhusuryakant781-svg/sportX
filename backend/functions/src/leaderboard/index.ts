/**
 * Leaderboard Routes: GET /leaderboard/global, GET /leaderboard/college
 * Core Feature: Real-time Firestore XP / RP rankings and campus social comparison
 */
import { Router } from 'express';
import { LeaderboardRepository } from '../repositories/leaderboardRepository';
import * as logger from 'firebase-functions/logger';

export const leaderboardRouter = Router();

// GET /api/v1/leaderboard/global
leaderboardRouter.get('/global', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const sortBy = req.query.sortBy === 'rp' ? 'rp' : 'xp';
    const leaders = await LeaderboardRepository.getGlobal(limit, sortBy);

    res.status(200).json({
      success: true,
      period: 'all_time',
      sortBy,
      count: leaders.length,
      data: leaders,
    });
  } catch (err: any) {
    logger.error('Error in /leaderboard/global:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/leaderboard/college
leaderboardRouter.get('/college', async (req, res) => {
  try {
    const college = (req.query.collegeName as string) || 'Campus University';
    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const sortBy = req.query.sortBy === 'rp' ? 'rp' : 'xp';
    const campusLeaders = await LeaderboardRepository.getByCollege(college, limit, sortBy);

    res.status(200).json({
      success: true,
      collegeName: college,
      sortBy,
      count: campusLeaders.length,
      data: campusLeaders,
    });
  } catch (err: any) {
    logger.error('Error in /leaderboard/college:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
