import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import { sendError } from './errorHandler';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  admin?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Authentication Middleware
 * Validates Firebase ID Token from Authorization header (Bearer <token>)
 */
export async function verifyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'UNAUTHENTICATED', 'Missing or invalid Authorization header. Expected Bearer token.', 401);
    return;
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // Support emulator / testing bypass token when running outside production
  if (process.env.NODE_ENV !== 'production' && token.startsWith('mock-token-')) {
    const mockUid = token.replace('mock-token-', '');
    req.user = {
      uid: mockUid,
      email: `${mockUid}@sportx.test`,
      admin: mockUid.includes('admin'),
    };
    return next();
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      admin: Boolean(decodedToken.admin || decodedToken.role === 'admin'),
    };
    next();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid or expired token';
    sendError(res, 'UNAUTHENTICATED', `Token verification failed: ${errorMessage}`, 401);
  }
}

/**
 * Admin authorization guard
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.admin) {
    sendError(res, 'PERMISSION_DENIED', 'Administrator privileges required for this operation.', 403);
    return;
  }
  next();
}
