import { db } from '../config/firebase';
import { BadgeDoc, UserBadgeDoc } from '../types';
import { XPService } from './xpService';

export const SYSTEM_BADGES: BadgeDoc[] = [
  {
    id: 'first_workout',
    name: 'First Step',
    description: 'Completed your very first AI-guided workout session.',
    icon: '🌱',
    category: 'workout',
    requirementType: 'workouts',
    requirementValue: 1,
    xpReward: 50,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'streak_3',
    name: 'On Fire',
    description: 'Maintained a 3-day consecutive workout streak.',
    icon: '🔥',
    category: 'streak',
    requirementType: 'streak',
    requirementValue: 3,
    xpReward: 100,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Crushed a 7-day consecutive workout streak.',
    icon: '⚡',
    category: 'streak',
    requirementType: 'streak',
    requirementValue: 7,
    xpReward: 250,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'streak_30',
    name: 'Iron Will',
    description: 'Completed 30 days of consistent training without missing a day.',
    icon: '🛡️',
    category: 'streak',
    requirementType: 'streak',
    requirementValue: 30,
    xpReward: 1000,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'perfect_form',
    name: 'Form Perfectionist',
    description: 'Achieved 95% or higher form accuracy in a workout session.',
    icon: '🎯',
    category: 'form',
    requirementType: 'form_accuracy',
    requirementValue: 95,
    xpReward: 150,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reps_500',
    name: '500 Rep Club',
    description: 'Accumulated 500 completed exercise repetitions.',
    icon: '💪',
    category: 'workout',
    requirementType: 'reps',
    requirementValue: 500,
    xpReward: 300,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reps_1000',
    name: 'Century Reps',
    description: 'Accumulated 1,000 completed exercise repetitions.',
    icon: '💯',
    category: 'workout',
    requirementType: 'reps',
    requirementValue: 1000,
    xpReward: 600,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'xp_1000',
    name: 'Rising Athlete',
    description: 'Earned 1,000 total Experience Points (XP).',
    icon: '🌟',
    category: 'xp',
    requirementType: 'xp',
    requirementValue: 1000,
    xpReward: 200,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'xp_10000',
    name: 'Grandmaster',
    description: 'Accumulated 10,000 total Experience Points (XP).',
    icon: '👑',
    category: 'xp',
    requirementType: 'xp',
    requirementValue: 10000,
    xpReward: 1000,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export class BadgeService {
  /**
   * Pure evaluation function for badge unlocking.
   */
  static evaluateUnlockedBadges(params: {
    currentBadges: string[];
    totalWorkouts: number;
    totalReps: number;
    totalXP: number;
    currentStreak: number;
    sessionFormAccuracy?: number;
  }): { newBadges: BadgeDoc[]; allBadges: string[] } {
    const {
      currentBadges = [],
      totalWorkouts = 0,
      totalReps = 0,
      totalXP = 0,
      currentStreak = 0,
      sessionFormAccuracy = 0,
    } = params;

    const ownedSet = new Set(currentBadges);
    const newBadges: BadgeDoc[] = [];

    for (const badge of SYSTEM_BADGES) {
      if (ownedSet.has(badge.id)) continue;

      let qualified = false;
      switch (badge.requirementType) {
        case 'workouts':
          qualified = totalWorkouts >= badge.requirementValue;
          break;
        case 'streak':
          qualified = currentStreak >= badge.requirementValue;
          break;
        case 'reps':
          qualified = totalReps >= badge.requirementValue;
          break;
        case 'xp':
          qualified = totalXP >= badge.requirementValue;
          break;
        case 'form_accuracy':
          qualified = sessionFormAccuracy >= badge.requirementValue;
          break;
      }

      if (qualified) {
        newBadges.push(badge);
        ownedSet.add(badge.id);
      }
    }

    return {
      newBadges,
      allBadges: Array.from(ownedSet),
    };
  }

  /**
   * Unlocks new badges for a user server-side and awards XP.
   */
  static async checkAndUnlockBadges(params: {
    userId: string;
    totalWorkouts: number;
    totalReps: number;
    totalXP: number;
    currentStreak: number;
    sessionFormAccuracy?: number;
  }): Promise<BadgeDoc[]> {
    const { userId, totalWorkouts, totalReps, totalXP, currentStreak, sessionFormAccuracy } = params;

    // Get currently unlocked badge IDs
    const userBadgesSnap = await db
      .collection('userBadges')
      .where('userId', '==', userId)
      .get();

    const currentBadges = userBadgesSnap.docs.map((doc) => doc.data().badgeId as string);

    const { newBadges } = this.evaluateUnlockedBadges({
      currentBadges,
      totalWorkouts,
      totalReps,
      totalXP,
      currentStreak,
      sessionFormAccuracy,
    });

    if (newBadges.length === 0) return [];

    const now = new Date().toISOString();
    const batch = db.batch();

    for (const badge of newBadges) {
      const docId = `${userId}_${badge.id}`;
      const badgeRef = db.collection('userBadges').doc(docId);

      const record: UserBadgeDoc = {
        id: docId,
        userId,
        badgeId: badge.id,
        unlockedAt: now,
        badgeDetails: badge,
      };

      batch.set(badgeRef, record);
    }

    await batch.commit();

    // Award bonus XP for newly unlocked badges
    for (const badge of newBadges) {
      if (badge.xpReward > 0) {
        await XPService.recordXPIdempotent({
          userId,
          sessionId: `badge_${badge.id}`,
          amount: badge.xpReward,
          reason: 'badge_reward',
        });
      }
    }

    return newBadges;
  }

  /**
   * Retrieves all badges unlocked by a specific user.
   */
  static async getUserBadges(userId: string): Promise<UserBadgeDoc[]> {
    const snap = await db
      .collection('userBadges')
      .where('userId', '==', userId)
      .get();

    return snap.docs.map((doc) => doc.data() as UserBadgeDoc);
  }

  /**
   * Master catalogue of all system badges.
   */
  static getAllBadges(): BadgeDoc[] {
    return SYSTEM_BADGES;
  }
}
