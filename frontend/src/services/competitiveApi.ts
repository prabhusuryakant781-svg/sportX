/**
 * SportX Competitive API Client
 * Isolated client methods for /api/v1/competitive/*
 */

import { request } from './api';
import {
  CompetitiveChallengeDoc,
  CompetitiveMatchDoc,
  CompetitiveRankDoc,
  QueueTicketDoc,
} from '../types/competitive';

export const competitiveApi = {
  /**
   * Get all available demo athlete-development challenges
   */
  getChallenges: async (): Promise<{ challenges: CompetitiveChallengeDoc[] }> => {
    const res = await request<{ success: boolean; data: { challenges: CompetitiveChallengeDoc[] } }>(
      'GET',
      '/competitive/challenges',
      undefined,
      false
    );
    return res.data;
  },

  /**
   * Get authenticated user's competitive rank tier and stats
   */
  getUserRank: async (sportId = 'global'): Promise<{ rank: CompetitiveRankDoc }> => {
    const res = await request<{ success: boolean; data: { rank: CompetitiveRankDoc } }>(
      'GET',
      `/competitive/rank?sportId=${encodeURIComponent(sportId)}`
    );
    return res.data;
  },

  /**
   * Join random matchmaking queue with auto challenge selection
   */
  joinMatchmaking: async (params: {
    sportPreference?: string;
    avatarUrl?: string;
  }): Promise<{ ticket: QueueTicketDoc; match?: CompetitiveMatchDoc | null }> => {
    const res = await request<{
      success: boolean;
      data: { ticket: QueueTicketDoc; match?: CompetitiveMatchDoc | null };
    }>('POST', '/competitive/matchmaking/join', params);
    return res.data;
  },

  /**
   * Poll ticket status to see if matched with an opponent
   */
  getQueueStatus: async (
    ticketId: string
  ): Promise<{ ticket: QueueTicketDoc; match?: CompetitiveMatchDoc | null }> => {
    const res = await request<{
      success: boolean;
      data: { ticket: QueueTicketDoc; match?: CompetitiveMatchDoc | null };
    }>('GET', `/competitive/matchmaking/status/${ticketId}`);
    return res.data;
  },

  /**
   * Cancel searching in the matchmaking queue
   */
  cancelQueue: async (ticketId: string): Promise<boolean> => {
    const res = await request<{ success: boolean }>('POST', '/competitive/matchmaking/cancel', {
      ticketId,
    });
    return res.success;
  },

  /**
   * Development-only simulated queue opponent generator.
   * Disabled in production.
   */
  simulateDevOpponent: async (ticketId: string): Promise<{ match: CompetitiveMatchDoc }> => {
    const res = await request<{ success: boolean; data: { match: CompetitiveMatchDoc } }>(
      'POST',
      '/competitive/dev/simulate-opponent',
      { ticketId }
    );
    return res.data;
  },

  /**
   * Get current state of match room
   */
  getMatch: async (matchId: string): Promise<{ match: CompetitiveMatchDoc }> => {
    const res = await request<{ success: boolean; data: { match: CompetitiveMatchDoc } }>(
      'GET',
      `/competitive/matches/${matchId}`
    );
    return res.data;
  },

  /**
   * Set user ready in match room
   */
  setMatchReady: async (matchId: string): Promise<{ match: CompetitiveMatchDoc }> => {
    const res = await request<{ success: boolean; data: { match: CompetitiveMatchDoc } }>(
      'POST',
      `/competitive/matches/${matchId}/ready`
    );
    return res.data;
  },

  /**
   * Stream live reps and form score to match
   */
  sendTelemetry: async (
    matchId: string,
    reps: number,
    formScore: number
  ): Promise<{ match: CompetitiveMatchDoc }> => {
    const res = await request<{ success: boolean; data: { match: CompetitiveMatchDoc } }>(
      'POST',
      `/competitive/matches/${matchId}/telemetry`,
      { reps, formScore }
    );
    return res.data;
  },

  /**
   * Authoritatively finish match and calculate placements & rewards
   */
  finishMatch: async (
    matchId: string
  ): Promise<{ match: CompetitiveMatchDoc; results: CompetitiveMatchDoc['results'] }> => {
    const res = await request<{
      success: boolean;
      data: { match: CompetitiveMatchDoc; results: CompetitiveMatchDoc['results'] };
    }>('POST', `/competitive/matches/${matchId}/finish`);
    return res.data;
  },
};
