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
  CompetitiveVerificationPayload,
  MatchPlayerState,
  MatchPlacementResult,
  MatchResults,
  QueueTicketDoc,
  RANK_TIER_ORDER,
  getRankTierFromRP,
} from '../types/competitive';
import { CompetitiveRepository } from '../repositories/competitiveRepository';
import { UserRepository } from '../repositories/userRepository';
import * as logger from 'firebase-functions/logger';

export const SEED_CHALLENGES: CompetitiveChallengeDoc[] = [
  {
    challengeId: 'cricket_rapid_catch',
    sportId: 'cricket',
    activityType: 'sports_skill_drill',
    activityId: 'cricket_catches',
    exerciseId: 'squat',
    targetReps: 20,
    title: 'Rapid Catch Arena',
    description: 'Test your reaction speed, hand-eye coordination, and catching form under pressure.',
    minPlayers: 2,
    maxPlayers: 2,
    durationSeconds: 90,
    goal: 'Complete 20 verified squats/catches with proper depth',
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
    exerciseId: 'jumping_jacks',
    title: 'Dribble Dash',
    description: 'Execute high-speed ball-control maneuvers and agility cuts with precision.',
    minPlayers: 2,
    maxPlayers: 2,
    durationSeconds: 120,
    goal: 'Complete maximum verified repetitions with agility and control',
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
    exerciseId: 'pushup',
    targetReps: 20,
    title: 'Shuttle Sprint Clash',
    description: 'Intense deceleration, directional change, and sprint conditioning head-to-head.',
    minPlayers: 2,
    maxPlayers: 2,
    durationSeconds: 180,
    goal: 'Complete 20 verified pushups with full extension',
    scoringFormula: 'verified repetitions × pace and technique multiplier',
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

export function getChallengeExerciseId(challenge?: Partial<CompetitiveChallengeDoc> | null): string {
  if (challenge?.exerciseId) return challenge.exerciseId;
  if (!challenge) return 'squat';
  const id = (challenge.challengeId || challenge.activityId || challenge.sportId || '').toLowerCase();
  if (id.includes('cricket') || id.includes('catch') || id.includes('squat')) return 'squat';
  if (id.includes('football') || id.includes('dribble') || id.includes('jumping_jacks') || id.includes('jack')) return 'jumping_jacks';
  if (id.includes('athletic') || id.includes('sprint') || id.includes('pushup') || id.includes('push_up')) return 'pushup';
  return 'squat';
}

export function getChallengeTargetReps(challenge?: Partial<CompetitiveChallengeDoc> | null): number {
  if (challenge?.targetReps && challenge.targetReps > 0) return challenge.targetReps;
  if (!challenge) return 0;
  const id = (challenge.challengeId || challenge.activityId || '').toLowerCase();
  if (id.includes('cricket') || id.includes('catch')) return 20;
  if (id.includes('athletic') || id.includes('sprint') || id.includes('pushup')) return 20;
  return 0; // timed challenge (highest verified reps within time limit)
}

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
   * Computes server-authoritative Ranking Point (RP) adjustment and rank transition.
   */
  static calculateRPAdjustment(params: {
    outcome: 'WIN' | 'LOSS' | 'DRAW';
    currentRP: number;
    currentTier?: CompetitiveRankTier;
    challengeRankPointsReward?: number;
    placement?: number;
    totalPlayers?: number;
    formScore: number;
  }): {
    previousRP: number;
    rankPointsChange: number;
    newRP: number;
    previousTier: CompetitiveRankTier;
    newTier: CompetitiveRankTier;
    isRankUp: boolean;
    isRankDown: boolean;
    rankTransition?: string;
  } {
    const { outcome, currentRP, challengeRankPointsReward = 40, formScore } = params;
    const previousRP = Math.max(0, currentRP);
    const previousTier = params.currentTier || getRankTierFromRP(previousRP);

    let rankPointsChange = 0;

    if (outcome === 'WIN') {
      const baseWin = (challengeRankPointsReward && challengeRankPointsReward > 0) ? challengeRankPointsReward : 40;
      // High form accuracy bonus (+5 RP)
      const formBonus = formScore >= 90 ? 5 : 0;
      rankPointsChange = baseWin + formBonus;
    } else if (outcome === 'LOSS') {
      // Scaled loss penalty based on rank tier:
      // Bronze: -10 RP (protection)
      // Silver: -15 RP
      // Gold: -20 RP
      // Platinum: -25 RP
      // Diamond: -30 RP
      let basePenalty = -15;
      if (previousTier === 'Bronze') basePenalty = -10;
      else if (previousTier === 'Silver') basePenalty = -15;
      else if (previousTier === 'Gold') basePenalty = -20;
      else if (previousTier === 'Platinum') basePenalty = -25;
      else if (previousTier === 'Diamond') basePenalty = -30;

      // High form mitigation: if loser had formScore >= 85%, mitigate penalty by +5
      const formMitigation = formScore >= 85 ? 5 : 0;
      rankPointsChange = basePenalty + formMitigation;
    } else {
      // DRAW
      rankPointsChange = 10;
    }

    const newRP = Math.max(0, previousRP + rankPointsChange);
    const newTier = getRankTierFromRP(newRP);

    const isRankUp = RANK_TIER_ORDER[newTier] > RANK_TIER_ORDER[previousTier];
    const isRankDown = RANK_TIER_ORDER[newTier] < RANK_TIER_ORDER[previousTier];
    const rankTransition = isRankUp || isRankDown ? `${previousTier} → ${newTier}` : undefined;

    return {
      previousRP,
      rankPointsChange,
      newRP,
      previousTier,
      newTier,
      isRankUp,
      isRankDown,
      rankTransition,
    };
  }

  /**
   * Authoritative server verification and finalization of competitive match.
   * Enforces:
   * 1. Authenticated user presence and membership in match.players
   * 2. Anti-cheat / Sanity validation on duration, cadence, valid reps, and form score
   * 3. Challenge exercise matching
   * 4. Challenge target satisfaction: validReps >= requiredReps
   * 5. Idempotent finalization (returning existing match if already COMPLETED)
   * 6. Step 4 RP computation and rank doc update
   * 7. Step 3 streak tracking, XP awards, and badge evaluation
   */
  static async verifyAndFinalizeMatch(
    matchId: string,
    submittingUserId?: string,
    payload?: CompetitiveVerificationPayload
  ): Promise<CompetitiveMatchDoc> {
    const match = await CompetitiveRepository.getMatchById(matchId);
    if (!match) {
      const err: any = new Error('Match not found');
      err.status = 404;
      throw err;
    }

    // 1. Validate participant membership
    if (submittingUserId) {
      const isParticipant = match.players.some((p) => p.userId === submittingUserId);
      if (!isParticipant) {
        const err: any = new Error('Unauthorized: User is not a participant in this match');
        err.status = 403;
        throw err;
      }
    }

    // 2. Status validity
    if (match.status === 'CANCELLED') {
      const err: any = new Error('Cannot finalize cancelled match');
      err.status = 400;
      throw err;
    }

    // 3. Idempotency guard: If already completed, return existing results without re-awarding RP/XP/streaks
    if (match.status === 'COMPLETED' && match.results) {
      return match;
    }

    // 3. Challenge resolution & Exercise verification
    const challenge = match.challenge;
    const requiredExercise = challenge.exerciseId || getChallengeExerciseId(challenge);
    const targetReps = challenge.targetReps || getChallengeTargetReps(challenge);

    if (payload?.exerciseId && payload.exerciseId !== requiredExercise) {
      const err: any = new Error(
        `Exercise mismatch: challenge requires ${requiredExercise}, received ${payload.exerciseId}`
      );
      err.status = 400;
      throw err;
    }

    // 4. Anti-Cheat / Sanity checks on payload (if provided)
    if (payload) {
      if (typeof payload.reps === 'number' && payload.reps < 0) {
        const err: any = new Error('Invalid repetitions: cannot be negative');
        err.status = 400;
        throw err;
      }
      if (typeof payload.validReps === 'number') {
        if (payload.validReps < 0) {
          const err: any = new Error('Invalid valid repetitions: cannot be negative');
          err.status = 400;
          throw err;
        }
        if (typeof payload.reps === 'number' && payload.validReps > payload.reps) {
          const err: any = new Error('Valid reps cannot exceed total reps');
          err.status = 400;
          throw err;
        }
      }
      if (typeof payload.formScore === 'number' && (payload.formScore < 0 || payload.formScore > 100)) {
        const err: any = new Error('Invalid form score: must be between 0 and 100');
        err.status = 400;
        throw err;
      }
      if (typeof payload.durationSeconds === 'number') {
        if (payload.durationSeconds < 5 && (payload.reps || 0) > 0) {
          const err: any = new Error('Invalid duration: minimum 5 seconds required for verified reps');
          err.status = 400;
          throw err;
        }
        if (payload.durationSeconds > 3600) {
          const err: any = new Error('Invalid duration: exceeds maximum limit of 3600 seconds');
          err.status = 400;
          throw err;
        }
        if (payload.durationSeconds > 0 && payload.reps && (payload.reps / payload.durationSeconds > 2.5)) {
          const err: any = new Error('Physically impossible repetition cadence detected');
          err.status = 400;
          throw err;
        }
      }
    }

    const now = new Date().toISOString();

    // 5. Update players with authoritative telemetry
    const completedPlayers = match.players.map((p) => {
      const isSubmitting = !submittingUserId || p.userId === submittingUserId;
      let pReps = p.telemetry.reps;
      let pForm = p.telemetry.formScore;

      if (isSubmitting && payload) {
        pReps = payload.validReps !== undefined ? payload.validReps : (payload.reps !== undefined ? payload.reps : pReps);
        pForm = payload.formScore !== undefined ? payload.formScore : pForm;
      }

      const verifiedScore = this.calculateVerifiedScore(match.challengeId, pReps, pForm);

      return {
        ...p,
        completed: p.completed || isSubmitting || !!p.isSimulated,
        submittedAt: p.submittedAt || now,
        telemetry: {
          ...p.telemetry,
          reps: pReps,
          formScore: pForm,
          verifiedScore,
          lastUpdated: now,
        },
      };
    });

    // 6. Check target requirements
    const submittingPlayer = completedPlayers.find((p) => p.userId === submittingUserId);
    const userMeetsTarget = !submittingPlayer || targetReps <= 0 || (submittingPlayer.telemetry.reps >= targetReps);

    // Sort players descending by verified score
    const sorted = [...completedPlayers].sort(
      (a, b) => b.telemetry.verifiedScore - a.telemetry.verifiedScore
    );

    const p1 = sorted[0];
    const p2 = sorted[1];
    const rawIsDraw = sorted.length > 1 && p1.telemetry.verifiedScore === p2.telemetry.verifiedScore;

    const leaderboard: MatchPlacementResult[] = [];
    const userRankUpdates: Array<{ userId: string; sportId: string; rankDoc: CompetitiveRankDoc }> = [];

    // If user failed the challenge target requirements, user cannot win!
    // They are forced to LOSS / placement 2.
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const isThisSubmittingUser = submittingUserId && p.userId === submittingUserId;
      let placement: 1 | 2 = (i + 1) as 1 | 2;
      let outcome: 'WIN' | 'LOSS' | 'DRAW';
      let rewardConfig = challenge.rewards.firstPlace;

      if (isThisSubmittingUser && !userMeetsTarget) {
        // Failed challenge target: forced LOSS
        placement = 2;
        outcome = 'LOSS';
        rewardConfig = challenge.rewards.secondPlace;
      } else if (!isThisSubmittingUser && submittingUserId && !userMeetsTarget) {
        // Opponent automatically wins because submitting user failed target
        placement = 1;
        outcome = 'WIN';
        rewardConfig = challenge.rewards.firstPlace;
      } else if (rawIsDraw) {
        placement = 1;
        outcome = 'DRAW';
        rewardConfig = challenge.rewards.draw;
      } else if (i === 0) {
        placement = 1;
        outcome = 'WIN';
        rewardConfig = challenge.rewards.firstPlace;
      } else {
        placement = 2;
        outcome = 'LOSS';
        rewardConfig = challenge.rewards.secondPlace;
      }

      // Fetch user's current authoritative rank points
      let currentRP = p.rankPoints || 100;
      let userRank: CompetitiveRankDoc | null = null;
      if (!p.isSimulated) {
        userRank = await CompetitiveRepository.getUserRank(p.userId, challenge.sportId);
        // If sport rank has not yet been initialized with match history, check global rank
        if (!userRank || (userRank.rankPoints === 100 && userRank.totalMatches === 0)) {
          const globalRank = await CompetitiveRepository.getUserRank(p.userId, 'global');
          if (globalRank && (globalRank.rankPoints !== 100 || globalRank.totalMatches > 0)) {
            userRank = globalRank;
          }
        }
        currentRP = userRank?.rankPoints ?? p.rankPoints ?? 100;
      }

      const rpCalc = this.calculateRPAdjustment({
        outcome,
        currentRP,
        challengeRankPointsReward: rewardConfig.rankPoints,
        formScore: p.telemetry.formScore,
      });

      leaderboard.push({
        userId: p.userId,
        displayName: p.displayName,
        placement,
        outcome,
        score: p.telemetry.verifiedScore,
        reps: p.telemetry.reps,
        formScore: p.telemetry.formScore,
        xpEarned: rewardConfig.xp,
        previousRankPoints: rpCalc.previousRP,
        rankPointsChange: rpCalc.rankPointsChange,
        newRankPoints: rpCalc.newRP,
        previousRankTier: rpCalc.previousTier,
        newRankTier: rpCalc.newTier,
        isRankUp: rpCalc.isRankUp,
        isRankDown: rpCalc.isRankDown,
        rankTransition: rpCalc.rankTransition,
      });

      if (!p.isSimulated && userRank) {
        const updatedRank: CompetitiveRankDoc = {
          ...userRank,
          rankPoints: rpCalc.newRP,
          rankTier: rpCalc.newTier,
          wins: userRank.wins + (outcome === 'WIN' ? 1 : 0),
          losses: userRank.losses + (outcome === 'LOSS' ? 1 : 0),
          draws: userRank.draws + (outcome === 'DRAW' ? 1 : 0),
          totalMatches: userRank.totalMatches + 1,
          highestRankPoints: Math.max(userRank.highestRankPoints || 100, rpCalc.newRP),
          highestRankTier:
            RANK_TIER_ORDER[rpCalc.newTier] > RANK_TIER_ORDER[userRank.highestRankTier || 'Bronze']
              ? rpCalc.newTier
              : (userRank.highestRankTier || 'Bronze'),
          lastPlayedAt: now,
          updatedAt: now,
        };
        userRankUpdates.push({
          userId: p.userId,
          sportId: challenge.sportId,
          rankDoc: updatedRank,
        });

        // Also update the global rank document so competitiveRanks/{userId}_global stays in sync
        if (challenge.sportId !== 'global') {
          userRankUpdates.push({
            userId: p.userId,
            sportId: 'global',
            rankDoc: {
              ...updatedRank,
              sportId: 'global',
            },
          });
        }
      }
    }

    const winningEntry = leaderboard.find((l) => l.placement === 1 && l.outcome === 'WIN');
    const isFinalDraw = leaderboard.every((l) => l.outcome === 'DRAW');

    const matchResults: MatchResults = {
      winnerId: isFinalDraw ? null : (winningEntry ? winningEntry.userId : p1.userId),
      isDraw: isFinalDraw,
      leaderboard,
      finalizedAt: now,
    };

    const finalizedDoc = await CompetitiveRepository.executeAtomicMatchFinalization({
      matchId,
      completedPlayers,
      matchResults,
      userRankUpdates,
    });

    // Record qualifying activity to update daily streak and award milestone badges (Step 3 & Pre-Step 5 XP)
    for (const p of sorted) {
      if (!p.isSimulated) {
        const pResult = leaderboard.find((l) => l.userId === p.userId);
        await UserRepository.recordQualifyingActivity(p.userId, {
          activityType: 'lobby',
          activityId: matchId,
          xpEarned: pResult?.xpEarned || 0,
          activityDate: now.split('T')[0],
        }).catch((err) => logger.warn(`Failed to update daily streak for ${p.userId}:`, err));
      }
    }

    return finalizedDoc!;
  }

  /**
   * Backwards-compatible wrapper calling verifyAndFinalizeMatch
   */
  static async finalizeMatch(matchId: string, submittingUserId?: string): Promise<CompetitiveMatchDoc> {
    return this.verifyAndFinalizeMatch(matchId, submittingUserId, undefined);
  }
}
