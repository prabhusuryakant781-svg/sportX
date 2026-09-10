/**
 * SportX Activity Logs Repository
 * Firestore Data Access for activityLogs/{logId}
 * Designed for AI / Computer-Vision form analysis telemetry
 */
import { db } from '../config/firebase';
import { ActivityLogDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'activityLogs';

export class ActivityRepository {
  /**
   * Log an exercise activity
   */
  static async create(log: ActivityLogDoc): Promise<ActivityLogDoc> {
    await db.collection(COLLECTION).doc(log.logId).set(log);
    return log;
  }

  /**
   * Batch insert multiple activity logs (e.g. at end of workout)
   */
  static async createBatch(logs: ActivityLogDoc[]): Promise<void> {
    if (!logs || logs.length === 0) return;
    const batch = db.batch();
    for (const log of logs) {
      const ref = db.collection(COLLECTION).doc(log.logId);
      batch.set(ref, log);
    }
    await batch.commit();
  }

  /**
   * Query activity logs for a user with optional time period filter
   */
  static async getByUser(
    userId: string,
    period: 'today' | '7d' | '30d' | 'all' = '7d'
  ): Promise<ActivityLogDoc[]> {
    try {
      let query: FirebaseFirestore.Query = db
        .collection(COLLECTION)
        .where('userId', '==', userId);

      const now = Date.now();
      const periods: Record<string, number> = {
        today: 86400000,
        '7d': 7 * 86400000,
        '30d': 30 * 86400000,
      };

      const snapshot = await query.get();
      let logs = snapshot.docs.map((d) => d.data() as ActivityLogDoc);

      const cutoff = periods[period];
      if (cutoff) {
        logs = logs.filter((log) => {
          const time = new Date(log.timestamp as string).getTime();
          return time >= now - cutoff;
        });
      }

      // Sort newest first
      return logs.sort((a, b) => {
        const timeA = new Date(a.timestamp as string).getTime() || 0;
        const timeB = new Date(b.timestamp as string).getTime() || 0;
        return timeB - timeA;
      });
    } catch (err) {
      logger.error(`Error querying activity logs for user ${userId}:`, err);
      return [];
    }
  }

  /**
   * Query all logs for a specific session
   */
  static async getBySession(sessionId: string): Promise<ActivityLogDoc[]> {
    try {
      const snapshot = await db
        .collection(COLLECTION)
        .where('sessionId', '==', sessionId)
        .get();
      return snapshot.docs.map((d) => d.data() as ActivityLogDoc);
    } catch (err) {
      logger.error(`Error querying activity logs for session ${sessionId}:`, err);
      return [];
    }
  }
}
