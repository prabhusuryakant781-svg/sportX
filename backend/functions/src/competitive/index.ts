/**
 * SportX Competitive Matchmaking & Challenges Router
 * Isolated endpoints under /api/v1/competitive/*
 * All data operations interact exclusively with competitive* collections.
 */

import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { CompetitiveRepository } from '../repositories/competitiveRepository';
import { CompetitiveMatchmakingService, SEED_CHALLENGES } from '../services/competitiveMatchmakingService';
import * as logger from 'firebase-functions/logger';

export const competitiveRouter = Router();

/**
 * GET /api/v1/competitive/challenges
 * Retrieve all active competitive challenges (auto-seeds defaults if empty)
 */
competitiveRouter.get('/challenges', async (_req, res: Response) => {
  try {
    let challenges = await CompetitiveRepository.getAllChallenges();
    if (!challenges || challenges.length === 0) {
      // Auto-seed default demo challenges idempotently
      for (const challenge of SEED_CHALLENGES) {
        await CompetitiveRepository.seedChallenge(challenge);
      }
      challenges = SEED_CHALLENGES;
    }
    res.status(200).json({
      success: true,
      data: { challenges },
    });
  } catch (err: any) {
    logger.error('[CompetitiveRouter] Error fetching challenges:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/competitive/rank
 * Retrieve user's current rank tier and points (sport-specific or global)
 */
competitiveRouter.get('/rank', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const sportId = (req.query.sportId as string) || 'global';
    const rank = await CompetitiveRepository.getUserRank(userId, sportId);

    res.status(200).json({
      success: true,
      data: { rank },
    });
  } catch (err: any) {
    logger.error('[CompetitiveRouter] Error fetching user rank:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/competitive/matchmaking/join
 * Join global random matchmaking queue with auto challenge selection & pairing
 */
competitiveRouter.post('/matchmaking/join', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const displayName = req.user!.name || req.user!.email?.split('@')[0] || 'Athlete';
    const { sportPreference, avatarUrl } = req.body || {};

    const result = await CompetitiveMatchmakingService.joinQueue({
      userId,
      displayName,
      avatarUrl,
      sportPreference,
    });

    res.status(200).json({
      success: true,
      message: result.match ? 'Instant match found!' : 'Placed in matchmaking queue',
      data: {
        ticket: result.ticket,
        match: result.match || null,
      },
    });
  } catch (err: any) {
    logger.error('[CompetitiveRouter] Error joining matchmaking:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/competitive/matchmaking/status/:ticketId
 * Poll ticket status to see if paired with a match
 */
competitiveRouter.get('/matchmaking/status/:ticketId', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    const ticket = await CompetitiveRepository.getQueueTicket(ticketId);

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Queue ticket not found' });
    }

    let match = null;
    if (ticket.status === 'MATCHED' && ticket.matchedMatchId) {
      match = await CompetitiveRepository.getMatchById(ticket.matchedMatchId);
    }

    res.status(200).json({
      success: true,
      data: { ticket, match },
    });
  } catch (err: any) {
    logger.error('[CompetitiveRouter] Error polling ticket status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/competitive/matchmaking/cancel
 * Cancel active queue ticket
 */
competitiveRouter.post('/matchmaking/cancel', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { ticketId } = req.body || {};
    if (!ticketId) {
      return res.status(400).json({ success: false, error: 'ticketId is required' });
    }

    const cancelled = await CompetitiveRepository.cancelQueueTicket(ticketId, userId);
    res.status(200).json({
      success: cancelled,
      message: cancelled ? 'Queue search cancelled' : 'Ticket could not be cancelled',
    });
  } catch (err: any) {
    logger.error('[CompetitiveRouter] Error cancelling queue:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/competitive/dev/simulate-opponent
 * Development-only simulated queue entry and instant pairing.
 * STRICTLY FORBIDDEN IN PRODUCTION.
 */
competitiveRouter.post('/dev/simulate-opponent', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Simulated matchmaking is disabled in production environments.',
      });
    }

    const { ticketId } = req.body || {};
    if (!ticketId) {
      return res.status(400).json({ success: false, error: 'ticketId is required' });
    }

    const match = await CompetitiveMatchmakingService.simulateDevOpponent(ticketId);
    res.status(200).json({
      success: true,
      message: 'Simulated opponent matched successfully (Dev mode)',
      data: { match },
    });
  } catch (err: any) {
    logger.error('[CompetitiveRouter] Dev simulation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/competitive/matches/:id
 * Retrieve live state of competitive match room
 */
competitiveRouter.get('/matches/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const match = await CompetitiveRepository.getMatchById(id);
    if (!match) {
      return res.status(404).json({ success: false, error: 'Match room not found' });
    }

    res.status(200).json({
      success: true,
      data: { match },
    });
  } catch (err: any) {
    logger.error('[CompetitiveRouter] Error fetching match:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/competitive/matches/:id/ready
 * Mark user ready in match room
 */
competitiveRouter.post('/matches/:id/ready', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.uid;
    const match = await CompetitiveRepository.getMatchById(id);

    if (!match) {
      return res.status(404).json({ success: false, error: 'Match room not found' });
    }

    const updatedPlayers = match.players.map((p) => {
      if (p.userId === userId) {
        return { ...p, ready: true };
      }
      return p;
    });

    const allReady = updatedPlayers.every((p) => p.ready);
    const updated = await CompetitiveRepository.updateMatch(id, {
      players: updatedPlayers,
      status: allReady ? 'IN_PROGRESS' : match.status,
    });

    res.status(200).json({
      success: true,
      data: { match: updated },
    });
  } catch (err: any) {
    logger.error('[CompetitiveRouter] Error setting match ready:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/competitive/matches/:id/telemetry
 * Stream verified repetitions and form accuracy to live match room
 */
competitiveRouter.post('/matches/:id/telemetry', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.uid;
    const { reps = 0, formScore = 85 } = req.body || {};

    const updatedMatch = await CompetitiveMatchmakingService.updatePlayerTelemetry(
      id,
      userId,
      Number(reps),
      Number(formScore)
    );

    res.status(200).json({
      success: true,
      data: { match: updatedMatch },
    });
  } catch (err: any) {
    logger.error('[CompetitiveRouter] Error updating match telemetry:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// In-memory sliding-window rate limiter per user/match to protect endpoint from spam
const matchSubmissionRateMap = new Map<string, number>();

/**
 * POST /api/v1/competitive/matches/:id/finish
 * Authoritatively verify and finalize match, compute placement, rewards, and rank points
 */
competitiveRouter.post('/matches/:id/finish', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.uid;
    const payload = req.body;

    // Rate Limiting / Abuse Protection (1.0s sliding window per user)
    const rateKey = `${id}_${userId}`;
    const nowMs = Date.now();
    const lastSubmit = matchSubmissionRateMap.get(rateKey) || 0;
    if (nowMs - lastSubmit < 1000) {
      return res.status(429).json({
        success: false,
        error: 'Session could not be verified: rate limit exceeded. Please wait a moment.',
      });
    }
    matchSubmissionRateMap.set(rateKey, nowMs);

    const finalizedMatch = await CompetitiveMatchmakingService.verifyAndFinalizeMatch(id, userId, payload);

    res.status(200).json({
      success: true,
      message: 'Match verified and finalized authoritatively',
      data: {
        match: finalizedMatch,
        results: finalizedMatch.results,
      },
    });
  } catch (err: any) {
    logger.error('[CompetitiveRouter] Error finalizing match:', err);
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/competitive/history
 * Retrieve verified completed challenge and match history for authenticated user.
 * Supports filters: outcome (all, win, loss, draw), exerciseId, type.
 */
competitiveRouter.get('/history', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const outcome = req.query.outcome as 'all' | 'win' | 'loss' | 'draw' | undefined;
    const exerciseId = req.query.exerciseId as string | undefined;

    const matches = await CompetitiveRepository.getUserMatchHistory(userId, {
      outcome,
      exerciseId,
    });

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
      history: matches,
    });
  } catch (err: any) {
    logger.error('[CompetitiveRouter] Error fetching match history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/competitive/history/:id
 * Retrieve detailed breakdown of a specific past match
 */
competitiveRouter.get('/history/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.uid;

    const match = await CompetitiveRepository.getMatchById(id);
    if (!match) {
      return res.status(404).json({ success: false, error: 'Match record not found' });
    }

    const isParticipant = match.players.some((p) => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'Access denied: You were not a participant in this match' });
    }

    const userPlacement = match.results?.leaderboard.find((l) => l.userId === userId);
    const opponentPlacement = match.results?.leaderboard.find((l) => l.userId !== userId);
    const opponentPlayer = match.players.find((p) => p.userId !== userId);

    res.status(200).json({
      success: true,
      data: {
        matchId: match.matchId,
        date: match.results?.finalizedAt || match.createdAt,
        challenge: match.challenge,
        userResult: userPlacement,
        opponent: {
          displayName: opponentPlayer?.displayName || opponentPlacement?.displayName || 'Opponent',
          rankTier: opponentPlayer?.rankTier || 'Bronze',
          result: opponentPlacement,
        },
        rawMatch: match,
      },
    });
  } catch (err: any) {
    logger.error('[CompetitiveRouter] Error fetching match details:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
