/**
 * SportX Competitive Repository
 * Isolated Data Access Layer for:
 * - competitiveChallenges/{challengeId}
 * - competitiveMatchmakingQueue/{ticketId}
 * - competitiveMatches/{matchId}
 * - competitiveRanks/{rankDocId}
 */

import { db, hasFirebaseCredentials } from '../config/firebase';
import {
  CompetitiveChallengeDoc,
  QueueTicketDoc,
  CompetitiveMatchDoc,
  CompetitiveRankDoc,
  CompetitiveRankTier,
  getRankTierFromRP
} from '../types/competitive';
import * as logger from 'firebase-functions/logger';

const CHALLENGES_COLLECTION = 'competitiveChallenges';
const QUEUE_COLLECTION = 'competitiveMatchmakingQueue';
const MATCHES_COLLECTION = 'competitiveMatches';
const RANKS_COLLECTION = 'competitiveRanks';

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore competitive operation timeout')), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// In-memory fallback caches for testing and offline development
const localChallengesCache: Map<string, CompetitiveChallengeDoc> = new Map();
const localQueueCache: Map<string, QueueTicketDoc> = new Map();
const localMatchesCache: Map<string, CompetitiveMatchDoc> = new Map();
const localRanksCache: Map<string, CompetitiveRankDoc> = new Map();

export class CompetitiveRepository {
  // ── CHALLENGES ─────────────────────────────────────────────────────────────

