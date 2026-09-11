import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { config } from '../config/environment';
import { sendError } from './errorHandler';

/**
 * Firebase App Check Verification Middleware
 * In production: validates the X-Firebase-AppCheck header with reCAPTCHA Enterprise / Play Integrity.
 * In development: allows bypass when APP_CHECK_ENFORCED is false.
 */
export async function verifyAppCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
  // If App Check enforcement is disabled (default in dev), pass through
  if (!config.appCheckEnforced) {
    return next();
  }

  const appCheckToken = req.header('X-Firebase-AppCheck');

  if (!appCheckToken) {
    sendError(res, 'FAILED_PRECONDITION', 'Firebase App Check token missing in request headers (X-Firebase-AppCheck)', 401);
    return;
  }

  try {
    await admin.appCheck().verifyToken(appCheckToken);
    next();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid App Check token';
    sendError(res, 'UNAUTHENTICATED', `App Check verification failed: ${message}`, 401);
  }
}
