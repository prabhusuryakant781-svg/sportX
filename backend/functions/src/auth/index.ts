/**
 * SportX Auth Middleware (Demo Mode)
 * Reads Bearer token from Authorization header.
 * Falls back to the built-in demo user when no token is provided.
 */
import { Request, Response, NextFunction } from 'express';
import { tokens, users } from '../config/demoStore';

export interface AuthenticatedRequest extends Request {
  user?: { uid: string; email?: string; name?: string };
}

export const verifyAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Default demo user — no token required in demo mode
    req.user = { uid: 'demo_student_01', email: 'aarav@campus.edu', name: 'Aarav Sharma' };
    return next();
  }

  const token = authHeader.split('Bearer ')[1];

  // Special demo bypass
  if (token === 'demo' || token === 'demo123') {
    req.user = { uid: 'demo_student_01', email: 'aarav@campus.edu', name: 'Aarav Sharma' };
    return next();
  }

  // Look up real token from demo store
  const userId = tokens.get(token);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  const user = users.get(userId);
  req.user = { uid: userId, email: user?.email, name: user?.name };
  next();
};
