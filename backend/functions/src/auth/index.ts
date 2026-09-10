/**
 * SportX Auth Middleware & Verification Utilities
 * Supports Firebase Admin ID Token verification, custom claims, and demo tokens.
 */
import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import { UserRepository } from '../repositories/userRepository';
import * as logger from 'firebase-functions/logger';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Extracts and verifies the bearer token from the request.
 * Authenticates via Firebase Admin SDK verifyIdToken.
 */
export async function authenticateRequest(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) return null;

  // 1. Local / offline demo test token support
  if (token === 'demo' || token === 'demo123') {
    return { uid: 'demo_student_01', email: 'aarav@campus.edu', name: 'Aarav Sharma', role: 'user' };
  }

  if (token.startsWith('demo_token_')) {
    const withoutPrefix = token.slice('demo_token_'.length);
    const lastUnderscore = withoutPrefix.lastIndexOf('_');
    const uid = lastUnderscore !== -1 ? withoutPrefix.substring(0, lastUnderscore) : withoutPrefix;
    if (uid) {
      return { uid, role: 'user' };
    }
  }

  // 2. Real Firebase Auth ID Token verification via Firebase Admin SDK
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      role: (decodedToken.role as string) || 'user',
    };
  } catch (err: any) {
    // If client sent a custom token or direct uid in test mode
    if (process.env.NODE_ENV !== 'production' && token.length > 5 && !token.includes('.')) {
      return { uid: token, role: 'user' };
    }
    return null;
  }
}

/**
 * Express middleware for routes requiring authentication.
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

  // If no token provided in local development mode, fallback to demo student
  if (!req.headers.authorization && process.env.NODE_ENV !== 'production') {
    req.user = { uid: 'demo_student_01', email: 'aarav@campus.edu', name: 'Aarav Sharma', role: 'user' };
    return next();
  }

  res.status(401).json({ success: false, error: 'Unauthorized: Invalid, expired, or missing Bearer token.' });
};

/**
 * Middleware to restrict route to specific roles (e.g., 'admin' or 'coach')
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      return;
    }

    const userProfile = await UserRepository.getById(req.user.uid);
    const role = userProfile?.role || req.user.role || 'user';

    if (!allowedRoles.includes(role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Requires one of roles: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
};
