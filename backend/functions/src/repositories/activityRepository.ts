/**
 * SportX Activity Logs Repository
 * Firestore Data Access for activityLogs/{logId}
 * Designed for AI / Computer-Vision form analysis telemetry
 */
import { db, hasFirebaseCredentials } from '../config/firebase';
import { ActivityLogDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'activityLogs';

// In-memory cache for offline/test reliability
const localActivityLogsCache: Map<string, ActivityLogDoc> = new Map();

function parseLogTime(log: ActivityLogDoc): number {
  const raw = log.timestamp;
  if (!raw) return 0;
  if (typeof (raw as any).toDate === 'function') {
    return (raw as any).toDate().getTime();
  }
  if (raw instanceof Date) {
    return raw.getTime();
  }
  const t = new Date(raw as any).getTime();
  return isNaN(t) ? 0 : t;
}

export class ActivityRepository {
  /**
   * Log an exercise activity
   */
  static async create(log: ActivityLogDoc): Promise<ActivityLogDoc> {
    localActivityLogsCache.set(log.logId, log);

    if (hasFirebaseCredentials) {
      try {
        await db.collection(COLLECTION).doc(log.logId).set(log);
      } catch (err) {
        logger.warn(`[ActivityRepository] Firestore create failed for ${log.logId}:`, err);
      }
    }

    return log;
  }

  /**
   * Batch insert multiple activity logs (e.g. at end of workout)
   */
  static async createBatch(logs: ActivityLogDoc[]): Promise<void> {
    if (!logs || logs.length === 0) return;

    for (const log of logs) {
      localActivityLogsCache.set(log.logId, log);
    }

    if (hasFirebaseCredentials) {
      try {
        const batch = db.batch();
        for (const log of logs) {
          const ref = db.collection(COLLECTION).doc(log.logId);
          batch.set(ref, log);
        }
        await batch.commit();
      } catch (err) {
        logger.warn('[ActivityRepository] Firestore createBatch failed:', err);
      }
    }
  }

  /**
   * Query activity logs for a user with time period filter
   */
  static async getByUser(
    userId: string,
    period: 'today' | '7d' | '30d' | 'all' = '7d'
  ): Promise<ActivityLogDoc[]> {
    const now = new Date();
    let cutoff: number | null = null;

    if (period === 'today') {
      cutoff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
    } else if (period === '7d') {
      cutoff = now.getTime() - 7 * 86400000;
    } else if (period === '30d') {
      cutoff = now.getTime() - 30 * 86400000;
    }

    if (hasFirebaseCredentials) {
      try {
        const query = db
          .collection(COLLECTION)
          .where('userId', '==', userId);

        const snapshot = await query.get();
        if (!snapshot.empty) {
          let logs = snapshot.docs.map((d) => d.data() as ActivityLogDoc);

          if (cutoff !== null) {
            logs = logs.filter((l) => parseLogTime(l) >= cutoff!);
          }

          return logs.sort((a, b) => parseLogTime(b) - parseLogTime(a));
        }
      } catch (err) {
        logger.warn(`[ActivityRepository] Firestore getByUser failed for ${userId}:`, err);
      }
    }

    // Fallback: search local cache
    const results: ActivityLogDoc[] = [];
    for (const log of localActivityLogsCache.values()) {
      if (log.userId === userId) {
        if (cutoff === null || parseLogTime(log) >= cutoff) {
          results.push(log);
        }
      }
    }

    return results.sort((a, b) => parseLogTime(b) - parseLogTime(a));
  }

  /**
   * Query all logs for a specific session
   */
  static async getBySession(sessionId: string): Promise<ActivityLogDoc[]> {
    if (hasFirebaseCredentials) {
      try {
        const snapshot = await db
          .collection(COLLECTION)
          .where('sessionId', '==', sessionId)
          .get();
        if (!snapshot.empty) {
          return snapshot.docs.map((d) => d.data() as ActivityLogDoc);
        }
      } catch (err) {
        logger.warn(`[ActivityRepository] Firestore getBySession failed for ${sessionId}:`, err);
      }
    }

    const results: ActivityLogDoc[] = [];
    for (const log of localActivityLogsCache.values()) {
      if (log.sessionId === sessionId) {
        results.push(log);
      }
    }
    return results;
  }

  /**
   * Delete all activity logs belonging to a user (used during account deletion)
   */
  static async deleteAllByUser(userId: string): Promise<number> {
    let count = 0;
    for (const [id, log] of Array.from(localActivityLogsCache.entries())) {
      if (log.userId === userId) {
        localActivityLogsCache.delete(id);
        count++;
      }
    }

    if (hasFirebaseCredentials) {
      try {
        const snap = await db.collection(COLLECTION).where('userId', '==', userId).get();
        if (!snap.empty) {
          const batch = db.batch();
          snap.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          count = Math.max(count, snap.size);
        }
      } catch (err) {
        logger.warn(`[ActivityRepository] Firestore deleteAllByUser failed for ${userId}:`, err);
      }
    }

    return count;
  }
}
