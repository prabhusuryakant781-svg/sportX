import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { db } from '../config/firebase';
import { XPService } from './xpService';
import { BadgeService } from './badgeService';

export const gamificationRouter = Router();

// Apply auth middleware to all gamification routes
gamificationRouter.use(verifyAuth);

/**
 * GET /api/v1/gamification/status
 * Returns current level, streak, XP progress, and thresholds
 */
gamificationRouter.get('/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      sendError(res, 'NOT_FOUND', 'User profile not found', 404);
      return;
    }

    const userData = userDoc.data() || {};
    const xp = (userData.xp as number) || 0;
    const level = XPService.calculateLevel(xp);
    const xpForCurrentLevel = level === 1 ? 0 : XPService.getXPForNextLevel(level - 1);
    const xpForNextLevel = XPService.getXPForNextLevel(level);

    const userBadges = await BadgeService.getUserBadges(userId);

    sendSuccess(res, {
      userId,
      xp,
      level,
      xpForCurrentLevel,
      xpForNextLevel,
      xpToNextLevel: Math.max(0, xpForNextLevel - xp),
      currentStreak: userData.currentStreak || 0,
      longestStreak: userData.longestStreak || 0,
      lastWorkoutDate: userData.lastWorkoutDate || null,
      badgesUnlockedCount: userBadges.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve gamification status';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * GET /api/v1/gamification/badges
 * Returns master badge catalogue with user unlock states
 */
gamificationRouter.get('/badges', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const allBadges = BadgeService.getAllBadges();
    const userBadges = await BadgeService.getUserBadges(userId);

    const unlockedMap = new Map<string, string>();
    userBadges.forEach((ub) => unlockedMap.set(ub.badgeId, ub.unlockedAt));

    const enriched = allBadges.map((badge) => ({
      ...badge,
      isUnlocked: unlockedMap.has(badge.id),
      unlockedAt: unlockedMap.get(badge.id) || null,
    }));

    sendSuccess(res, {
      totalBadges: enriched.length,
      unlockedCount: userBadges.length,
      badges: enriched,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve badges';
    sendError(res, 'INTERNAL', message, 500);
  }
});
