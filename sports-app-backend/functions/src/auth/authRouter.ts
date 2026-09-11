import { Router, Request, Response } from 'express';
import { auth, db } from '../config/firebase';
import { AuthService } from './authService';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { validateFitnessProfile } from '../middleware/validation';

export const authRouter = Router();

/**
 * POST /api/v1/auth/signup
 * Registers a new user via Firebase Auth and initializes Firestore profile
 */
authRouter.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, fitnessLevel, goals, selectedSports, collegeName, department } = req.body;

    if (!email || !password || !name) {
      sendError(res, 'INVALID_ARGUMENT', 'name, email, and password are required fields', 400);
      return;
    }

    if (typeof password !== 'string' || password.length < 6) {
      sendError(res, 'INVALID_ARGUMENT', 'Password must be at least 6 characters long', 400);
      return;
    }

    if (fitnessLevel || goals || selectedSports) {
      const validation = validateFitnessProfile({ fitnessLevel, goals, selectedSports });
      if (!validation.isValid) {
        sendError(res, 'INVALID_ARGUMENT', validation.error || 'Invalid fitness profile data', 400);
        return;
      }
    }

    // 1. Create Firebase Auth user
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
      });
    } catch (authError: unknown) {
      const fbErr = authError as { code?: string; message?: string };
      if (fbErr.code === 'auth/email-already-exists') {
        sendError(res, 'ALREADY_EXISTS', 'An account with this email address already exists', 409);
        return;
      }
      sendError(res, 'AUTH_ERROR', fbErr.message || 'Failed to create user account', 400);
      return;
    }

    // 2. Initialize Firestore users/{userId} profile with default XP = 0, streak = 0
    const profile = await AuthService.initializeUserProfile(userRecord.uid, {
      name,
      email,
      fitnessLevel,
      goals,
      selectedSports,
      collegeName,
      department,
    });

    // 3. Issue Firebase Custom Token for immediate client authentication
    const customToken = await AuthService.createSessionToken(userRecord.uid);

    sendSuccess(
      res,
      {
        token: customToken,
        user: profile,
      },
      'Account created successfully',
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Signup failed';
    sendError(res, 'INTERNAL', message, 500);
  }
});

/**
 * POST /api/v1/auth/login
 * Handles user login with Firebase ID token or initializes profile if needed
 */
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, email } = req.body;

    if (!idToken && !email) {
      sendError(res, 'INVALID_ARGUMENT', 'Firebase idToken or email is required', 400);
      return;
    }

    let uid: string;
    let userEmail: string;
    let displayName: string;

    if (idToken) {
      const decoded = await auth.verifyIdToken(idToken);
      uid = decoded.uid;
      userEmail = decoded.email || '';
      displayName = decoded.name || 'Student Athlete';
    } else {
      // Lookup by email
      const userRecord = await auth.getUserByEmail(email);
      uid = userRecord.uid;
      userEmail = userRecord.email || '';
      displayName = userRecord.displayName || 'Student Athlete';
    }

    let profileDoc = await db.collection('users').doc(uid).get();
    let profileData;

    if (!profileDoc.exists) {
      profileData = await AuthService.initializeUserProfile(uid, {
        name: displayName,
        email: userEmail,
      });
    } else {
      profileData = profileDoc.data();
    }

    const customToken = await AuthService.createSessionToken(uid);

    sendSuccess(res, {
      token: customToken,
      user: profileData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    sendError(res, 'UNAUTHENTICATED', message, 401);
  }
});

/**
 * POST /api/v1/auth/google
 * Google Sign-In verification and profile initialization
 */
authRouter.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      sendError(res, 'INVALID_ARGUMENT', 'Google idToken is required', 400);
      return;
    }

    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || '';
    const name = decoded.name || 'Student Athlete';

    const profile = await AuthService.initializeUserProfile(uid, {
      name,
      email,
    });

    const customToken = await AuthService.createSessionToken(uid);

    sendSuccess(res, {
      token: customToken,
      user: profile,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Google authentication failed';
    sendError(res, 'UNAUTHENTICATED', message, 401);
  }
});

/**
 * POST /api/v1/auth/reset-password
 * Triggers password reset email
 */
authRouter.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      sendError(res, 'INVALID_ARGUMENT', 'Valid email address is required', 400);
      return;
    }

    const resetLink = await AuthService.generatePasswordResetLink(email);

    sendSuccess(res, {
      message: 'Password reset link generated successfully',
      resetLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send password reset email';
    sendError(res, 'INTERNAL', message, 400);
  }
});

/**
 * POST /api/v1/auth/logout
 * Signs out authenticated user and revokes refresh tokens
 */
authRouter.post('/logout', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    await AuthService.revokeUserSessions(userId);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    sendError(res, 'INTERNAL', message, 500);
  }
});
