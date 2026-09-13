/**
 * SportX Gamification Engine (Server-Side Logic)
 * Pure, authoritative server calculations for XP, levels, streaks, badge unlocks, and titles.
 */
import { BadgeDoc, TitleDoc } from '../types';

export const SYSTEM_BADGES: BadgeDoc[] = [
  // ── CATEGORY A: WORKOUT (Volume & Consistency) ───────────────────────────
  {
    id: 'first_workout',
    name: 'First Step',
    description: 'Completed your very first AI-guided workout session.',
    icon: '🌱',
    category: 'workout',
    rarity: 'Common',
    isMilestone: true,
    workoutsRequired: 1,
    xpReward: 50,
  },
  {
    id: 'workout_10',
    name: 'Workout Warrior',
    description: 'Completed 10 full AI-guided workout sessions.',
    icon: '⚔️',
    category: 'workout',
    rarity: 'Uncommon',
    isMilestone: true,
    workoutsRequired: 10,
    xpReward: 100,
  },
  {
    id: 'workout_25',
    name: 'Quarter Century Athlete',
    description: 'Completed 25 full workout sessions.',
    icon: '🛡️',
    category: 'workout',
    rarity: 'Rare',
    isMilestone: true,
    workoutsRequired: 25,
    xpReward: 250,
  },
  {
    id: 'workout_50',
    name: 'Half Century Grinder',
    description: 'Completed 50 full workout sessions.',
    icon: '💥',
    category: 'workout',
    rarity: 'Epic',
    isMilestone: true,
    workoutsRequired: 50,
    xpReward: 500,
  },
  {
    id: 'workout_100',
    name: 'Century Club Member',
    description: 'Completed 100 full workout sessions.',
    icon: '👑',
    category: 'workout',
    rarity: 'Epic',
    isMilestone: true,
    workoutsRequired: 100,
    xpReward: 1000,
  },
  {
    id: 'workout_250',
    name: 'Iron Athlete',
    description: 'Completed 250 full workout sessions.',
    icon: '🌟',
    category: 'workout',
    rarity: 'Legendary',
    isMilestone: false,
    workoutsRequired: 250,
    xpReward: 2500,
  },
  {
    id: 'workout_500',
    name: 'SportX Immortal',
    description: 'Completed 500 full workout sessions of disciplined training.',
    icon: '🏆',
    category: 'workout',
    rarity: 'Legendary',
    isMilestone: true,
    workoutsRequired: 500,
    xpReward: 5000,
  },

  // ── CATEGORY B: REPS (Cumulative Volume) ──────────────────────────────────
  {
    id: 'reps_100',
    name: 'Century Rep Starter',
    description: 'Accumulated your first 100 completed exercise repetitions.',
    icon: '🔥',
    category: 'reps',
    rarity: 'Common',
    isMilestone: true,
    repsRequired: 100,
    xpReward: 50,
  },
  {
    id: 'reps_500',
    name: '500 Rep Club',
    description: 'Accumulated 500 completed exercise repetitions.',
    icon: '💪',
    category: 'reps',
    rarity: 'Uncommon',
    isMilestone: true,
    repsRequired: 500,
    xpReward: 100,
  },
  {
    id: 'reps_1000',
    name: 'Century Reps',
    description: 'Accumulated 1,000 completed exercise repetitions.',
    icon: '💯',
    category: 'reps',
    rarity: 'Rare',
    isMilestone: true,
    repsRequired: 1000,
    xpReward: 200,
  },
  {
    id: 'reps_5000',
    name: '5,000 Rep Machine',
    description: 'Accumulated 5,000 completed exercise repetitions.',
    icon: '⚡',
    category: 'reps',
    rarity: 'Epic',
    isMilestone: false,
    repsRequired: 5000,
    xpReward: 500,
  },
  {
    id: 'reps_10000',
    name: '10,000 Rep Behemoth',
    description: 'Accumulated 10,000 completed exercise repetitions.',
    icon: '🦾',
    category: 'reps',
    rarity: 'Legendary',
    isMilestone: true,
    repsRequired: 10000,
    xpReward: 1000,
  },
  {
    id: 'reps_50000',
    name: '50,000 Rep Titan',
    description: 'Accumulated 50,000 completed exercise repetitions.',
    icon: '🌌',
    category: 'reps',
    rarity: 'Legendary',
    isMilestone: true,
    repsRequired: 50000,
    xpReward: 2500,
  },

  // ── CATEGORY C: STREAK (Consistency) ─────────────────────────────────────
  {
    id: 'streak_3',
    name: 'On Fire',
    description: 'Maintained a 3-day consecutive workout streak.',
    icon: '🔥',
    category: 'streak',
    rarity: 'Common',
    isMilestone: true,
    streakRequired: 3,
    xpReward: 50,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Crushed a 7-day consecutive workout streak.',
    icon: '⚡',
    category: 'streak',
    rarity: 'Uncommon',
    isMilestone: true,
    streakRequired: 7,
    xpReward: 100,
  },
  {
    id: 'streak_14',
    name: 'Fortnight Champion',
    description: 'Crushed a 14-day consecutive workout streak.',
    icon: '💎',
    category: 'streak',
    rarity: 'Uncommon',
    isMilestone: false,
    streakRequired: 14,
    xpReward: 150,
  },
  {
    id: 'streak_30',
    name: 'Iron Will',
    description: 'Completed 30 days of consistent training without missing a day.',
    icon: '🛡️',
    category: 'streak',
    rarity: 'Rare',
    isMilestone: true,
    streakRequired: 30,
    xpReward: 300,
  },
  {
    id: 'streak_60',
    name: 'Unstoppable Force',
    description: 'Completed 60 days of consistent training without missing a day.',
    icon: '🚀',
    category: 'streak',
    rarity: 'Epic',
    isMilestone: false,
    streakRequired: 60,
    xpReward: 600,
  },
  {
    id: 'streak_100',
    name: 'Century Streak Legend',
    description: 'Maintained a monumental 100-day workout streak.',
    icon: '👑',
    category: 'streak',
    rarity: 'Epic',
    isMilestone: true,
    streakRequired: 100,
    xpReward: 1000,
  },
  {
    id: 'streak_180',
    name: 'Half-Year Hero',
    description: 'Maintained an incredible 180-day workout streak.',
    icon: '🌟',
    category: 'streak',
    rarity: 'Legendary',
    isMilestone: false,
    streakRequired: 180,
    xpReward: 2000,
  },
  {
    id: 'streak_365',
    name: 'Year-Long Titan',
    description: 'Conquered a full 365-day streak of relentless consistency.',
    icon: '🏆',
    category: 'streak',
    rarity: 'Legendary',
    isMilestone: true,
    streakRequired: 365,
    xpReward: 5000,
  },

  // ── CATEGORY D: FORM (Biomechanical Precision) ───────────────────────────
  {
    id: 'form_90',
    name: 'Precision Striker',
    description: 'Achieved 90% or higher form accuracy in a workout session.',
    icon: '✨',
    category: 'form',
    rarity: 'Common',
    isMilestone: true,
    formAccuracyRequired: 90,
    xpReward: 50,
  },
  {
    id: 'perfect_form',
    name: 'Form Perfectionist',
    description: 'Achieved 95% or higher form accuracy in a workout session.',
    icon: '🎯',
    category: 'form',
    rarity: 'Rare',
    isMilestone: true,
    formAccuracyRequired: 95,
    xpReward: 150,
  },
  {
    id: 'form_high_10',
    name: 'Flawless Execution 10',
    description: 'Completed 10 high-form training sessions (90%+ accuracy).',
    icon: '🏅',
    category: 'form',
    rarity: 'Epic',
    isMilestone: true,
    highFormSessionsRequired: 10,
    xpReward: 500,
  },
  {
    id: 'form_high_50',
    name: 'Form Master',
    description: 'Completed 50 high-form training sessions (90%+ accuracy).',
    icon: '👑',
    category: 'form',
    rarity: 'Legendary',
    isMilestone: true,
    highFormSessionsRequired: 50,
    xpReward: 1500,
  },

  // ── CATEGORY E: SPORTS (Discipline-Specific) ──────────────────────────────
  {
    id: 'sport_cricket_first',
    name: 'First Innings',
    description: 'Completed your first cricket session or drill.',
    icon: '🏏',
    category: 'sports',
    rarity: 'Common',
    isMilestone: false,
    sportIdRequired: 'cricket',
    xpReward: 50,
  },
  {
    id: 'sport_football_first',
    name: 'First Kickoff',
    description: 'Completed your first football session or drill.',
    icon: '⚽',
    category: 'sports',
    rarity: 'Common',
    isMilestone: false,
    sportIdRequired: 'football',
    xpReward: 50,
  },
  {
    id: 'sport_running_first',
    name: 'First Mile',
    description: 'Completed your first running session or drill.',
    icon: '🏃',
    category: 'sports',
    rarity: 'Common',
    isMilestone: false,
    sportIdRequired: 'running',
    xpReward: 50,
  },
  {
    id: 'sport_strength_first',
    name: 'First Lift',
    description: 'Completed your first strength conditioning drill.',
    icon: '🏋️',
    category: 'sports',
    rarity: 'Common',
    isMilestone: false,
    sportIdRequired: 'strength',
    xpReward: 50,
  },

  // ── CATEGORY F: COMPETITIVE (Arena & Rank) ────────────────────────────────
  {
    id: 'comp_first_match',
    name: 'Arena Challenger',
    description: 'Competed in your first competitive duel match.',
    icon: '⚔️',
    category: 'competitive',
    rarity: 'Common',
    isMilestone: true,
    competitiveMatchesRequired: 1,
    xpReward: 50,
  },
  {
    id: 'comp_first_win',
    name: 'First Victory',
    description: 'Won your first competitive duel match.',
    icon: '🏆',
    category: 'competitive',
    rarity: 'Uncommon',
    isMilestone: true,
    competitiveWinsRequired: 1,
    xpReward: 100,
  },
  {
    id: 'comp_wins_5',
    name: 'Duel Contender',
    description: 'Won 5 competitive duel matches.',
    icon: '🔥',
    category: 'competitive',
    rarity: 'Rare',
    isMilestone: false,
    competitiveWinsRequired: 5,
    xpReward: 200,
  },
  {
    id: 'comp_wins_10',
    name: 'Arena Champion',
    description: 'Won 10 competitive duel matches.',
    icon: '👑',
    category: 'competitive',
    rarity: 'Epic',
    isMilestone: true,
    competitiveWinsRequired: 10,
    xpReward: 500,
  },
  {
    id: 'comp_wins_25',
    name: 'Gladiator',
    description: 'Won 25 competitive duel matches.',
    icon: '⚡',
    category: 'competitive',
    rarity: 'Legendary',
    isMilestone: false,
    competitiveWinsRequired: 25,
    xpReward: 1000,
  },
  {
    id: 'rank_silver',
    name: 'Climb to Silver',
    description: 'Reached Silver competitive division (400+ RP).',
    icon: '🥈',
    category: 'competitive',
    rarity: 'Uncommon',
    isMilestone: false,
    rankTierRequired: 'Silver',
    xpReward: 150,
  },
  {
    id: 'rank_gold',
    name: 'Gold Athlete',
    description: 'Reached Gold competitive division (800+ RP).',
    icon: '🥇',
    category: 'competitive',
    rarity: 'Rare',
    isMilestone: true,
    rankTierRequired: 'Gold',
    xpReward: 300,
  },
  {
    id: 'rank_platinum',
    name: 'Platinum Athlete',
    description: 'Reached Platinum competitive division (1200+ RP).',
    icon: '💠',
    category: 'competitive',
    rarity: 'Epic',
    isMilestone: true,
    rankTierRequired: 'Platinum',
    xpReward: 600,
  },
  {
    id: 'rank_diamond',
    name: 'Diamond Legend',
    description: 'Reached Diamond competitive division (1600+ RP).',
    icon: '💎',
    category: 'competitive',
    rarity: 'Legendary',
    isMilestone: true,
    rankTierRequired: 'Diamond',
    xpReward: 1500,
  },

  // ── CATEGORY G: XP / PROGRESSION ──────────────────────────────────────────
  {
    id: 'xp_1000',
    name: 'Rising Athlete',
    description: 'Earned 1,000 total Experience Points (XP).',
    icon: '🌟',
    category: 'xp',
    rarity: 'Common',
    isMilestone: false,
    xpThreshold: 1000,
    xpReward: 50,
  },
  {
    id: 'xp_5000',
    name: 'Athletic Ascent',
    description: 'Earned 5,000 total Experience Points (XP).',
    icon: '⚡',
    category: 'xp',
    rarity: 'Uncommon',
    isMilestone: false,
    xpThreshold: 5000,
    xpReward: 200,
  },
  {
    id: 'xp_10000',
    name: 'Grandmaster',
    description: 'Accumulated 10,000 total Experience Points (XP).',
    icon: '👑',
    category: 'xp',
    rarity: 'Rare',
    isMilestone: true,
    xpThreshold: 10000,
    xpReward: 500,
  },
  {
    id: 'xp_25000',
    name: 'Elite Competitor',
    description: 'Accumulated 25,000 total Experience Points (XP).',
    icon: '💫',
    category: 'xp',
    rarity: 'Epic',
    isMilestone: false,
    xpThreshold: 25000,
    xpReward: 1000,
  },
  {
    id: 'xp_50000',
    name: 'SportX Legend',
    description: 'Accumulated 50,000 total Experience Points (XP).',
    icon: '🌠',
    category: 'xp',
    rarity: 'Legendary',
    isMilestone: true,
    xpThreshold: 50000,
    xpReward: 2500,
  },
];

