/**
 * SportX Session Repository
 * Firestore Data Access for workoutSessions/{sessionId}
 * Supports real Firestore operations with in-memory fallback for local offline testing.
 */
import { db, hasFirebaseCredentials } from '../config/firebase';
import { sessions as demoSessions } from '../config/demoStore';
import { WorkoutSessionDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'workoutSessions';

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore session operation timeout')), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// In-memory cache to support session testing without network/emulator dependency
const localSessionsCache: Map<string, WorkoutSessionDoc> = new Map();

export class SessionRepository {
  /**
   * Create new session log (e.g. status: in-progress or completed)
   */
  static async create(session: WorkoutSessionDoc): Promise<WorkoutSessionDoc> {
    localSessionsCache.set(session.sessionId, session);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(COLLECTION).doc(session.sessionId).set(session, { merge: true }),
          2500
        );
      } catch (err) {
        logger.warn('[Session] Firestore create failed, stored in local cache:', err);
      }
    }

    return session;
  }

  /**
   * Get session by ID
   */
  static async getById(sessionId: string): Promise<WorkoutSessionDoc | null> {
    if (!sessionId) return null;

    if (hasFirebaseCredentials) {
      try {
        const doc = await withTimeout(
          db.collection(COLLECTION).doc(sessionId).get(),
          2000
        );
        if (doc.exists) {
          return doc.data() as WorkoutSessionDoc;
        }
      } catch (err) {
        logger.warn(`[Session] Firestore getById(${sessionId}) failed, checking local cache:`, err);
      }
    }

    if (localSessionsCache.has(sessionId)) {
      return localSessionsCache.get(sessionId)!;
    }

    return null;
  }

  /**
   * Update session status or metrics
   */
  static async update(sessionId: string, updates: Partial<WorkoutSessionDoc>): Promise<void> {
    const existing = await this.getById(sessionId);
    if (existing) {
      const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      localSessionsCache.set(sessionId, merged);
    }

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(COLLECTION).doc(sessionId).update(updates),
          2000
        );
      } catch (err) {
        logger.warn(`[Session] Firestore update(${sessionId}) failed:`, err);
      }
    }
  }

  /**
   * Query workout history for a user
   */
  static async getUserSessions(
    userId: string,
    options?: { limit?: number; status?: string }
  ): Promise<WorkoutSessionDoc[]> {
    const maxLimit = options?.limit || 50;

    if (hasFirebaseCredentials) {
      try {
        let query: FirebaseFirestore.Query = db
          .collection(COLLECTION)
          .where('userId', '==', userId);

        if (options?.status) {
          query = query.where('status', '==', options.status);
        }

        const snapshot = await withTimeout(query.limit(maxLimit).get(), 2500);
        if (!snapshot.empty) {
          const sessions = snapshot.docs.map((d) => d.data() as WorkoutSessionDoc);
          return sessions.sort((a, b) => {
            const timeA = new Date(a.createdAt as string).getTime() || 0;
            const timeB = new Date(b.createdAt as string).getTime() || 0;
            return timeB - timeA;
          });
        }
      } catch (err) {
        logger.warn(`[Session] Firestore query user sessions failed for ${userId}:`, err);
      }
    }

    // Fallback: search local cache and demo store
    const results: WorkoutSessionDoc[] = [];
    for (const session of localSessionsCache.values()) {
      if (session.userId === userId) {
        if (!options?.status || session.status === options.status) {
          results.push(session);
        }
      }
    }

    return results
      .sort((a, b) => {
        const timeA = new Date(a.createdAt as string).getTime() || 0;
        const timeB = new Date(b.createdAt as string).getTime() || 0;
        return timeB - timeA;
      })
      .slice(0, maxLimit);
  }

  /**
   * Delete all workout sessions belonging to a user (used during account deletion)
   */
  static async deleteAllByUser(userId: string): Promise<number> {
    let count = 0;
    for (const [id, session] of Array.from(localSessionsCache.entries())) {
      if (session.userId === userId) {
        localSessionsCache.delete(id);
        count++;
      }
    }

    if (hasFirebaseCredentials) {
      try {
        const snap = await withTimeout(
          db.collection(COLLECTION).where('userId', '==', userId).get(),
          2500
        );
        if (!snap.empty) {
          const batch = db.batch();
          snap.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          count = Math.max(count, snap.size);
        }
      } catch (err) {
        logger.warn(`[SessionRepository] Firestore deleteAllByUser failed for ${userId}:`, err);
      }
    }

    return count;
  }
}
