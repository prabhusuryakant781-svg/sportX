import { db } from '../config/firebase';
import { XPTransactionDoc } from '../types';

export class XPService {
  /**
   * Server-authoritative calculation of session XP.
   * Formula:
   *  repXP = reps * baseRepXP * (formAccuracy / 100)
   *  durationBonus = min(durationMinutes, 60) * 5
   *  completionBonus = isCompleted ? 50 : 0
   *  formExcellenceBonus = formAccuracy >= 90 ? 25 : 0
   */
  static calculateSessionXP(params: {
    totalReps: number;
    formAccuracyAverage: number;
    durationMinutes: number;
    baseRepXP?: number;
    isCompleted?: boolean;
  }): number {
    const {
      totalReps,
      formAccuracyAverage,
      durationMinutes,
      baseRepXP = 10,
      isCompleted = true,
    } = params;

    const clampedAccuracy = Math.max(0, Math.min(100, formAccuracyAverage));
    const accuracyFactor = clampedAccuracy / 100;
    const repXP = Math.round(totalReps * baseRepXP * accuracyFactor);

    // Anti-cheat cap: duration bonus capped at 60 minutes
    const effectiveMinutes = Math.min(Math.max(0, durationMinutes), 60);
    const durationBonus = effectiveMinutes * 5;

    const completionBonus = isCompleted ? 50 : 0;
    const formExcellenceBonus = clampedAccuracy >= 90 ? 25 : 0;

    return Math.max(0, repXP + durationBonus + completionBonus + formExcellenceBonus);
  }

  /**
   * Calculates level based on total XP.
   * Formula: Level N requires (N - 1)^2 * 100 XP.
   */
  static calculateLevel(xp: number): number {
    if (xp <= 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  /**
   * Returns XP required to reach the next level.
   */
  static getXPForNextLevel(currentLevel: number): number {
    return Math.pow(currentLevel, 2) * 100;
  }

  /**
   * Records an XP transaction idempotently inside a Firestore transaction.
   * Prevents replay attacks and duplicate awards.
   */
  static async recordXPIdempotent(params: {
    userId: string;
    sessionId?: string;
    amount: number;
    reason: XPTransactionDoc['reason'];
  }): Promise<{ applied: boolean; totalXP: number; newLevel: number }> {
    const { userId, sessionId, amount, reason } = params;

    if (amount <= 0) {
      const userSnap = await db.collection('users').doc(userId).get();
      const currentXP = (userSnap.data()?.xp as number) || 0;
      return { applied: false, totalXP: currentXP, newLevel: this.calculateLevel(currentXP) };
    }

    const txId = sessionId ? `tx_${sessionId}_${reason}` : `tx_${userId}_${Date.now()}`;
    const txRef = db.collection('xpTransactions').doc(txId);
    const userRef = db.collection('users').doc(userId);

    return await db.runTransaction(async (transaction) => {
      const txDoc = await transaction.get(txRef);
      if (txDoc.exists) {
        // Already processed this exact transaction - idempotent reject duplicate
        const userDoc = await transaction.get(userRef);
        const currentXP = (userDoc.data()?.xp as number) || 0;
        return {
          applied: false,
          totalXP: currentXP,
          newLevel: this.calculateLevel(currentXP),
        };
      }

      const userDoc = await transaction.get(userRef);
      const currentXP = userDoc.exists ? (userDoc.data()?.xp as number) || 0 : 0;
      const newTotalXP = currentXP + amount;
      const newLevel = this.calculateLevel(newTotalXP);

      const txRecord: XPTransactionDoc = {
        id: txId,
        userId,
        sessionId,
        amount,
        reason,
        createdAt: new Date().toISOString(),
      };

      transaction.set(txRef, txRecord);
      transaction.set(
        userRef,
        {
          xp: newTotalXP,
          totalXp: newTotalXP,
          level: newLevel,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return {
        applied: true,
        totalXP: newTotalXP,
        newLevel,
      };
    });
  }
}
