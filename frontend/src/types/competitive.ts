/**
 * SportX Competitive Matchmaking & Challenges - Frontend Types
 */

export type CompetitiveRankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface ChallengeRewardConfig {
  xp: number;
  rankPoints: number;
}

export interface CompetitiveChallengeDoc {
  challengeId: string;
  sportId: string;
  activityType: string;
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
  createdAt?: string;
  updatedAt?: string;
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
  formScore: number;
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
  placement: number;
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
  sportId: string;
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