export const SYSTEM_TITLES: TitleDoc[] = [
  {
    id: 'title_rookie',
    name: 'Rookie Athlete',
    description: 'Awarded to athletes embarking on their first training session.',
    rarity: 'Common',
    category: 'workout',
    unlockRequirement: 'Complete your first workout',
    badgeIdRequired: 'first_workout',
  },
  {
    id: 'title_starter',
    name: 'Fitness Starter',
    description: 'Earned by reaching your first 1,000 total XP milestone.',
    rarity: 'Common',
    category: 'xp',
    unlockRequirement: 'Earn 1,000 XP',
    badgeIdRequired: 'xp_1000',
  },
  {
    id: 'title_workout_warrior',
    name: 'Workout Warrior',
    description: 'Forged through 10 completed workout routines.',
    rarity: 'Uncommon',
    category: 'workout',
    unlockRequirement: 'Complete 10 workouts',
    badgeIdRequired: 'workout_10',
  },
  {
    id: 'title_iron_will',
    name: 'Iron Will',
    description: 'Held by athletes with an unbreakable 30-day streak.',
    rarity: 'Rare',
    category: 'streak',
    unlockRequirement: 'Reach a 30-day streak',
    badgeIdRequired: 'streak_30',
  },
  {
    id: 'title_consistency_king',
    name: 'Consistency King',
    description: 'Master of daily training and streak dedication.',
    rarity: 'Rare',
    category: 'streak',
    unlockRequirement: 'Reach a 30-day streak',
    badgeIdRequired: 'streak_30',
  },
  {
    id: 'title_rep_machine',
    name: 'Rep Machine',
    description: 'Crushed over 5,000 reps in verified sessions.',
    rarity: 'Epic',
    category: 'reps',
    unlockRequirement: 'Accumulate 5,000 reps',
    badgeIdRequired: 'reps_5000',
  },
  {
    id: 'title_form_perfectionist',
    name: 'Form Perfectionist',
    description: 'Showcases biomechanical mastery with 95%+ precision.',
    rarity: 'Rare',
    category: 'form',
    unlockRequirement: 'Achieve 95%+ form accuracy',
    badgeIdRequired: 'perfect_form',
  },
  {
    id: 'title_form_master',
    name: 'Form Master',
    description: '50 sessions with pinpoint biomechanical precision.',
    rarity: 'Legendary',
    category: 'form',
    unlockRequirement: '50 high-form sessions (90%+)',
    badgeIdRequired: 'form_high_50',
  },
  {
    id: 'title_arena_challenger',
    name: 'Arena Challenger',
    description: 'Dared to step into the competitive duel arena.',
    rarity: 'Common',
    category: 'competitive',
    unlockRequirement: 'Complete first competitive duel',
    badgeIdRequired: 'comp_first_match',
  },
  {
    id: 'title_duel_master',
    name: 'Duel Master',
    description: 'Proven victor with 10 competitive duel wins.',
    rarity: 'Epic',
    category: 'competitive',
    unlockRequirement: 'Win 10 competitive duels',
    badgeIdRequired: 'comp_wins_10',
  },
  {
    id: 'title_gold_athlete',
    name: 'Gold Athlete',
    description: 'Achieved competitive Gold rank status.',
    rarity: 'Rare',
    category: 'competitive',
    unlockRequirement: 'Reach Gold division (800+ RP)',
    badgeIdRequired: 'rank_gold',
  },
  {
    id: 'title_platinum_athlete',
    name: 'Platinum Athlete',
    description: 'Ascended to competitive Platinum tier.',
    rarity: 'Epic',
    category: 'competitive',
    unlockRequirement: 'Reach Platinum division (1200+ RP)',
    badgeIdRequired: 'rank_platinum',
  },
  {
    id: 'title_diamond_athlete',
    name: 'Diamond Athlete',
    description: 'Pinnacle of competitive prowess in Diamond tier.',
    rarity: 'Legendary',
    category: 'competitive',
    unlockRequirement: 'Reach Diamond division (1600+ RP)',
    badgeIdRequired: 'rank_diamond',
  },
  {
    id: 'title_unstoppable',
    name: 'Unstoppable',
    description: 'Maintained 60 days of relentless training momentum.',
    rarity: 'Epic',
    category: 'streak',
    unlockRequirement: 'Reach a 60-day streak',
    badgeIdRequired: 'streak_60',
  },
  {
    id: 'title_elite_athlete',
    name: 'Elite Athlete',
    description: 'Veteran status with over 25,000 total XP.',
    rarity: 'Epic',
    category: 'xp',
    unlockRequirement: 'Earn 25,000 total XP',
    badgeIdRequired: 'xp_25000',
  },
  {
    id: 'title_sportx_legend',
    name: 'SportX Legend',
    description: 'Hall-of-fame milestone: 50,000 XP and unmatched dedication.',
    rarity: 'Legendary',
    category: 'xp',
    unlockRequirement: 'Accumulate 50,000 XP',
    badgeIdRequired: 'xp_50000',
  },
];

