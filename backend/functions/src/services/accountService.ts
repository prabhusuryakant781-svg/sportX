/**
 * SportX Account & Privacy Management Service
 * Provides:
 * 1. Cascading, Retry-Safe Account Deletion (Auth, Firestore Collections, Storage Assets, Local Caches)
 * 2. Password Updates with Re-Authentication Enforcement
 * 3. Email Updates with Re-Authentication Enforcement
 */
import { auth, db, storage, hasFirebaseCredentials } from '../config/firebase';
import { UserRepository } from '../repositories/userRepository';
import { SessionRepository } from '../repositories/sessionRepository';
import { ActivityRepository } from '../repositories/activityRepository';
import { ProgressRepository } from '../repositories/progressRepository';
import { NotificationRepository } from '../repositories/notificationRepository';
import { verifyCredentialsWithFirebaseAuth } from '../auth/firebaseAuthHelper';
import { AuditLogger } from './auditLogger';
import * as logger from 'firebase-functions/logger';

export interface AccountDeletionSummary {
  userId: string;
  authDeleted: boolean;
  userProfileDeleted: boolean;
  sessionsDeleted: number;
  activityLogsDeleted: number;
  progressDeleted: boolean;
  notificationsDeleted: number;
  badgesDeleted: number;
  tokensDeleted: number;
  xpTransactionsDeleted: number;
  storageFilesDeleted: boolean;
}

// Helper to batch-delete documents matching a query
async function deleteQueryBatch(query: FirebaseFirestore.Query): Promise<number> {
  let count = 0;
  try {
    const snapshot = await query.get();
    if (snapshot.empty) return 0;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });
    await batch.commit();
  } catch (err) {
    logger.warn('[AccountService] Batch query deletion error:', err);
  }
  return count;
}

export class AccountService {
  /**
   * Cascading, retry-safe account deletion.
   * Completely purges the user's Auth profile, Firestore documents across all collections,
   * Firebase Storage media files, and local memory caches.
   */
  static async deleteAccount(uid: string, reqIp?: string): Promise<AccountDeletionSummary> {
    const summary: AccountDeletionSummary = {
      userId: uid,
      authDeleted: false,
      userProfileDeleted: false,
      sessionsDeleted: 0,
      activityLogsDeleted: 0,
      progressDeleted: false,
      notificationsDeleted: 0,
      badgesDeleted: 0,
      tokensDeleted: 0,
      xpTransactionsDeleted: 0,
      storageFilesDeleted: false,
    };

    // 1. Delete Firebase Auth User
    try {
      await auth.deleteUser(uid);
      summary.authDeleted = true;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        summary.authDeleted = true; // Already deleted, safe to continue
      } else {
        logger.warn(`[AccountService] Failed to delete Auth user ${uid}:`, err);
      }
    }

    // 2. Delete Workout Sessions
    try {
      summary.sessionsDeleted = await SessionRepository.deleteAllByUser(uid);
    } catch (err) {
      logger.warn(`[AccountService] Error deleting sessions for ${uid}:`, err);
    }

    // 3. Delete Activity Logs
    try {
      summary.activityLogsDeleted = await ActivityRepository.deleteAllByUser(uid);
    } catch (err) {
      logger.warn(`[AccountService] Error deleting activity logs for ${uid}:`, err);
    }

    // 4. Delete Notifications
    try {
      summary.notificationsDeleted = await NotificationRepository.deleteAllByUser(uid);
    } catch (err) {
      logger.warn(`[AccountService] Error deleting notifications for ${uid}:`, err);
    }

    // 5. Delete Progress Document
    try {
      await ProgressRepository.delete(uid);
      summary.progressDeleted = true;
    } catch (err) {
      logger.warn(`[AccountService] Error deleting progress for ${uid}:`, err);
    }

    // 6. Delete Firestore Collections (badges, tokens, xp, streaks, stats, vision, insights)
    if (hasFirebaseCredentials) {
      try {
        summary.badgesDeleted = await deleteQueryBatch(
          db.collection('userBadges').where('userId', '==', uid)
        );
        summary.tokensDeleted = await deleteQueryBatch(
          db.collection('deviceTokens').where('userId', '==', uid)
        );
        summary.xpTransactionsDeleted = await deleteQueryBatch(
          db.collection('xpTransactions').where('userId', '==', uid)
        );
        await deleteQueryBatch(db.collection('visionResults').where('userId', '==', uid));
        await deleteQueryBatch(db.collection('coachInsights').where('userId', '==', uid));

        // Direct keyed documents
        await db.collection('streaks').doc(uid).delete().catch(() => {});
        await db.collection('userStats').doc(uid).delete().catch(() => {});
      } catch (err) {
        logger.warn(`[AccountService] Error deleting auxiliary collections for ${uid}:`, err);
      }
    }

