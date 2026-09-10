/**
 * Firebase App Check Verification Middleware
 * Validates X-Firebase-AppCheck token from client requests (reCAPTCHA Enterprise, Play Integrity, App Attest)
 */
import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

export interface AppCheckedRequest extends Request {
  appCheckToken?: admin.appCheck.VerifyAppCheckTokenResponse;
}

/**
 * Middleware that verifies the Firebase App Check token if present.
 * In production, if APP_CHECK_ENFORCED is set to 'true', requests without a valid token will be rejected.
 */
export async function verifyAppCheck(
  req: AppCheckedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const appCheckToken = req.header('X-Firebase-AppCheck');
  const isEnforced = process.env.APP_CHECK_ENFORCED === 'true' && process.env.NODE_ENV === 'production';

  if (!appCheckToken) {
    if (isEnforced) {
      logger.warn(`[App Check] Missing token for ${req.method} ${req.path}`);
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing Firebase App Check token.',
      });
      return;
    }
    return next();
  }

  try {
    const verifiedToken = await admin.appCheck().verifyToken(appCheckToken);
    req.appCheckToken = verifiedToken;
    return next();
  } catch (err: any) {
    logger.warn(`[App Check] Verification failed: ${err.message}`, { path: req.path });
    if (isEnforced) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid Firebase App Check token.',
      });
      return;
    }
    return next();
  }
}
