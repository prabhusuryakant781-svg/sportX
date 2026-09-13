/**
 * Gamification Engine: XP, Streak, Badges, Trophy Room & Titles
 * Core Features: Streaks, Levels, Server-Calculated XP, Badges, Milestones, Titles & Athlete Identity
 */
import { Router, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { XPRepository } from '../repositories/xpRepository';
import { StreakRepository } from '../repositories/streakRepository';
import { BadgeRepository } from '../repositories/badgeRepository';
import { ProgressRepository } from '../repositories/progressRepository';
import { GamificationService, SYSTEM_BADGES, SYSTEM_TITLES } from '../services/gamificationService';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import * as logger from 'firebase-functions/logger';

export const gamificationRouter = Router();

// Re-export for compatibility
export const BADGES = SYSTEM_BADGES;
export const TITLES = SYSTEM_TITLES;
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
    const [user, masterBadges, userBadgeMap, progress] = await Promise.all([
      UserRepository.getById(uid),
      BadgeRepository.getAllBadges(),
      BadgeRepository.getUserBadgeMap(uid),
      ProgressRepository.calculateProgress(uid, 'all').catch(() => null),
    ]);

    const ownedBadgeIds = new Set(user?.badges || []);
    for (const bId of userBadgeMap.keys()) {
      ownedBadgeIds.add(bId);
    }

    const totalWorkouts = progress?.totalWorkouts ?? user?.totalWorkouts ?? 0;
    const totalReps = progress?.totalReps ?? (user?.totalWorkouts || 0) * 15;
    const currentStreak = progress?.currentStreak ?? user?.currentStreak ?? 0;
    const totalXp = (user as any)?.totalXp ?? user?.xp ?? progress?.totalXp ?? 0;

    const statsForProgress = {
      totalWorkouts,
      totalReps,
      currentStreak,
      totalXp,
    };

    const enriched = masterBadges.map((b) => {
      const unlocked = ownedBadgeIds.has(b.id);
      const userBadge = userBadgeMap.get(b.id);
      const progressMetric = GamificationService.calculateBadgeProgress(b, statsForProgress);

      return {
        ...b,
        unlocked,
        unlockedAt: userBadge?.unlockedAt || (unlocked ? user?.updatedAt : null),
        progress: progressMetric,
      };
    });

    const totalAvailable = enriched.length;
    const totalUnlocked = enriched.filter((b) => b.unlocked).length;
    const completionPercentage = totalAvailable > 0 ? Math.round((totalUnlocked / totalAvailable) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: enriched,
      summary: {
        totalAvailable,
        totalUnlocked,
        completionPercentage,
      },
    });
  } catch (err: any) {
    logger.error('Error fetching badges:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/gamification/titles
gamificationRouter.get('/titles', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const [user, userBadgeMap, progress] = await Promise.all([
      UserRepository.getById(uid),
      BadgeRepository.getUserBadgeMap(uid),
      ProgressRepository.calculateProgress(uid, 'all').catch(() => null),
    ]);

    const ownedBadgeIds = Array.from(new Set([...(user?.badges || []), ...Array.from(userBadgeMap.keys())]));
    const totalWorkouts = progress?.totalWorkouts ?? user?.totalWorkouts ?? 0;
    const totalReps = progress?.totalReps ?? (user?.totalWorkouts || 0) * 15;
    const currentStreak = progress?.currentStreak ?? user?.currentStreak ?? 0;
    const totalXp = (user as any)?.totalXp ?? user?.xp ?? progress?.totalXp ?? 0;

    const unlockedTitleIds = new Set(
      GamificationService.evaluateUnlockedTitles(ownedBadgeIds, {
        totalXp,
        rankTier: user?.rankTier,
        currentStreak,
        totalWorkouts,
        totalReps,
      })
    );

    const enrichedTitles = SYSTEM_TITLES.map((t) => {
      const unlocked = unlockedTitleIds.has(t.id);
      const isEquipped = user?.equippedTitle === t.id;
      return {
        ...t,
        unlocked,
        isEquipped,
      };
    });

    return res.status(200).json({
      success: true,
      data: enrichedTitles,
      equippedTitle: user?.equippedTitle || null,
      unlockedCount: enrichedTitles.filter((t) => t.unlocked).length,
    });
  } catch (err: any) {
    logger.error('Error in /gamification/titles:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/gamification/equip-title
gamificationRouter.put('/equip-title', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { titleId } = req.body;

    const result = await UserRepository.equipTitle(uid, titleId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({
      success: true,
      message: titleId ? `Equipped title successfully.` : 'Cleared active title.',
      equippedTitle: titleId || null,
    });
  } catch (err: any) {
    logger.error('Error in /gamification/equip-title:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/gamification/featured-badges
gamificationRouter.put('/featured-badges', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { badgeIds } = req.body;

    if (!Array.isArray(badgeIds)) {
      return res.status(400).json({ success: false, error: 'badgeIds must be an array.' });
    }

    const result = await UserRepository.updateFeaturedBadges(uid, badgeIds);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({
      success: true,
      message: 'Featured badges updated successfully.',
      featuredBadges: badgeIds.slice(0, 6),
    });
  } catch (err: any) {
    logger.error('Error in /gamification/featured-badges:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/gamification/status
gamificationRouter.get('/status', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const user = await UserRepository.getById(uid);

    const xp = (user as any)?.totalXp ?? user?.xp ?? (user as any)?.XP ?? 0;
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
        equippedTitle: user?.equippedTitle || null,
        featuredBadges: user?.featuredBadges || [],
        rankPoints: user?.rankPoints ?? 100,
        rankTier: user?.rankTier || 'Bronze',
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
