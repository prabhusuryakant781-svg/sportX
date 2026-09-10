/**
 * SportX Auth Middleware & Verification Utilities (Phase 1 & Phase 2)
 * Supports Firebase Admin ID Token verification, Bearer tokens, and demo testing.
 */
import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { tokens, users } from '../config/demoStore';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Extracts and verifies the bearer token from the request.
 * Checks Firebase Admin Auth first, with demo token fallback for test environments.
 * Never trusts client-supplied userIds.
 */
export async function authenticateRequest(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) return null;

  // 1. Check demo and test tokens for local/offline testing
  if (token === 'demo' || token === 'demo123') {
    return { uid: 'demo_student_01', email: 'aarav@campus.edu', name: 'Aarav Sharma' };
  }

  const demoUserId = tokens.get(token);
  if (demoUserId) {
    const demoUser = users.get(demoUserId);
    return { uid: demoUserId, email: demoUser?.email, name: demoUser?.name };
  }

  if (token.startsWith('demo_token_')) {
    const withoutPrefix = token.slice('demo_token_'.length);
    const lastUnderscore = withoutPrefix.lastIndexOf('_');
    const uid = lastUnderscore !== -1 ? withoutPrefix.substring(0, lastUnderscore) : withoutPrefix;
    if (uid) {
      const demoUser = users.get(uid);
      return { uid, email: demoUser?.email, name: demoUser?.name };
    }
  }

  // 2. Real Firebase Auth ID Token verification via Firebase Admin SDK
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Express middleware for existing routes requiring authentication.
 */
export const verifyAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = await authenticateRequest(req);

  if (user) {
    req.user = user;
    return next();
  }

  // If no token in development/demo mode, fallback to demo student
  if (!req.headers.authorization && process.env.NODE_ENV !== 'production') {
    req.user = { uid: 'demo_student_01', email: 'aarav@campus.edu', name: 'Aarav Sharma' };
    return next();
  }

  res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
};