const RANK_ORDER: Record<string, number> = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Platinum: 4,
  Diamond: 5,
};

function isRankTierAtLeast(currentTier?: string, requiredTier?: string): boolean {
  if (!currentTier || !requiredTier) return false;
  return (RANK_ORDER[currentTier] || 0) >= (RANK_ORDER[requiredTier] || 0);
}

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
   * Helper to calculate the previous calendar date (YYYY-MM-DD) from a given date string.
   */
  static getPreviousCalendarDate(dateStr: string): string {
    const parts = dateStr.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split('T')[0];
  }

  /**
   * Calculate streak progression based on workout/activity date.
   * Format: YYYY-MM-DD
   */
  static evaluateStreak(params: {
    lastWorkoutDate: string | null;
    currentStreak: number;
    longestStreak: number;
    sessionDate?: string;
  }): { currentStreak: number; longestStreak: number; streakIncremented: boolean } {
    const today = params.sessionDate || new Date().toISOString().split('T')[0];
    const yesterday = this.getPreviousCalendarDate(today);

    let streak = Number(params.currentStreak) || 0;
    let streakIncremented = false;

    if (!params.lastWorkoutDate) {
      // First ever qualifying activity
      streak = 1;
      streakIncremented = true;
    } else if (params.lastWorkoutDate === today) {
      // Already logged a qualifying activity today: maintain streak without incrementing
      streakIncremented = false;
    } else if (params.lastWorkoutDate === yesterday) {
      // Consecutive calendar day: increment streak by 1
      streak += 1;
      streakIncremented = true;
    } else {
      // Missed more than 1 day: reset streak to 1 on next activity
      streak = 1;
      streakIncremented = true;
    }

    // Longest/best streak must NEVER decrease
    const longestStreak = Math.max(Number(params.longestStreak) || 0, streak);

    return {
      currentStreak: streak,
      longestStreak,
      streakIncremented,
    };
  }

  /**
   * Evaluate which new badges the user has unlocked based on current stats and session telemetry.
   */
  static evaluateUnlockedBadges(params: {
    currentBadges: string[];
    totalWorkouts: number;
    totalReps: number;
    totalXP: number;
    currentStreak: number;
    sessionFormAccuracy?: number;
    highFormSessionsCount?: number;
    sportId?: string;
    competitiveMatches?: number;
    competitiveWins?: number;
    rankTier?: string;
  }): { newBadges: BadgeDoc[]; allBadges: string[] } {
    const currentSet = new Set(params.currentBadges || []);
    const newlyUnlocked: BadgeDoc[] = [];

    for (const badge of SYSTEM_BADGES) {
      if (currentSet.has(badge.id)) continue;

      let qualified = false;

      // Workout counts
      if (badge.workoutsRequired !== undefined && params.totalWorkouts >= badge.workoutsRequired) {
        qualified = true;
      }
      // Streak counts
      if (badge.streakRequired !== undefined && params.currentStreak >= badge.streakRequired) {
        qualified = true;
      }
      // Cumulative Reps
      if (badge.repsRequired !== undefined && params.totalReps >= badge.repsRequired) {
        qualified = true;
      }
      // XP threshold
      if (badge.xpThreshold !== undefined && params.totalXP >= badge.xpThreshold) {
        qualified = true;
      }
      // Single session form accuracy
      if (
        badge.formAccuracyRequired !== undefined &&
        params.sessionFormAccuracy !== undefined &&
        params.sessionFormAccuracy >= badge.formAccuracyRequired
      ) {
        qualified = true;
      }
      // Cumulative high-form sessions
      if (
        badge.highFormSessionsRequired !== undefined &&
        params.highFormSessionsCount !== undefined &&
        params.highFormSessionsCount >= badge.highFormSessionsRequired
      ) {
        qualified = true;
      }
      // Sport-specific
      if (
        badge.sportIdRequired !== undefined &&
        params.sportId !== undefined &&
        (params.sportId.toLowerCase() === badge.sportIdRequired.toLowerCase() ||
          params.sportId.toLowerCase().includes(badge.sportIdRequired.toLowerCase()))
      ) {
        qualified = true;
      }
      // Competitive matches
      if (
        badge.competitiveMatchesRequired !== undefined &&
        params.competitiveMatches !== undefined &&
        params.competitiveMatches >= badge.competitiveMatchesRequired
      ) {
        qualified = true;
      }
      // Competitive wins
      if (
        badge.competitiveWinsRequired !== undefined &&
        params.competitiveWins !== undefined &&
        params.competitiveWins >= badge.competitiveWinsRequired
      ) {
        qualified = true;
      }
      // Competitive rank tier
      if (
        badge.rankTierRequired !== undefined &&
        params.rankTier !== undefined &&
        isRankTierAtLeast(params.rankTier, badge.rankTierRequired)
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

  /**
   * Determine which titles are unlocked for a user based on badges and stats
   */
  static evaluateUnlockedTitles(
    unlockedBadges: string[],
    userStats?: {
      totalXp?: number;
      rankTier?: string;
      currentStreak?: number;
      totalWorkouts?: number;
      totalReps?: number;
    }
  ): string[] {
    const badgeSet = new Set(unlockedBadges || []);
    const unlockedTitles: string[] = [];

    for (const title of SYSTEM_TITLES) {
      let qualified = false;

      if (title.badgeIdRequired && badgeSet.has(title.badgeIdRequired)) {
        qualified = true;
      } else if (title.rankTierRequired && isRankTierAtLeast(userStats?.rankTier, title.rankTierRequired)) {
        qualified = true;
      } else if (title.xpRequired && (userStats?.totalXp || 0) >= title.xpRequired) {
        qualified = true;
      } else if (title.streakRequired && (userStats?.currentStreak || 0) >= title.streakRequired) {
        qualified = true;
      } else if (title.workoutsRequired && (userStats?.totalWorkouts || 0) >= title.workoutsRequired) {
        qualified = true;
      } else if (title.repsRequired && (userStats?.totalReps || 0) >= title.repsRequired) {
        qualified = true;
      }

      if (qualified) {
        unlockedTitles.push(title.id);
      }
    }

    return unlockedTitles;
  }

  /**
   * Calculate real progress for a badge based on authoritative user telemetry
   * Returns null if requirement is a single event or cannot be numerically calculated.
   */
  static calculateBadgeProgress(
    badge: BadgeDoc,
    stats: {
      totalWorkouts?: number;
      totalReps?: number;
      currentStreak?: number;
      totalXp?: number;
      competitiveWins?: number;
      competitiveMatches?: number;
      highFormSessionsCount?: number;
    }
  ): { current: number; target: number; percentage: number } | null {
    if (badge.workoutsRequired !== undefined) {
      const current = Math.min(stats.totalWorkouts || 0, badge.workoutsRequired);
      return {
        current,
        target: badge.workoutsRequired,
        percentage: Math.min(100, Math.round((current / badge.workoutsRequired) * 100)),
      };
    }
    if (badge.repsRequired !== undefined) {
      const current = Math.min(stats.totalReps || 0, badge.repsRequired);
      return {
        current,
        target: badge.repsRequired,
        percentage: Math.min(100, Math.round((current / badge.repsRequired) * 100)),
      };
    }
    if (badge.streakRequired !== undefined) {
      const current = Math.min(stats.currentStreak || 0, badge.streakRequired);
      return {
        current,
        target: badge.streakRequired,
        percentage: Math.min(100, Math.round((current / badge.streakRequired) * 100)),
      };
    }
    if (badge.xpThreshold !== undefined) {
      const current = Math.min(stats.totalXp || 0, badge.xpThreshold);
      return {
        current,
        target: badge.xpThreshold,
        percentage: Math.min(100, Math.round((current / badge.xpThreshold) * 100)),
      };
    }
    if (badge.competitiveWinsRequired !== undefined) {
      const current = Math.min(stats.competitiveWins || 0, badge.competitiveWinsRequired);
      return {
        current,
        target: badge.competitiveWinsRequired,
        percentage: Math.min(100, Math.round((current / badge.competitiveWinsRequired) * 100)),
      };
    }
    if (badge.competitiveMatchesRequired !== undefined) {
      const current = Math.min(stats.competitiveMatches || 0, badge.competitiveMatchesRequired);
      return {
        current,
        target: badge.competitiveMatchesRequired,
        percentage: Math.min(100, Math.round((current / badge.competitiveMatchesRequired) * 100)),
      };
    }
    if (badge.highFormSessionsRequired !== undefined) {
      const current = Math.min(stats.highFormSessionsCount || 0, badge.highFormSessionsRequired);
      return {
        current,
        target: badge.highFormSessionsRequired,
        percentage: Math.min(100, Math.round((current / badge.highFormSessionsRequired) * 100)),
      };
    }

    return null;
  }
}
