/**
 * SportX Coach Insight Repository
 * Firestore Data Access for coachInsights/{insightId}
 * Persists AI-generated personalized coaching insights and session analysis.
 */
import { db, hasFirebaseCredentials } from '../config/firebase';
import { demoCoachInsights } from '../config/demoStore';
import { CoachInsightDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'coachInsights';

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore coachInsight timeout')), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export class CoachInsightRepository {
  /**
   * Save a newly generated AI Coach Insight
   */
  static async create(insight: CoachInsightDoc): Promise<CoachInsightDoc> {
    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(COLLECTION).doc(insight.insightId).set(insight),
          2500
        );
        logger.info(`[CoachInsight] Saved insight ${insight.insightId} for user ${insight.userId}`);
        return insight;
      } catch (err) {
        logger.warn('[CoachInsight] Firestore unavailable, saving to demoStore fallback:', err);
      }
    }

    // Demo store fallback
    demoCoachInsights.unshift(insight);
    return insight;
  }

  /**
   * Find insight by source session ID (prevents re-generating duplicates for same session)
   */
  static async getBySessionId(sessionId: string): Promise<CoachInsightDoc | null> {
    if (!sessionId) return null;

    if (hasFirebaseCredentials) {
      try {
        const snap = await withTimeout(
          db.collection(COLLECTION)
            .where('sourceSessionId', '==', sessionId)
            .limit(1)
            .get(),
          2000
        );
        if (!snap.empty) {
          return snap.docs[0].data() as CoachInsightDoc;
        }
      } catch (err) {
        logger.warn('[CoachInsight] Firestore query by sessionId failed, checking demoStore:', err);
      }
    }

    const demoMatch = demoCoachInsights.find(i => i.sourceSessionId === sessionId);
    return demoMatch || null;
  }

  /**
   * Retrieve recent insights for a user
   */
  static async getUserInsights(userId: string, limit = 10): Promise<CoachInsightDoc[]> {
    if (hasFirebaseCredentials) {
      try {
        const snap = await withTimeout(
          db.collection(COLLECTION)
            .where('userId', '==', userId)
            .limit(limit)
            .get(),
          2000
        );
        if (!snap.empty) {
          const list = snap.docs.map(d => d.data() as CoachInsightDoc);
          return list.sort((a, b) => {
            const timeA = new Date(a.createdAt as string).getTime() || 0;
            const timeB = new Date(b.createdAt as string).getTime() || 0;
            return timeB - timeA;
          });
        }
      } catch (err) {
        logger.warn('[CoachInsight] Firestore query failed, checking demoStore:', err);
      }
    }

    return demoCoachInsights
      .filter(i => i.userId === userId)
      .slice(0, limit);
  }
}
