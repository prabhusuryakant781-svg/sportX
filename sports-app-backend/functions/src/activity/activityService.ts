import { db } from '../config/firebase';
import { ActivityLogDoc } from '../types';
import { validateActivityLog } from '../middleware/validation';

export class ActivityService {
  /**
   * Logs a structured exercise activity telemetry event.
   * Compatible with Person 2 MediaPipe/OpenCV payload.
   */
  static async logActivity(params: {
    userId: string;
    sessionId: string;
    exerciseId: string;
    reps: number;
    duration: number; // seconds
    formScore: number; // 0 - 100
    errors?: string[];
    calories?: number;
  }): Promise<ActivityLogDoc> {
    const validation = validateActivityLog(params as Record<string, unknown>);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid activity log data');
    }

    const {
      userId,
      sessionId,
      exerciseId,
      reps,
      duration,
      formScore,
      errors = [],
      calories = Math.round(reps * 0.4),
    } = params;

    const activityId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const activityLog: ActivityLogDoc = {
      id: activityId,
      userId,
      sessionId,
      exerciseId,
      reps,
      duration,
      formScore,
      errors,
      calories,
      timestamp,
    };

    await db.collection('activityLogs').doc(activityId).set(activityLog);
    return activityLog;
  }

  /**
   * Retrieves workout activity history filterable by time window:
   * 'today', '7d', '30d', or 'all' with pagination.
   */
  static async getHistory(params: {
    userId: string;
    period: 'today' | '7d' | '30d' | 'all';
    limit?: number;
    lastTimestamp?: string;
  }): Promise<{ activities: ActivityLogDoc[]; totalCount: number }> {
    const { userId, period = '7d', limit = 50, lastTimestamp } = params;

    let query: FirebaseFirestore.Query = db
      .collection('activityLogs')
      .where('userId', '==', userId);

    const now = new Date();
    let startDate: Date | null = null;

    if (period === 'today') {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    } else if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (startDate) {
      query = query.where('timestamp', '>=', startDate.toISOString());
    }

    query = query.orderBy('timestamp', 'desc').limit(limit);

    if (lastTimestamp) {
      query = query.startAfter(lastTimestamp);
    }

    const snap = await query.get();
    const activities = snap.docs.map((d) => d.data() as ActivityLogDoc);

    return {
      activities,
      totalCount: activities.length,
    };
  }
}
