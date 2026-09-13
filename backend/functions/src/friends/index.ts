/**
 * SportX Friends & Social Challenges Router
 * Endpoints under /api/v1/friends/*
 * Handles athlete friendships, friend requests, athlete search, and peer challenges.
 */

import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { FriendRepository } from '../repositories/friendRepository';
import { FriendChallengeService } from '../services/friendChallengeService';
import * as logger from 'firebase-functions/logger';

export const friendsRouter = Router();

/**
 * GET /api/v1/friends
 * Retrieve list of confirmed athlete friends
 */
friendsRouter.get('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const friends = await FriendRepository.getUserFriends(userId);

    res.status(200).json({
      success: true,
      count: friends.length,
      data: friends,
      friends,
    });
  } catch (err: any) {
    logger.error('[FriendsRouter] Error fetching friends:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/friends/requests
 * Retrieve pending incoming and outgoing friend requests
 */
friendsRouter.get('/requests', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const requests = await FriendRepository.getUserRequests(userId);

    res.status(200).json({
      success: true,
      data: requests.incoming,
      incoming: requests.incoming,
      outgoing: requests.outgoing,
      requests,
    });
  } catch (err: any) {
    logger.error('[FriendsRouter] Error fetching friend requests:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/friends/requests and POST /api/v1/friends/request
 * Send a new friend request to an athlete
 */
const handleSendRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const senderId = req.user!.uid;
    const { receiverId } = req.body || {};

    if (!receiverId) {
      return res.status(400).json({ success: false, error: 'receiverId is required' });
    }

    const request = await FriendRepository.sendFriendRequest(senderId, receiverId);
    res.status(201).json({
      success: true,
      message: 'Friend request sent successfully!',
      data: request,
      request,
    });
  } catch (err: any) {
    logger.warn('[FriendsRouter] Error sending friend request:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};
friendsRouter.post('/request', verifyAuth, handleSendRequest);
friendsRouter.post('/requests', verifyAuth, handleSendRequest);

/**
 * PUT /api/v1/friends/requests/:id/respond
 * Respond (accept or decline) to a friend request
 */
friendsRouter.put('/requests/:id/respond', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { action } = req.body || {};

    if (action === 'accept') {
      const friendship = await FriendRepository.acceptFriendRequest(req.params.id, userId);
      return res.status(200).json({
        success: true,
        message: 'Friend request accepted! You are now connected.',
        data: friendship,
      });
    } else {
      const declined = await FriendRepository.declineFriendRequest(req.params.id, userId);
      return res.status(200).json({
        success: true,
        message: 'Friend request declined',
        data: declined,
      });
    }
  } catch (err: any) {
    logger.warn('[FriendsRouter] Error responding to friend request:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/friends/requests/:id/accept
 * Accept a friend request
 */
friendsRouter.post('/requests/:id/accept', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const friendship = await FriendRepository.acceptFriendRequest(req.params.id, userId);

    res.status(200).json({
      success: true,
      message: 'Friend request accepted! You are now connected.',
      data: friendship,
    });
  } catch (err: any) {
    logger.warn('[FriendsRouter] Error accepting friend request:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/friends/requests/:id/decline
 * Decline a friend request
 */
friendsRouter.post('/requests/:id/decline', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const declined = await FriendRepository.declineFriendRequest(req.params.id, userId);

    res.status(200).json({
      success: true,
      message: 'Friend request declined',
      data: declined,
    });
  } catch (err: any) {
    logger.warn('[FriendsRouter] Error declining friend request:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/v1/friends/:friendId
 * Remove a friend connection
 */
friendsRouter.delete('/:friendId', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    await FriendRepository.removeFriend(userId, req.params.friendId);

    res.status(200).json({
      success: true,
      message: 'Friend removed successfully',
    });
  } catch (err: any) {
    logger.error('[FriendsRouter] Error removing friend:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/friends/search
 * Search registered athletes (returns only public profile information)
 */
friendsRouter.get('/search', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const query = (req.query.q as string) || '';

    const athletes = await FriendRepository.searchAthletes(query, userId);
    res.status(200).json({
      success: true,
      count: athletes.length,
      data: athletes,
      athletes,
    });
  } catch (err: any) {
    logger.error('[FriendsRouter] Error searching athletes:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── FRIEND CHALLENGES ────────────────────────────────────────────────────────

/**
 * GET /api/v1/friends/challenges & /challenges/list
 * Retrieve all friend challenges for authenticated user
 */
const handleGetChallenges = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const challenges = await FriendChallengeService.getUserChallenges(userId);

    res.status(200).json({
      success: true,
      count: challenges.length,
      data: challenges,
      challenges,
    });
  } catch (err: any) {
    logger.error('[FriendsRouter] Error fetching friend challenges:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
friendsRouter.get('/challenges', verifyAuth, handleGetChallenges);
friendsRouter.get('/challenges/list', verifyAuth, handleGetChallenges);

/**
 * POST /api/v1/friends/challenges
 * Challenge a friend to a camera-verified athletic contest
 */
friendsRouter.post('/challenges', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const challengerId = req.user!.uid;
    const { opponentId, exerciseId, challengeType, targetReps, durationSeconds, rules } = req.body || {};

    const challenge = await FriendChallengeService.createChallenge({
      challengerId,
      opponentId,
      exerciseId,
      challengeType,
      targetReps,
      durationSeconds,
      rules,
    });

    res.status(201).json({
      success: true,
      message: 'Challenge issued! Your friend has been notified.',
      data: { challenge },
    });
  } catch (err: any) {
    logger.warn('[FriendsRouter] Error creating friend challenge:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/friends/challenges/:id/accept
 * Accept a friend challenge
 */
friendsRouter.post('/challenges/:id/accept', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const challenge = await FriendChallengeService.acceptChallenge(req.params.id, userId);

    res.status(200).json({
      success: true,
      message: 'Challenge accepted! Get ready to start camera verification.',
      data: { challenge },
    });
  } catch (err: any) {
    logger.warn('[FriendsRouter] Error accepting challenge:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/friends/challenges/:id/decline
 * Decline a friend challenge
 */
friendsRouter.post('/challenges/:id/decline', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const challenge = await FriendChallengeService.declineChallenge(req.params.id, userId);

    res.status(200).json({
      success: true,
      message: 'Challenge declined',
      data: { challenge },
    });
  } catch (err: any) {
    logger.warn('[FriendsRouter] Error declining challenge:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/friends/challenges/:id/submit
 * Submit verified vision result telemetry for a friend challenge
 */
friendsRouter.post('/challenges/:id/submit', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const payload = req.body;

    const challenge = await FriendChallengeService.submitResult(req.params.id, userId, payload);

    res.status(200).json({
      success: true,
      message: 'Telemetry verified and recorded authoritatively',
      data: { challenge },
    });
  } catch (err: any) {
    logger.warn('[FriendsRouter] Error submitting friend challenge telemetry:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});