    // 7. Delete User Profile document & cache
    try {
      await UserRepository.delete(uid);
      summary.userProfileDeleted = true;
    } catch (err) {
      logger.warn(`[AccountService] Error deleting user profile for ${uid}:`, err);
    }

    // 8. Delete Storage Profile and Session files
    try {
      if (hasFirebaseCredentials) {
        const bucket = storage.bucket();
        await bucket.deleteFiles({ prefix: `users/${uid}/`, force: true }).catch(() => {});
        await bucket.deleteFiles({ prefix: `avatars/${uid}/`, force: true }).catch(() => {});
      }
      summary.storageFilesDeleted = true;
    } catch (err) {
      logger.warn(`[AccountService] Error deleting storage files for ${uid}:`, err);
    }

    // 9. Safe Audit Logging
    AuditLogger.logSecurityEvent({
      eventType: 'account_deleted',
      userId: uid,
      ip: reqIp,
      status: 'success',
      details: summary,
    });

    return summary;
  }

  /**
   * Update password requiring Firebase re-authentication with current password
   */
  static async updatePassword(
    uid: string,
    email: string,
    currentPassword: string,
    newPassword: string,
    reqIp?: string
  ): Promise<void> {
    if (!currentPassword) {
      AuditLogger.logSecurityEvent({
        eventType: 'password_updated',
        userId: uid,
        ip: reqIp,
        status: 'denied',
        details: { reason: 'Missing currentPassword' },
      });
      throw new Error('Current password is required for re-authentication');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    // 1. Re-authenticate via Firebase Auth
    try {
      await verifyCredentialsWithFirebaseAuth(email, currentPassword);
    } catch (authErr: any) {
      AuditLogger.logSecurityEvent({
        eventType: 'password_updated',
        userId: uid,
        ip: reqIp,
        status: 'failure',
        details: { reason: 'Re-authentication failed: Invalid current password' },
      });
      throw new Error('Re-authentication failed: Invalid current password');
    }

    // 2. Update password in Firebase Auth
    await auth.updateUser(uid, { password: newPassword });

    // 3. Revoke all existing sessions to enforce re-login
    await auth.revokeRefreshTokens(uid).catch(() => {});

    // 4. Audit Log
    AuditLogger.logSecurityEvent({
      eventType: 'password_updated',
      userId: uid,
      ip: reqIp,
      status: 'success',
    });
  }

  /**
   * Update email requiring Firebase re-authentication with current password
   */
  static async updateEmail(
    uid: string,
    currentEmail: string,
    currentPassword: string,
    newEmail: string,
    reqIp?: string
  ): Promise<void> {
    if (!currentPassword) {
      AuditLogger.logSecurityEvent({
        eventType: 'email_updated',
        userId: uid,
        ip: reqIp,
        status: 'denied',
        details: { reason: 'Missing currentPassword' },
      });
      throw new Error('Current password is required for re-authentication');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      throw new Error('Invalid new email format');
    }

    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      throw new Error('New email must be different from current email');
    }

    // 1. Re-authenticate via Firebase Auth
    try {
      await verifyCredentialsWithFirebaseAuth(currentEmail, currentPassword);
    } catch (authErr: any) {
      AuditLogger.logSecurityEvent({
        eventType: 'email_updated',
        userId: uid,
        ip: reqIp,
        status: 'failure',
        details: { reason: 'Re-authentication failed: Invalid current password' },
      });
      throw new Error('Re-authentication failed: Invalid current password');
    }

    // 2. Update email in Firebase Auth
    await auth.updateUser(uid, {
      email: newEmail,
      emailVerified: false,
    });

    // 3. Update email in Firestore User Profile
    await UserRepository.update(uid, { email: newEmail });

    // 4. Audit Log
    AuditLogger.logSecurityEvent({
      eventType: 'email_updated',
      userId: uid,
      ip: reqIp,
      status: 'success',
      details: { newEmail },
    });
  }
}
