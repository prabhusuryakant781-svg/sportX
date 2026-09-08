import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/firebase';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
}

/**
 * Authentication middleware for Cloud Functions and Express endpoints.
 * Verifies Firebase ID Token from Authorization header.
 * Provides fallback mock user in local development mode.
 */
export const verifyAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // In local development, allow fallback demo user if no token provided
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        uid: 'demo_student_01',
        email: 'student@campus.edu',
        name: 'Aarav Sharma'
      };
      return next();
    }
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid Firebase token' });
  }
};

/**
 * Triggered automatically when a new user signs up in Firebase Auth
 */
export const handleUserSignup = async (userRecord: { uid: string; email?: string; displayName?: string }) => {
  const userRef = db.collection('users').doc(userRecord.uid);
  const existing = await userRef.get();

  if (!existing.exists) {
    await userRef.set({
      name: userRecord.displayName || 'Student Athlete',
      email: userRecord.email || '',
      profileImage: '',
      age: 20,
      height: 172,
      weight: 65,
      fitnessLevel: 'beginner',
      fitnessGoal: 'fitness',
      availableTimeMinutes: 20,
      selectedSports: ['badminton'],
      totalXp: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      createdAt: new Date().toISOString()
    });
  }
};
