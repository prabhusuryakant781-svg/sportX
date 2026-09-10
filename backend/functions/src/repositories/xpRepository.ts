/**
 * SportX XP Transaction Repository
 * Firestore Data Access for xpTransactions/{txId}
 * Ensures server-side auditability, replay prevention, and idempotency
 */
import { db } from '../config/firebase';
import { XPTransactionDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'xpTransactions';

export class XPRepository {
  /**
   * Record a new XP transaction with idempotency check
   * Returns true if newly created, false if already existed (duplicate suppressed)
   */
  static async recordTransaction(tx: XPTransactionDoc): Promise<boolean> {
    const docRef = db.collection(COLLECTION).doc(tx.txId);
    const existing = await docRef.get();
    if (existing.exists) {
      logger.warn(`[XPRepository] Idempotent hit: XP transaction ${tx.txId} already recorded. Skipping.`);
      return false;
    }

    await docRef.set(tx);
    return true;
  }

  /**
   * Get transaction by ID
   */
  static async getById(txId: string): Promise<XPTransactionDoc | null> {
    const doc = await db.collection(COLLECTION).doc(txId).get();
    if (!doc.exists) return null;
    return doc.data() as XPTransactionDoc;
  }

  /**
   * List recent XP history for a user
   */
  static async getUserHistory(userId: string, limit = 50): Promise<XPTransactionDoc[]> {
    try {
      const snapshot = await db
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .get();

      const list = snapshot.docs.map((d) => d.data() as XPTransactionDoc);
      return list.sort((a, b) => {
        const timeA = new Date(a.createdAt as string).getTime() || 0;
        const timeB = new Date(b.createdAt as string).getTime() || 0;
        return timeB - timeA;
      }).slice(0, limit);
    } catch (err) {
      logger.error(`Error fetching XP history for user ${userId}:`, err);
      return [];
    }
  }
}
