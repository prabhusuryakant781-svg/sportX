/**
 * Gamification Engine: XP, Streak, Badges & Trophy Room
 * Core Features: Streaks, Levels, Server-Calculated XP, Badges, XP Transaction Audit
 */
import { Router, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { XPRepository } from '../repositories/xpRepository';
import { StreakRepository } from '../repositories/streakRepository';
import { BadgeRepository } from '../repositories/badgeRepository';
import { GamificationService, SYSTEM_BADGES } from '../services/gamificationService';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import * as logger from 'firebase-functions/logger';

export const gamificationRouter = Router();

// Re-export for compatibility
export const BADGES = SYSTEM_BADGES;
export const calculateXP = (reps: number, formScore: number, completed: boolean) =>
  GamificationService.calculateSessionXP({
    totalReps: reps,
    formAccuracyAverage: formScore,
    durationMinutes: 1,
    isCompleted: completed,
  });

// GET /api/v1/gamification/badges
gamificationRouter.get('/badges', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const [user, masterBadges] = await Promise.all([
      UserRepository.getById(uid),
      BadgeRepository.getAllBadges(),
    ]);

    const userBadges = new Set(user?.badges || []);

    const enriched = masterBadges.map((b) => ({
      ...b,
      unlocked: userBadges.has(b.id),
    }));

    return res.status(200).json({ success: true, data: enriched });
  } catch (err: any) {
    logger.error('Error fetching badges:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/gamification/status
gamificationRouter.get('/status', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const user = await UserRepository.getById(uid);

    const xp = user?.xp || 0;
    const currentLevel = user?.level || GamificationService.calculateLevel(xp);
    const xpForNext = GamificationService.getXPForNextLevel(currentLevel);
    const xpForCurrent = GamificationService.getXPForNextLevel(currentLevel - 1);
    const levelProgressPercent = Math.min(
      100,
      Math.max(0, Math.round(((xp - xpForCurrent) / (xpForNext - xpForCurrent || 1)) * 100))
    );

    return res.status(200).json({
      success: true,
      data: {
        totalXp: xp,
        level: currentLevel,
        currentStreak: user?.currentStreak || 0,
        longestStreak: user?.longestStreak || 0,
        lastWorkoutDate: user?.lastWorkoutDate,
        xpForNextLevel: xpForNext,
        levelProgressPercent,
        badgesUnlockedCount: user?.badges?.length || 0,
      },
    });
  } catch (err: any) {
    logger.error('Error in /gamification/status:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/gamification/xp-history
gamificationRouter.get('/xp-history', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const history = await XPRepository.getUserHistory(uid, 50);
    return res.status(200).json({ success: true, count: history.length, data: history });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/gamification/streak
gamificationRouter.get('/streak', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const streakDoc = await StreakRepository.getByUserId(uid);
    const user = await UserRepository.getById(uid);

    return res.status(200).json({
      success: true,
      data: {
        currentStreak: streakDoc?.currentStreak ?? user?.currentStreak ?? 0,
        longestStreak: streakDoc?.longestStreak ?? user?.longestStreak ?? 0,
        lastWorkoutDate: streakDoc?.lastWorkoutDate ?? user?.lastWorkoutDate ?? null,
        history: streakDoc?.history || [],
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