  static async seedChallenge(challenge: CompetitiveChallengeDoc): Promise<CompetitiveChallengeDoc> {
    localChallengesCache.set(challenge.challengeId, challenge);
    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(CHALLENGES_COLLECTION).doc(challenge.challengeId).set(challenge, { merge: true }),
          3000
        );
      } catch (err) {
        logger.warn(`[CompetitiveRepo] Seed challenge ${challenge.challengeId} failed to Firestore, cached locally:`, err);
      }
    }
    return challenge;
  }

  static async getAllChallenges(): Promise<CompetitiveChallengeDoc[]> {
    if (hasFirebaseCredentials) {
      try {
        const snapshot = await withTimeout(db.collection(CHALLENGES_COLLECTION).get(), 3000);
        if (!snapshot.empty) {
          const list: CompetitiveChallengeDoc[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as CompetitiveChallengeDoc;
            list.push(data);
            localChallengesCache.set(data.challengeId, data);
          });
          return list;
        }
      } catch (err) {
        logger.warn('[CompetitiveRepo] getAllChallenges Firestore read failed, using local cache:', err);
      }
    }
    return Array.from(localChallengesCache.values());
  }

  static async getChallengeById(challengeId: string): Promise<CompetitiveChallengeDoc | null> {
    if (!challengeId) return null;
    if (localChallengesCache.has(challengeId)) {
      return localChallengesCache.get(challengeId)!;
    }
    if (hasFirebaseCredentials) {
      try {
        const doc = await withTimeout(db.collection(CHALLENGES_COLLECTION).doc(challengeId).get(), 2500);
        if (doc.exists) {
          const data = doc.data() as CompetitiveChallengeDoc;
          localChallengesCache.set(challengeId, data);
          return data;
        }
      } catch (err) {
        logger.warn(`[CompetitiveRepo] getChallengeById ${challengeId} Firestore read failed:`, err);
      }
    }
    return null;
  }

  // ── USER RANKS ─────────────────────────────────────────────────────────────

  static getRankDocId(userId: string, sportId = 'global'): string {
    return `${userId}_${sportId}`;
  }

  static async getUserRank(userId: string, sportId = 'global'): Promise<CompetitiveRankDoc> {
    const docId = this.getRankDocId(userId, sportId);
    if (localRanksCache.has(docId)) {
      return localRanksCache.get(docId)!;
    }

    if (hasFirebaseCredentials) {
      try {
        const doc = await withTimeout(db.collection(RANKS_COLLECTION).doc(docId).get(), 2500);
        if (doc.exists) {
          const data = doc.data() as CompetitiveRankDoc;
          localRanksCache.set(docId, data);
          return data;
        }
      } catch (err) {
        logger.warn(`[CompetitiveRepo] getUserRank ${docId} Firestore read failed:`, err);
      }
    }

    // Default rank if none exists
    const defaultRank: CompetitiveRankDoc = {
      userId,
      sportId,
      rankTier: 'Bronze',
      rankPoints: 100,
      wins: 0,
      losses: 0,
      draws: 0,
      totalMatches: 0,
      highestRankTier: 'Bronze',
      highestRankPoints: 100,
      updatedAt: new Date().toISOString(),
    };
    localRanksCache.set(docId, defaultRank);
    return defaultRank;
  }

  static async saveUserRank(rankDoc: CompetitiveRankDoc): Promise<CompetitiveRankDoc> {
    const docId = this.getRankDocId(rankDoc.userId, rankDoc.sportId);
    localRanksCache.set(docId, rankDoc);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(RANKS_COLLECTION).doc(docId).set(rankDoc, { merge: true }),
          3000
        );
      } catch (err) {
        logger.warn(`[CompetitiveRepo] saveUserRank ${docId} failed to Firestore:`, err);
      }
    }
    return rankDoc;
  }

  // ── MATCHMAKING QUEUE ──────────────────────────────────────────────────────

  static async addQueueTicket(ticket: QueueTicketDoc): Promise<QueueTicketDoc> {
    localQueueCache.set(ticket.ticketId, ticket);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(QUEUE_COLLECTION).doc(ticket.ticketId).set(ticket, { merge: true }),
          3000
        );
      } catch (err) {
        logger.warn(`[CompetitiveRepo] addQueueTicket ${ticket.ticketId} Firestore write failed:`, err);
      }
    }
    return ticket;
  }

  static async getQueueTicket(ticketId: string): Promise<QueueTicketDoc | null> {
    if (!ticketId) return null;
    if (localQueueCache.has(ticketId)) {
      return localQueueCache.get(ticketId)!;
    }

    if (hasFirebaseCredentials) {
      try {
        const doc = await withTimeout(db.collection(QUEUE_COLLECTION).doc(ticketId).get(), 2500);
        if (doc.exists) {
          const data = doc.data() as QueueTicketDoc;
          localQueueCache.set(ticketId, data);
          return data;
        }
      } catch (err) {
        logger.warn(`[CompetitiveRepo] getQueueTicket ${ticketId} Firestore read failed:`, err);
      }
    }
    return null;
  }

  static async getActiveQueueTickets(): Promise<QueueTicketDoc[]> {
    if (hasFirebaseCredentials) {
      try {
        const snapshot = await withTimeout(
          db.collection(QUEUE_COLLECTION).where('status', '==', 'QUEUED').get(),
          3000
        );
        if (!snapshot.empty) {
          const tickets: QueueTicketDoc[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as QueueTicketDoc;
            tickets.push(data);
            localQueueCache.set(data.ticketId, data);
          });
          return tickets;
        }
      } catch (err) {
        logger.warn('[CompetitiveRepo] getActiveQueueTickets Firestore read failed, using local cache:', err);
      }
    }

    return Array.from(localQueueCache.values()).filter((t) => t.status === 'QUEUED');
  }

  static async updateQueueTicket(ticketId: string, updates: Partial<QueueTicketDoc>): Promise<QueueTicketDoc | null> {
    const existing = await this.getQueueTicket(ticketId);
    if (!existing) return null;

    const updated: QueueTicketDoc = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    localQueueCache.set(ticketId, updated);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(QUEUE_COLLECTION).doc(ticketId).set(updated, { merge: true }),
          2500
        );
      } catch (err) {
        logger.warn(`[CompetitiveRepo] updateQueueTicket ${ticketId} Firestore write failed:`, err);
      }
    }
    return updated;
  }

  static async cancelQueueTicket(ticketId: string, userId: string): Promise<boolean> {
    const ticket = await this.getQueueTicket(ticketId);
    if (!ticket) return false;
    if (ticket.userId !== userId) {
      throw new Error('Unauthorized to cancel this queue ticket');
    }
    await this.updateQueueTicket(ticketId, { status: 'CANCELLED' });
    return true;
  }

  // ── MATCHES ────────────────────────────────────────────────────────────────

  static async createMatch(match: CompetitiveMatchDoc): Promise<CompetitiveMatchDoc> {
    localMatchesCache.set(match.matchId, match);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(MATCHES_COLLECTION).doc(match.matchId).set(match, { merge: true }),
          3000
        );
      } catch (err) {
        logger.warn(`[CompetitiveRepo] createMatch ${match.matchId} Firestore write failed:`, err);
      }
    }
    return match;
  }

  static async getMatchById(matchId: string): Promise<CompetitiveMatchDoc | null> {
    if (!matchId) return null;
    if (localMatchesCache.has(matchId)) {
      return localMatchesCache.get(matchId)!;
    }

    if (hasFirebaseCredentials) {
      try {
        const doc = await withTimeout(db.collection(MATCHES_COLLECTION).doc(matchId).get(), 2500);
        if (doc.exists) {
          const data = doc.data() as CompetitiveMatchDoc;
          localMatchesCache.set(matchId, data);
          return data;
        }
      } catch (err) {
        logger.warn(`[CompetitiveRepo] getMatchById ${matchId} Firestore read failed:`, err);
      }
    }
    return null;
  }

  static async updateMatch(matchId: string, updates: Partial<CompetitiveMatchDoc>): Promise<CompetitiveMatchDoc | null> {
    const existing = await this.getMatchById(matchId);
    if (!existing) return null;

    const updated: CompetitiveMatchDoc = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    localMatchesCache.set(matchId, updated);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(MATCHES_COLLECTION).doc(matchId).set(updated, { merge: true }),
          2500
        );
      } catch (err) {
        logger.warn(`[CompetitiveRepo] updateMatch ${matchId} Firestore write failed:`, err);
      }
    }
    return updated;
  }

  /**
   * Clears local in-memory state for isolated test execution
   */
  static clearLocalCache() {
    localChallengesCache.clear();
    localQueueCache.clear();
    localMatchesCache.clear();
    localRanksCache.clear();
  }
}
