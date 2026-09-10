/**
 * SportX Session Repository
 * Firestore Data Access for workoutSessions/{sessionId}
 */
import { db } from '../config/firebase';
import { WorkoutSessionDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'workoutSessions';

export class SessionRepository {
  /**
   * Create new session log (e.g. status: in-progress)
   */
  static async create(session: WorkoutSessionDoc): Promise<WorkoutSessionDoc> {
    await db.collection(COLLECTION).doc(session.sessionId).set(session);
    return session;
  }

  /**
   * Get session by ID
   */
  static async getById(sessionId: string): Promise<WorkoutSessionDoc | null> {
    const doc = await db.collection(COLLECTION).doc(sessionId).get();
    if (!doc.exists) return null;
    return doc.data() as WorkoutSessionDoc;
  }

  /**
   * Update session status or metrics
   */
  static async update(sessionId: string, updates: Partial<WorkoutSessionDoc>): Promise<void> {
    await db.collection(COLLECTION).doc(sessionId).update(updates);
  }

  /**
   * Query workout history for a user
   */
  static async getUserSessions(
    userId: string,
    options?: { limit?: number; status?: string }
  ): Promise<WorkoutSessionDoc[]> {
    try {
      let query: FirebaseFirestore.Query = db
        .collection(COLLECTION)
        .where('userId', '==', userId);

      if (options?.status) {
        query = query.where('status', '==', options.status);
      }

      const snapshot = await query.get();
      const sessions = snapshot.docs.map((d) => d.data() as WorkoutSessionDoc);

      // Sort in memory by createdAt descending
      return sessions.sort((a, b) => {
        const timeA = new Date(a.createdAt as string).getTime() || 0;
        const timeB = new Date(b.createdAt as string).getTime() || 0;
        return timeB - timeA;
      }).slice(0, options?.limit || 50);
    } catch (err) {
      logger.error(`Error querying user sessions for ${userId}:`, err);
      return [];
    }
  }
}
