import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const gamificationRouter = Router();

export const BADGES_CATALOG = [
  { id: 'first_rep', name: 'First Step', description: 'Completed your first AI workout session', icon: '🌱' },
  { id: 'form_master', name: 'Form Master', description: 'Achieved a form accuracy score > 90%', icon: '🎯' },
  { id: 'streak_3', name: '3-Day Fire', description: 'Maintained a 3-day consecutive workout streak', icon: '🔥' },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintained a 7-day consecutive workout streak', icon: '⚡' },
  { id: 'century_reps', name: 'Century Club', description: 'Counted 100 verified reps with AI', icon: '💯' }
];

export class XPService {
  /**
   * Calculate XP awarded for a session strictly on server
   */
  static calculateWorkoutXP(reps: number, formScore: number, isCompleted: boolean): number {
    let xp = reps * 10;
    if (isCompleted) xp += 100;
    if (formScore >= 80) xp += 50;
    return xp;
  }

  /**
   * Atomic server-side update of user XP, streaks, and milestone badges
   */
  static async awardUserXpAndStreak(userId: string, xpEarned: number) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const data = userDoc.data() || {};

    const todayStr = new Date().toISOString().split('T')[0];
    const lastDate = data.lastWorkoutDate;

    let currentStreak = data.currentStreak || 0;
    let longestStreak = data.longestStreak || 0;

    if (!lastDate) {
      currentStreak = 1;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDate === todayStr) {
        // Already active today; streak stays same
      } else if (lastDate === yesterdayStr) {
        currentStreak += 1;
      } else {
        // Missed a day; reset to 1
        currentStreak = 1;
      }
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    const newXp = (data.totalXp || 0) + xpEarned;

    // Check badges
    const unlockedBadges: string[] = [];
    if (currentStreak >= 3) unlockedBadges.push('streak_3');
    if (currentStreak >= 7) unlockedBadges.push('streak_7');

    await userRef.set({
      totalXp: newXp,
      currentStreak,
      longestStreak,
      lastWorkoutDate: todayStr,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return {
      currentStreak,
      longestStreak,
      newXp,
      badgesUnlocked: unlockedBadges
    };
  }
}

// GET /api/v1/gamification/badges
gamificationRouter.get('/badges', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const userDoc = await db.collection('users').doc(uid!).get();
    const streak = userDoc.data()?.currentStreak || 0;
    const xp = userDoc.data()?.totalXp || 0;

    const badges = BADGES_CATALOG.map(badge => {
      let isUnlocked = false;
      if (badge.id === 'first_rep' && xp > 0) isUnlocked = true;
      if (badge.id === 'streak_3' && streak >= 3) isUnlocked = true;
      if (badge.id === 'streak_7' && streak >= 7) isUnlocked = true;
      if (badge.id === 'century_reps' && xp >= 1000) isUnlocked = true;
      return { ...badge, unlocked: isUnlocked };
    });

    res.status(200).json({ success: true, data: badges });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
