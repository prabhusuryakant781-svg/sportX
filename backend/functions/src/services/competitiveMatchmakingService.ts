/**
 * SportX Competitive Matchmaking Engine & Business Logic
 * Authoritative matchmaking, challenge auto-selection, pairing constraints,
 * telemetry verification, and match completion calculations.
 */

import {
  CompetitiveChallengeDoc,
  CompetitiveMatchDoc,
  CompetitiveRankDoc,
  CompetitiveRankTier,
  MatchPlayerState,
  MatchPlacementResult,
  MatchResults,
  QueueTicketDoc,
  RANK_TIER_ORDER,
  getRankTierFromRP,
} from '../types/competitive';
import { CompetitiveRepository } from '../repositories/competitiveRepository';
import * as logger from 'firebase-functions/logger';

export const SEED_CHALLENGES: CompetitiveChallengeDoc[] = [
  {
    challengeId: 'cricket_rapid_catch',
    sportId: 'cricket',
    activityType: 'sports_skill_drill',
    activityId: 'cricket_catches',
    title: 'Rapid Catch Arena',
    description: 'Test your reaction speed, hand-eye coordination, and catching form under pressure.',
    minPlayers: 2,
    maxPlayers: 2,
    durationSeconds: 90,
    goal: 'Maximum verified successful catches',
    scoringFormula: 'catches × catch-quality/form score',
    minRank: 'Bronze',
    maxRank: 'Gold',
    rewards: {
      firstPlace: { xp: 200, rankPoints: 40 },
      secondPlace: { xp: 100, rankPoints: 15 },
      draw: { xp: 150, rankPoints: 25 },
    },
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  },
  {
    challengeId: 'football_dribble_dash',
    sportId: 'football',
    activityType: 'sports_skill_drill',
    activityId: 'football_dribble_agility',
    title: 'Dribble Dash',
    description: 'Execute high-speed ball-control maneuvers and agility cuts with precision.',
    minPlayers: 2,
    maxPlayers: 2,
    durationSeconds: 120,
    goal: 'Complete verified dribble/agility repetitions with control',
    scoringFormula: 'successful repetitions × control/form score',
    minRank: 'Bronze',
    maxRank: 'Platinum',
    rewards: {
      firstPlace: { xp: 250, rankPoints: 45 },
      secondPlace: { xp: 125, rankPoints: 15 },
      draw: { xp: 175, rankPoints: 25 },
    },
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  },
  {
    challengeId: 'athletics_shuttle_sprint',
    sportId: 'athletics',
    activityType: 'sports_conditioning',
    activityId: 'shuttle_run',
    title: 'Shuttle Sprint Clash',
    description: 'Intense deceleration, directional change, and sprint conditioning head-to-head.',
    minPlayers: 2,
    maxPlayers: 2,
    durationSeconds: 180,
    goal: 'Maximum verified shuttle-run repetitions or distance',
    scoringFormula: 'verified distance/repetitions × pace and technique multiplier',
    minRank: 'Silver',
    maxRank: 'Diamond',
    rewards: {
      firstPlace: { xp: 300, rankPoints: 50 },
      secondPlace: { xp: 150, rankPoints: 20 },
      draw: { xp: 200, rankPoints: 30 },
    },
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  },
];

export class CompetitiveMatchmakingService {
  /**
   * Selects an eligible demo challenge based on sport preference, rank tier, and activity availability.
   * If no sport preference or no exact match, randomly selects an eligible challenge.
   */
  static async selectEligibleChallenge(
    sportPreference?: string,
    playerRankTier: CompetitiveRankTier = 'Bronze'
  ): Promise<CompetitiveChallengeDoc> {
    let challenges = await CompetitiveRepository.getAllChallenges();
    if (!challenges || challenges.length === 0) {
      // Ensure seed challenges are always available
      challenges = SEED_CHALLENGES;
    }

    const playerRankLevel = RANK_TIER_ORDER[playerRankTier] || 1;

    // Filter by rank compatibility
    const rankEligible = challenges.filter((c) => {
      const minLevel = RANK_TIER_ORDER[c.minRank] || 1;
      const maxLevel = RANK_TIER_ORDER[c.maxRank] || 5;
      return playerRankLevel >= minLevel && playerRankLevel <= maxLevel;
    });

    const candidates = rankEligible.length > 0 ? rankEligible : challenges;

    // Filter by sport preference if specified
    if (sportPreference && sportPreference !== 'all') {
      const normalizedPref = sportPreference.toLowerCase().trim();
      const sportMatched = candidates.filter((c) => c.sportId.toLowerCase() === normalizedPref);
      if (sportMatched.length > 0) {
        // Randomly pick if multiple match sport
        const randomIndex = Math.floor(Math.random() * sportMatched.length);
        return sportMatched[randomIndex];
      }
    }

    // Otherwise randomly choose an eligible challenge
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }

