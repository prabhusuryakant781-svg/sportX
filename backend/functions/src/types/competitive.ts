/**
 * SportX Competitive Matchmaking & Challenges - Isolated Types
 * Person 1 & 2: Competitive Foundation & Global Matchmaking
 */

export type CompetitiveRankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export const RANK_TIER_ORDER: Record<CompetitiveRankTier, number> = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Platinum: 4,
  Diamond: 5,
};

export const RANK_TIER_THRESHOLDS: Record<CompetitiveRankTier, { minRP: number; maxRP: number }> = {
  Bronze: { minRP: 0, maxRP: 399 },
  Silver: { minRP: 400, maxRP: 799 },
  Gold: { minRP: 800, maxRP: 1199 },
  Platinum: { minRP: 1200, maxRP: 1599 },
  Diamond: { minRP: 1600, maxRP: 99999 },
};

export function getRankTierFromRP(rp: number): CompetitiveRankTier {
  if (rp >= 1600) return 'Diamond';
  if (rp >= 1200) return 'Platinum';
  if (rp >= 800) return 'Gold';
  if (rp >= 400) return 'Silver';
  return 'Bronze';
}

export interface ChallengeRewardConfig {
  xp: number;
  rankPoints: number;
}

export interface CompetitiveChallengeDoc {
  challengeId: string;
  sportId: 'cricket' | 'football' | 'athletics' | string;
  activityType: 'sports_skill_drill' | 'sports_conditioning' | string;
  activityId: string;
  title: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  durationSeconds: number;
  goal: string;
  scoringFormula: string;
  minRank: CompetitiveRankTier;
  maxRank: CompetitiveRankTier;
  rewards: {
    firstPlace: ChallengeRewardConfig;
    secondPlace: ChallengeRewardConfig;
    draw: ChallengeRewardConfig;
  };
  createdAt: string;
  updatedAt: string;
}

export type QueueTicketStatus = 'QUEUED' | 'MATCHED' | 'CANCELLED';

export interface QueueTicketDoc {
  ticketId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  sportPreference?: string;
  rankTier: CompetitiveRankTier;
  rankPoints: number;
  challengeId?: string;
  status: QueueTicketStatus;
  matchedMatchId?: string;
  isSimulated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MatchStatus = 'COUNTDOWN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface MatchPlayerTelemetry {
  reps: number;
  formScore: number; // 0 - 100
  metricValue?: number;
  verifiedScore: number;
  lastUpdated: string;
}

export interface MatchPlayerState {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  rankTier: CompetitiveRankTier;
  rankPoints: number;
  isSimulated?: boolean;
  ready: boolean;
  telemetry: MatchPlayerTelemetry;
  completed: boolean;
  submittedAt?: string;
}

export interface MatchPlacementResult {
  userId: string;
  displayName: string;
  placement: 1 | 2 | 3 | number;
  score: number;
  reps: number;
  formScore: number;
  xpEarned: number;
  rankPointsChange: number;
  newRankPoints: number;
  newRankTier: CompetitiveRankTier;
}

export interface MatchResults {
  winnerId?: string | null;
  isDraw: boolean;
  leaderboard: MatchPlacementResult[];
  finalizedAt: string;
}

export interface CompetitiveMatchDoc {
  matchId: string;
  challengeId: string;
  challenge: CompetitiveChallengeDoc;
  targetPlayers: number;
  status: MatchStatus;
  players: MatchPlayerState[];
  countdownStartsAt?: string;
  matchStartsAt?: string;
  matchEndsAt?: string;
  results?: MatchResults;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitiveRankDoc {
  userId: string;
  sportId: string; // 'global' or sportId
  rankTier: CompetitiveRankTier;
  rankPoints: number;
  wins: number;
  losses: number;
  draws: number;
  totalMatches: number;
  highestRankTier: CompetitiveRankTier;
  highestRankPoints: number;
  lastPlayedAt?: string;
  updatedAt: string;
}
