/**
 * SportX Gamification Engine (Server-Side Logic)
 * Pure, authoritative server calculations for XP, levels, streaks, and badge unlocks.
 */
import { BadgeDoc } from '../types';

export const SYSTEM_BADGES: BadgeDoc[] = [
  {
    id: 'first_workout',
    name: 'First Step',
    description: 'Completed your very first AI-guided workout session.',
    icon: '🌱',
    category: 'workout',
    workoutsRequired: 1,
  },
  {
    id: 'streak_3',
    name: 'On Fire',
    description: 'Maintained a 3-day consecutive workout streak.',
    icon: '🔥',
    category: 'streak',
    streakRequired: 3,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Crushed a 7-day consecutive workout streak.',
    icon: '⚡',
    category: 'streak',
    streakRequired: 7,
  },
  {
    id: 'streak_30',
    name: 'Iron Will',
    description: 'Completed 30 days of consistent training without missing a day.',
    icon: '🛡️',
    category: 'streak',
    streakRequired: 30,
  },
  {
    id: 'perfect_form',
    name: 'Form Perfectionist',
    description: 'Achieved 95% or higher form accuracy in a workout session.',
    icon: '🎯',
    category: 'form',
    formAccuracyRequired: 95,
  },
  {
    id: 'reps_500',
    name: '500 Rep Club',
    description: 'Accumulated 500 completed exercise repetitions.',
    icon: '💪',
    category: 'workout',
    repsRequired: 500,
  },
  {
    id: 'reps_1000',
    name: 'Century Reps',
    description: 'Accumulated 1,000 completed exercise repetitions.',
    icon: '💯',
    category: 'workout',
    repsRequired: 1000,
  },
  {
    id: 'xp_1000',
    name: 'Rising Athlete',
    description: 'Earned 1,000 total Experience Points (XP).',
    icon: '🌟',
    category: 'xp',
    xpThreshold: 1000,
  },
  {
    id: 'xp_10000',
    name: 'Grandmaster',
    description: 'Accumulated 10,000 total Experience Points (XP).',
    icon: '👑',
    category: 'xp',
    xpThreshold: 10000,
  },
];

export class GamificationService {
  /**
   * Calculate XP earned for a session.
   * Formula: baseRepXP * reps * (formAccuracy / 100) + durationBonus + completionBonus
   */
  static calculateSessionXP(params: {
    totalReps: number;
    formAccuracyAverage: number;
    durationMinutes: number;
    baseRepXP?: number;
    isCompleted?: boolean;
  }): number {
    const {
      totalReps,
      formAccuracyAverage,
      durationMinutes,
      baseRepXP = 10,
      isCompleted = true,
    } = params;

    const clampedAccuracy = Math.min(100, Math.max(0, formAccuracyAverage));
    const accuracyFactor = clampedAccuracy / 100;
    
    // Rep XP scaled with form accuracy
    const repXP = Math.round(totalReps * baseRepXP * accuracyFactor);

    // Duration bonus: 5 XP per minute trained (up to 60 mins max to avoid abuse)
    const cappedMinutes = Math.min(60, Math.max(0, durationMinutes));
    const durationBonus = Math.round(cappedMinutes * 5);

    // Bonus for successfully completing the full routine
    const completionBonus = isCompleted ? 50 : 0;

    // High form excellence bonus (>= 90%)
    const excellenceBonus = clampedAccuracy >= 90 ? 25 : 0;

    const totalXP = Math.max(0, repXP + durationBonus + completionBonus + excellenceBonus);
    return totalXP;
  }

  /**
   * User level calculation formula:
   * level = Math.floor(Math.sqrt(xp / 100)) + 1
   */
  static calculateLevel(xp: number): number {
    if (xp <= 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  /**
   * Calculate XP required to reach the next level
   */
  static getXPForNextLevel(currentLevel: number): number {
    // Inverse of level formula: xp = (level)^2 * 100
    return Math.pow(currentLevel, 2) * 100;
  }

  /**
   * Calculate streak progression based on workout date.
   * Today format: YYYY-MM-DD
   */
  static evaluateStreak(params: {
    lastWorkoutDate: string | null;
    currentStreak: number;
    longestStreak: number;
    sessionDate?: string;
  }): { currentStreak: number; longestStreak: number; streakIncremented: boolean } {
    const today = params.sessionDate || new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let streak = params.currentStreak;
    let streakIncremented = false;

    if (!params.lastWorkoutDate) {
      // First ever workout
      streak = 1;
      streakIncremented = true;
    } else if (params.lastWorkoutDate === today) {
      // Already logged a workout today, keep streak as is
      streakIncremented = false;
    } else if (params.lastWorkoutDate === yesterday) {
      // Consecutive day!
      streak += 1;
      streakIncremented = true;
    } else {
      // Missed more than 1 day, reset to 1
      streak = 1;
      streakIncremented = true;
    }

    const longestStreak = Math.max(params.longestStreak, streak);

    return {
      currentStreak: streak,
      longestStreak,
      streakIncremented,
    };
  }

  /**
   * Evaluate which new badges the user has unlocked based on current stats and session.
   */
  static evaluateUnlockedBadges(params: {
    currentBadges: string[];
    totalWorkouts: number;
    totalReps: number;
    totalXP: number;
    currentStreak: number;
    sessionFormAccuracy?: number;
  }): { newBadges: BadgeDoc[]; allBadges: string[] } {
    const currentSet = new Set(params.currentBadges || []);
    const newlyUnlocked: BadgeDoc[] = [];

    for (const badge of SYSTEM_BADGES) {
      if (currentSet.has(badge.id)) continue;

      let qualified = false;

      if (badge.workoutsRequired !== undefined && params.totalWorkouts >= badge.workoutsRequired) {
        qualified = true;
      }
      if (badge.streakRequired !== undefined && params.currentStreak >= badge.streakRequired) {
        qualified = true;
      }
      if (badge.repsRequired !== undefined && params.totalReps >= badge.repsRequired) {
        qualified = true;
      }
      if (badge.xpThreshold !== undefined && params.totalXP >= badge.xpThreshold) {
        qualified = true;
      }
      if (
        badge.formAccuracyRequired !== undefined &&
        params.sessionFormAccuracy !== undefined &&
        params.sessionFormAccuracy >= badge.formAccuracyRequired
      ) {
        qualified = true;
      }

      if (qualified) {
        newlyUnlocked.push(badge);
        currentSet.add(badge.id);
      }
    }

    return {
      newBadges: newlyUnlocked,
      allBadges: Array.from(currentSet),
    };
  }
}