  /**
   * Checks whether two players satisfy skill and rank constraints.
   * Tolerance: maximum of ±1 rank tier difference (e.g. Bronze pairs with Bronze or Silver).
   */
  static isRankCompatible(tierA: CompetitiveRankTier, tierB: CompetitiveRankTier, maxTierGap = 1): boolean {
    const levelA = RANK_TIER_ORDER[tierA] || 1;
    const levelB = RANK_TIER_ORDER[tierB] || 1;
    return Math.abs(levelA - levelB) <= maxTierGap;
  }

  /**
   * Enqueues a player for random matchmaking and attempts immediate pairing.
   */
  static async joinQueue(params: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    sportPreference?: string;
  }): Promise<{ ticket: QueueTicketDoc; match?: CompetitiveMatchDoc }> {
    const { userId, displayName, avatarUrl, sportPreference } = params;
    let effectiveSport = sportPreference;
    if (!effectiveSport || effectiveSport === 'all' || effectiveSport === 'account') {
      try {
        const { UserRepository } = await import('../repositories/userRepository');
        const userDoc = await UserRepository.getById(userId);
        if (userDoc && userDoc.selectedSports && userDoc.selectedSports.length > 0) {
          effectiveSport = userDoc.selectedSports[0];
        }
      } catch (_) {}
    }

    // 1. Get user rank
    const userRank = await CompetitiveRepository.getUserRank(userId, effectiveSport || 'global');

    // 2. Select eligible challenge tailored to account need & rank
    const challenge = await this.selectEligibleChallenge(effectiveSport, userRank.rankTier);

    // 3. Look for eligible opponent in active queue
    const activeTickets = await CompetitiveRepository.getActiveQueueTickets();

    // Filter candidate opponents:
    // - Not the same user
    // - Same challenge
    // - Status is QUEUED
    // - Rank tier within tolerance
    const eligibleOpponents = activeTickets.filter((ticket) => {
      if (ticket.userId === userId) return false;
      if (ticket.challengeId && ticket.challengeId !== challenge.challengeId) return false;
      return this.isRankCompatible(userRank.rankTier, ticket.rankTier, 1);
    });

    if (eligibleOpponents.length > 0) {
      // Pair randomly among eligible candidates
      const randomIndex = Math.floor(Math.random() * eligibleOpponents.length);
      const matchedTicket = eligibleOpponents[randomIndex];

      // Create new Match Room (2 players initially, configurable)
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const player1: MatchPlayerState = {
        userId: matchedTicket.userId,
        displayName: matchedTicket.displayName,
        avatarUrl: matchedTicket.avatarUrl,
        rankTier: matchedTicket.rankTier,
        rankPoints: matchedTicket.rankPoints,
        isSimulated: !!matchedTicket.isSimulated,
        ready: !!matchedTicket.isSimulated, // Simulated players auto-ready
        telemetry: { reps: 0, formScore: 85, verifiedScore: 0, lastUpdated: now },
        completed: false,
      };

      const player2: MatchPlayerState = {
        userId,
        displayName,
        avatarUrl,
        rankTier: userRank.rankTier,
        rankPoints: userRank.rankPoints,
        isSimulated: false,
        ready: false,
        telemetry: { reps: 0, formScore: 85, verifiedScore: 0, lastUpdated: now },
        completed: false,
      };

      const matchDoc: CompetitiveMatchDoc = {
        matchId,
        challengeId: challenge.challengeId,
        challenge,
        targetPlayers: 2, // Configurable for 3+ later
        status: 'COUNTDOWN',
        players: [player1, player2],
        countdownStartsAt: now,
        matchStartsAt: new Date(Date.now() + 5000).toISOString(), // 5s countdown
        matchEndsAt: new Date(Date.now() + 5000 + challenge.durationSeconds * 1000).toISOString(),
        createdAt: now,
        updatedAt: now,
      };

      await CompetitiveRepository.createMatch(matchDoc);

      // Dequeue matched opponent
      await CompetitiveRepository.updateQueueTicket(matchedTicket.ticketId, {
        status: 'MATCHED',
        matchedMatchId: matchId,
      });

      // Create user's ticket as already matched
      const userTicketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const userTicket: QueueTicketDoc = {
        ticketId: userTicketId,
        userId,
        displayName,
        avatarUrl,
        sportPreference,
        rankTier: userRank.rankTier,
        rankPoints: userRank.rankPoints,
        challengeId: challenge.challengeId,
        status: 'MATCHED',
        matchedMatchId: matchId,
        isSimulated: false,
        createdAt: now,
        updatedAt: now,
      };
      await CompetitiveRepository.addQueueTicket(userTicket);

      return { ticket: userTicket, match: matchDoc };
    }

    // No opponent found immediately: place into queue
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newTicket: QueueTicketDoc = {
      ticketId,
      userId,
      displayName,
      avatarUrl,
      sportPreference,
      rankTier: userRank.rankTier,
      rankPoints: userRank.rankPoints,
      challengeId: challenge.challengeId,
      status: 'QUEUED',
      isSimulated: false,
      createdAt: now,
      updatedAt: now,
    };

    await CompetitiveRepository.addQueueTicket(newTicket);
    return { ticket: newTicket };
  }

  /**
   * Development-only simulated queue entry and instant pairing.
   * STRICTLY BLOCKED in production.
   */
  static async simulateDevOpponent(userTicketId: string): Promise<CompetitiveMatchDoc> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Simulation is strictly disabled in production mode.');
    }

    const userTicket = await CompetitiveRepository.getQueueTicket(userTicketId);
    if (!userTicket) {
      throw new Error('Queue ticket not found');
    }
    if (userTicket.status === 'MATCHED' && userTicket.matchedMatchId) {
      const match = await CompetitiveRepository.getMatchById(userTicket.matchedMatchId);
      if (match) return match;
    }

    const challenge =
      (userTicket.challengeId ? await CompetitiveRepository.getChallengeById(userTicket.challengeId) : null) ||
      (await this.selectEligibleChallenge(userTicket.sportPreference, userTicket.rankTier));

    // Simulated opponents with realistic athlete names and ranks
    const simBots = [
      { name: 'DevBot_Arjun', rank: userTicket.rankTier, rp: userTicket.rankPoints + 20 },
      { name: 'DevBot_Priya', rank: userTicket.rankTier, rp: Math.max(50, userTicket.rankPoints - 30) },
      { name: 'DevBot_Rohan', rank: userTicket.rankTier, rp: userTicket.rankPoints + 45 },
      { name: 'DevBot_Ananya', rank: userTicket.rankTier, rp: userTicket.rankPoints },
    ];
    const bot = simBots[Math.floor(Math.random() * simBots.length)];

    const matchId = `match_${Date.now()}_sim_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const pUser: MatchPlayerState = {
      userId: userTicket.userId,
      displayName: userTicket.displayName,
      avatarUrl: userTicket.avatarUrl,
      rankTier: userTicket.rankTier,
      rankPoints: userTicket.rankPoints,
      isSimulated: false,
      ready: true,
      telemetry: { reps: 0, formScore: 85, verifiedScore: 0, lastUpdated: now },
      completed: false,
    };

    const pSim: MatchPlayerState = {
      userId: `sim_${Date.now()}`,
      displayName: `⚡ ${bot.name} (Simulated)`,
      rankTier: bot.rank,
      rankPoints: bot.rp,
      isSimulated: true,
      ready: true,
      telemetry: { reps: 0, formScore: 88, verifiedScore: 0, lastUpdated: now },
      completed: false,
    };

    const matchDoc: CompetitiveMatchDoc = {
      matchId,
      challengeId: challenge.challengeId,
      challenge,
      targetPlayers: 2,
      status: 'COUNTDOWN',
      players: [pUser, pSim],
      countdownStartsAt: now,
      matchStartsAt: new Date(Date.now() + 3000).toISOString(),
      matchEndsAt: new Date(Date.now() + 3000 + challenge.durationSeconds * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    await CompetitiveRepository.createMatch(matchDoc);

    // Update user ticket to MATCHED
    await CompetitiveRepository.updateQueueTicket(userTicketId, {
      status: 'MATCHED',
      matchedMatchId: matchId,
    });

    return matchDoc;
  }

  /**
   * Authoritative scoring formula calculation based on verified challenge criteria:
   * 1. Cricket: catches * formScore%
   * 2. Football: repetitions * controlScore%
   * 3. Athletics: distance_or_reps * multiplier
   */
  static calculateVerifiedScore(
    _challengeId: string,
    repsOrCatches: number,
    formOrControlScore: number
  ): number {
    const safeReps = Math.max(0, Math.floor(repsOrCatches));
    const safeForm = Math.min(100, Math.max(0, formOrControlScore));
    // Core server calculation: verified count scaled by form precision
    return Math.round(safeReps * (safeForm / 100));
  }

  /**
   * Updates player live telemetry (reps, form, verified score)
   */
  static async updatePlayerTelemetry(
    matchId: string,
    userId: string,
    reps: number,
    formScore: number
  ): Promise<CompetitiveMatchDoc> {
    const match = await CompetitiveRepository.getMatchById(matchId);
    if (!match) throw new Error('Match not found');

    const verifiedScore = this.calculateVerifiedScore(match.challengeId, reps, formScore);
    const now = new Date().toISOString();

    const updatedPlayers = match.players.map((p) => {
      if (p.userId === userId) {
        return {
          ...p,
          telemetry: {
            reps,
            formScore,
            verifiedScore,
            lastUpdated: now,
          },
        };
      }
      return p;
    });

    // If opponent is simulated, dynamically advance simulated score slightly to provide realistic local demo competition
    const finalPlayers = updatedPlayers.map((p) => {
      if (p.isSimulated && match.status === 'IN_PROGRESS') {
        const simReps = Math.max(p.telemetry.reps, Math.round(reps * 0.9 + Math.floor(Math.random() * 3)));
        const simForm = Math.floor(82 + Math.random() * 14);
        return {
          ...p,
          telemetry: {
            reps: simReps,
            formScore: simForm,
            verifiedScore: Math.round(simReps * (simForm / 100)),
            lastUpdated: now,
          },
        };
      }
      return p;
    });

    const updated = await CompetitiveRepository.updateMatch(matchId, {
      players: finalPlayers,
      status: match.status === 'COUNTDOWN' ? 'IN_PROGRESS' : match.status,
    });
    return updated!;
  }

  /**
   * Finalizes the match authoritatively:
   * - Computes verified scores
   * - Determines winner, loser, or draw
   * - Calculates XP & RP awards based on placement
   * - Updates user's rank doc
   */
  static async finalizeMatch(matchId: string, submittingUserId?: string): Promise<CompetitiveMatchDoc> {
    const match = await CompetitiveRepository.getMatchById(matchId);
    if (!match) throw new Error('Match not found');

    // If already completed, return existing results
    if (match.status === 'COMPLETED' && match.results) {
      return match;
    }

    const challenge = match.challenge;
    const now = new Date().toISOString();

    // Mark players completed
    const completedPlayers = match.players.map((p) => {
      const isSubmitting = !submittingUserId || p.userId === submittingUserId;
      return {
        ...p,
        completed: p.completed || isSubmitting || !!p.isSimulated,
        submittedAt: p.submittedAt || now,
      };
    });

    // Sort players descending by verified score
    const sorted = [...completedPlayers].sort(
      (a, b) => b.telemetry.verifiedScore - a.telemetry.verifiedScore
    );

    const p1 = sorted[0];
    const p2 = sorted[1];
    const isDraw = sorted.length > 1 && p1.telemetry.verifiedScore === p2.telemetry.verifiedScore;

    const leaderboard: MatchPlacementResult[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      let placement: 1 | 2 = (i + 1) as 1 | 2;
      let rewardConfig = challenge.rewards.firstPlace;

      if (isDraw) {
        placement = 1;
        rewardConfig = challenge.rewards.draw;
      } else if (i === 1) {
        rewardConfig = challenge.rewards.secondPlace;
      }

      const rankChange = rewardConfig.rankPoints;
      const newRP = Math.max(0, p.rankPoints + rankChange);
      const newTier = getRankTierFromRP(newRP);

      leaderboard.push({
        userId: p.userId,
        displayName: p.displayName,
        placement,
        score: p.telemetry.verifiedScore,
        reps: p.telemetry.reps,
        formScore: p.telemetry.formScore,
        xpEarned: rewardConfig.xp,
        rankPointsChange: rankChange,
        newRankPoints: newRP,
        newRankTier: newTier,
      });

      // Update competitive rank record in Firestore/cache only for real users
      if (!p.isSimulated) {
        try {
          const userRank = await CompetitiveRepository.getUserRank(p.userId, challenge.sportId);
          const isWin = !isDraw && placement === 1;
          const isLoss = !isDraw && placement === 2;

          const updatedRank: CompetitiveRankDoc = {
            ...userRank,
            rankTier: newTier,
            rankPoints: newRP,
            wins: userRank.wins + (isWin ? 1 : 0),
            losses: userRank.losses + (isLoss ? 1 : 0),
            draws: userRank.draws + (isDraw ? 1 : 0),
            totalMatches: userRank.totalMatches + 1,
            highestRankPoints: Math.max(userRank.highestRankPoints, newRP),
            highestRankTier:
              RANK_TIER_ORDER[newTier] > RANK_TIER_ORDER[userRank.highestRankTier]
                ? newTier
                : userRank.highestRankTier,
            lastPlayedAt: now,
            updatedAt: now,
          };
          await CompetitiveRepository.saveUserRank(updatedRank);
        } catch (err) {
          logger.warn(`Failed to update competitive rank for ${p.userId}:`, err);
        }
      }
    }

    const matchResults: MatchResults = {
      winnerId: isDraw ? null : p1.userId,
      isDraw,
      leaderboard,
      finalizedAt: now,
    };

    const finalizedDoc = await CompetitiveRepository.updateMatch(matchId, {
      status: 'COMPLETED',
      players: completedPlayers,
      results: matchResults,
    });

    return finalizedDoc!;
  }
}
