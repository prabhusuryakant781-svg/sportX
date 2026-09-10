/**
 * Auth Router: Production Firebase Authentication Endpoints
 * Core Requirements: Signup, Login, Google Sign-In, Password Reset, Logout, Account Management
 */
import { Router, Response } from 'express';
import { auth } from '../config/firebase';
import { UserRepository } from '../repositories/userRepository';
import { verifyAuth, AuthenticatedRequest } from './index';
import * as logger from 'firebase-functions/logger';

export const authRouter = Router();

// ── POST /api/v1/auth/signup ──────────────────────────────────────────────────
authRouter.post('/signup', async (req, res) => {
  try {
    const { name, email, password, collegeName, department, fitnessLevel, selectedSports } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    // 1. Create user in Firebase Authentication
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
      });
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists') {
        return res.status(409).json({ success: false, error: 'An account with this email already exists' });
      }
      logger.error('Firebase Auth createUser error:', authError);
      return res.status(400).json({ success: false, error: authError.message || 'Failed to create user account' });
    }

    // 2. Initialize users/{userId} Firestore document
    const userDoc = await UserRepository.create(userRecord.uid, {
      userId: userRecord.uid,
      name,
      email,
      collegeName: collegeName || 'Campus University',
      department: department || 'Engineering',
      fitnessLevel: fitnessLevel || 'beginner',
      selectedSports: selectedSports || [],
    });

    // 3. Generate Firebase Custom Token for frontend authentication
    const customToken = await auth.createCustomToken(userRecord.uid);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: {
        token: customToken,
        user: {
          id: userDoc.userId,
          name: userDoc.name,
          email: userDoc.email,
          collegeName: userDoc.collegeName,
          totalXp: userDoc.xp,
          currentStreak: userDoc.currentStreak,
          level: userDoc.level,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error in /signup:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password, idToken } = req.body;

    // Demo shortcut for local development & automated tests
    if (email === 'demo' || email === 'demo@sportx.app') {
      const demoUid = 'demo_student_01';
      let demoUser = await UserRepository.getById(demoUid);
      if (!demoUser) {
        demoUser = await UserRepository.create(demoUid, {
          userId: demoUid,
          name: 'Aarav Sharma',
          email: 'aarav@campus.edu',
          collegeName: 'Campus University',
          department: 'Computer Science',
          fitnessLevel: 'beginner',
          selectedSports: ['badminton', 'football'],
          xp: 450,
          currentStreak: 4,
          longestStreak: 6,
          level: 3,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Logged in as demo student',
        data: {
          token: 'demo',
          user: {
            id: demoUser.userId,
            name: demoUser.name,
            email: demoUser.email,
            collegeName: demoUser.collegeName,
            totalXp: demoUser.xp,
            currentStreak: demoUser.currentStreak,
            level: demoUser.level,
          },
        },
      });
    }

    // Direct Firebase ID Token authentication (standard Firebase frontend pattern)
    if (idToken) {
      const decoded = await auth.verifyIdToken(idToken);
      let userDoc = await UserRepository.getById(decoded.uid);
      if (!userDoc) {
        userDoc = await UserRepository.create(decoded.uid, {
          userId: decoded.uid,
          name: decoded.name || 'Athlete',
          email: decoded.email || '',
          profileImage: decoded.picture || '',
        });
      }

      const customToken = await auth.createCustomToken(decoded.uid);
      return res.status(200).json({
        success: true,
        message: 'Login successful via Firebase ID Token',
        data: {
          token: customToken,
          user: {
            id: userDoc.userId,
            name: userDoc.name,
            email: userDoc.email,
            collegeName: userDoc.collegeName,
            totalXp: userDoc.xp,
            currentStreak: userDoc.currentStreak,
            level: userDoc.level,
          },
        },
      });
    }

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'email and password are required' });
    }

    // Verify user exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        return res.status(401).json({ success: false, error: 'No account found with this email' });
      }
      throw err;
    }

    // Fetch user profile from Firestore
    let userDoc = await UserRepository.getById(userRecord.uid);
    if (!userDoc) {
      userDoc = await UserRepository.create(userRecord.uid, {
        userId: userRecord.uid,
        name: userRecord.displayName || 'Athlete',
        email: userRecord.email || email,
      });
    }

    // Generate custom token for client session
    const customToken = await auth.createCustomToken(userRecord.uid);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: customToken,
        user: {
          id: userDoc.userId,
          name: userDoc.name,
          email: userDoc.email,
          collegeName: userDoc.collegeName,
          totalXp: userDoc.xp,
          currentStreak: userDoc.currentStreak,
          level: userDoc.level,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error in /login:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ── POST /api/v1/auth/google ──────────────────────────────────────────────────
authRouter.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, error: 'idToken is required' });
    }

    const decoded = await auth.verifyIdToken(idToken);
    let userDoc = await UserRepository.getById(decoded.uid);

    if (!userDoc) {
      userDoc = await UserRepository.create(decoded.uid, {
        userId: decoded.uid,
        name: decoded.name || 'Google Athlete',
        email: decoded.email || '',
        profileImage: decoded.picture || '',
        fitnessLevel: 'beginner',
      });
    }

    const customToken = await auth.createCustomToken(decoded.uid);

    return res.status(200).json({
      success: true,
      message: 'Google Sign-In successful',
      data: {
        token: customToken,
        user: {
          id: userDoc.userId,
          name: userDoc.name,
          email: userDoc.email,
          profileImage: userDoc.profileImage,
          totalXp: userDoc.xp,
          currentStreak: userDoc.currentStreak,
          level: userDoc.level,
        },
      },
    });
  } catch (err: any) {
    logger.error('Error in /google sign-in:', err);
    return res.status(401).json({ success: false, error: 'Invalid Google ID token' });
  }
});

// ── POST /api/v1/auth/reset-password ──────────────────────────────────────────
authRouter.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'email is required' });
    }

    const resetLink = await auth.generatePasswordResetLink(email);

    return res.status(200).json({
      success: true,
      message: 'Password reset link generated successfully.',
      resetLink,
    });
  } catch (err: any) {
    logger.error('Error in /reset-password:', err);
    return res.status(400).json({ success: false, error: err.message || 'Unable to generate reset link' });
  }
});

// ── POST /api/v1/auth/logout ──────────────────────────────────────────────────
authRouter.post('/logout', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    if (uid !== 'demo_student_01') {
      await auth.revokeRefreshTokens(uid);
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/v1/auth/account ───────────────────────────────────────────────
authRouter.delete('/account', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    if (uid !== 'demo_student_01') {
      await auth.deleteUser(uid);
    }
    return res.status(200).json({ success: true, message: 'User account deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/v1/auth/fcm-token ───────────────────────────────────────────────
authRouter.post('/fcm-token', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'FCM token is required' });
    }

    await UserRepository.addFcmToken(uid, token);
    return res.status(200).json({ success: true, message: 'FCM token registered successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
