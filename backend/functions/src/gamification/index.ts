/**
 * Gamification Engine: XP, Streak, Badges
 * Core Features: 19 (Streak), 21 (Milestones), 24 (XP), 27 (Badges/Rewards/Leaderboard)
 */
import { Router, Response } from 'express';
import { users } from '../config/demoStore';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const gamificationRouter = Router();

export const BADGES = [
  { id: 'first_step', name: 'First Step', description: 'Completed your first AI camera workout', icon: '🌱', xpThreshold: 1 },
  { id: 'form_master', name: 'Form Master', description: 'Achieved form accuracy > 90% in a session', icon: '🎯', xpThreshold: 0 },
  { id: 'streak_3', name: '3-Day Fire', description: 'Maintained a 3-day workout streak', icon: '🔥', streakRequired: 3 },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintained a 7-day workout streak', icon: '⚡', streakRequired: 7 },
  { id: 'century_reps', name: 'Century Club', description: 'Earned over 1,000 XP total', icon: '💯', xpThreshold: 1000 },
];

// ── Pure Functions (used by sessions route) ───────────────────────────────────
export function calculateXP(reps: number, formScore: number, completed: boolean): number {
  let xp = reps * 10;
  if (completed) xp += 100;
  if (formScore >= 80) xp += 50;
  return xp;
}

export function updateStreak(
  userId: string,
  xpEarned: number
): { newXp: number; currentStreak: number; longestStreak: number; badgesUnlocked: string[] } {
  const user = users.get(userId);
  if (!user) return { newXp: xpEarned, currentStreak: 0, longestStreak: 0, badgesUnlocked: [] };

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let streak = user.currentStreak;
  if (!user.lastWorkoutDate) {
    streak = 1;
  } else if (user.lastWorkoutDate === today) {
    // Already counted today
  } else if (user.lastWorkoutDate === yesterday) {
    streak += 1;
  } else {
    streak = 1;
  }

  user.currentStreak = streak;
  user.longestStreak = Math.max(user.longestStreak, streak);
  user.totalXp += xpEarned;
  user.lastWorkoutDate = today;
  users.set(userId, user);

  // Check badges
  const badgesUnlocked: string[] = [];
  if (user.totalXp > 0) badgesUnlocked.push('first_step');
  if (streak >= 3) badgesUnlocked.push('streak_3');
  if (streak >= 7) badgesUnlocked.push('streak_7');
  if (user.totalXp >= 1000) badgesUnlocked.push('century_reps');

  return { newXp: user.totalXp, currentStreak: streak, longestStreak: user.longestStreak, badgesUnlocked };
}

// GET /api/v1/gamification/badges
gamificationRouter.get('/badges', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = users.get(req.user!.uid);
  const xp = user?.totalXp ?? 0;
  const streak = user?.currentStreak ?? 0;

  const enriched = BADGES.map(b => ({
    ...b,
    unlocked:
      (b.xpThreshold !== undefined && xp >= b.xpThreshold) ||
      (b.streakRequired !== undefined && streak >= b.streakRequired),
  }));

  res.status(200).json({ success: true, data: enriched });
});
