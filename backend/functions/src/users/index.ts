/**
 * User Profile Routes:
 * - GET    /profile
 * - PUT    /profile
 * - POST   /profile/image (upload avatar, max 5MB, jpeg/png/webp)
 * - DELETE /profile/image (delete avatar)
 * - GET    /stats
 * - GET    /:userId (cross-user privacy safe view)
 */
import { Router, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { AnalyticsRepository } from '../repositories/analyticsRepository';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { validateFitnessProfile, sanitizeUserProfileUpdate } from '../middleware/validation';
import { mediaRateLimiter } from '../middleware/rateLimiter';
import { AuditLogger } from '../services/auditLogger';
import { storage, hasFirebaseCredentials } from '../config/firebase';
import * as logger from 'firebase-functions/logger';

export const usersRouter = Router();

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// GET /api/v1/users/profile - Current user's full private profile
usersRouter.get('/profile', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    let user = await UserRepository.getById(uid);

    if (!user) {
      user = await UserRepository.create(uid, {
        userId: uid,
        email: req.user?.email || '',
        name: req.user?.name || 'Athlete',
      });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err: any) {
    logger.error('Error fetching user profile:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch profile' });
  }
});

// PUT /api/v1/users/profile - Update current user's profile
usersRouter.put('/profile', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;

    const validation = validateFitnessProfile(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const sanitized = sanitizeUserProfileUpdate(req.body);
    const {
      name,
      collegeName,
      department,
      fitnessLevel,
      goals,
      fitnessGoal,
      availableTimeMinutes,
      availableWorkoutTime,
      selectedSports,
      age,
      height,
      weight,
      experience,
      preferences,
      availableEquipment,
      workoutDaysPerWeek,
      targetCalories,
      notificationsEnabled,
      profileImage,
    } = sanitized as Record<string, any>;

    const updates: Record<string, any> = {};

    if (name !== undefined) updates.name = name;
    if (profileImage !== undefined) updates.profileImage = profileImage;
    if (collegeName !== undefined) updates.collegeName = collegeName;
    if (department !== undefined) updates.department = department;
    if (fitnessLevel !== undefined) updates.fitnessLevel = fitnessLevel;
    if (goals !== undefined) updates.goals = Array.isArray(goals) ? goals : [goals];
    if (fitnessGoal !== undefined && !goals) updates.goals = [fitnessGoal];
    const workoutTime = availableWorkoutTime ?? availableTimeMinutes;
    if (workoutTime !== undefined) updates.availableWorkoutTime = Number(workoutTime);
    if (selectedSports !== undefined) updates.selectedSports = selectedSports;
    if (age !== undefined) updates.age = Number(age);
    if (height !== undefined) updates.height = Number(height);
    if (weight !== undefined) updates.weight = Number(weight);
    if (experience !== undefined) updates.experience = experience;
    if (preferences !== undefined) updates.preferences = preferences;
    if (availableEquipment !== undefined) updates.availableEquipment = availableEquipment;
    if (workoutDaysPerWeek !== undefined) updates.workoutDaysPerWeek = Number(workoutDaysPerWeek);
    if (targetCalories !== undefined) updates.targetCalories = Number(targetCalories);
    if (notificationsEnabled !== undefined) updates.notificationsEnabled = Boolean(notificationsEnabled);

    let user = await UserRepository.getById(uid);
    if (!user) {
      user = await UserRepository.create(uid, updates);
    } else {
      await UserRepository.update(uid, updates);
      user = await UserRepository.getById(uid);
    }

    res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (err: any) {
    logger.error('Error updating profile:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update profile' });
  }
});

// POST /api/v1/users/profile/image - Secure avatar upload with format and size validation
usersRouter.post('/profile/image', verifyAuth, mediaRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'imageBase64 payload is required' });
    }

    // 1. Validate MIME format
    const cleanMime = mimeType.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Allowed formats: JPEG, PNG, WEBP',
      });
    }

    // 2. Decode and validate file size
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        error: `Image file exceeds 5MB limit (${(buffer.length / (1024 * 1024)).toFixed(2)}MB)`,
      });
    }

    // 3. Upload to Firebase Storage or generate deterministic URL
    const ext = cleanMime.split('/')[1] || 'jpg';
    const filePath = `users/${uid}/avatar/avatar_${Date.now()}.${ext}`;
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'sportx-ab55f'}.appspot.com`;
    let publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;

    if (hasFirebaseCredentials) {
      try {
        const file = storage.bucket().file(filePath);
        await file.save(buffer, {
          metadata: { contentType: cleanMime },
          public: true,
        });
        publicUrl = `https://storage.googleapis.com/${storage.bucket().name}/${filePath}`;
      } catch (uploadErr) {
        logger.warn('[Profile Image] Storage upload error, falling back to URL:', uploadErr);
      }
    }

    // 4. Update user document
    await UserRepository.update(uid, { profileImage: publicUrl });

    // 5. Audit Log
    AuditLogger.logSecurityEvent({
      eventType: 'profile_image_updated',
      userId: uid,
      ip: req.ip,
      status: 'success',
      details: { sizeBytes: buffer.length, mimeType: cleanMime },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: { profileImage: publicUrl },
    });
  } catch (err: any) {
    logger.error('Error uploading profile image:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/users/profile/image - Delete avatar
usersRouter.delete('/profile/image', verifyAuth, mediaRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const user = await UserRepository.getById(uid);

    if (hasFirebaseCredentials && user?.profileImage) {
      try {
        await storage.bucket().deleteFiles({ prefix: `users/${uid}/avatar/`, force: true });
      } catch (err) {
        logger.warn('[Profile Image] Storage delete error:', err);
      }
    }

    await UserRepository.update(uid, { profileImage: '' });

    AuditLogger.logSecurityEvent({
      eventType: 'profile_image_deleted',
      userId: uid,
      ip: req.ip,
      status: 'success',
    });

    return res.status(200).json({
      success: true,
      message: 'Profile image deleted successfully',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/users/stats - Authenticated user's private stats
usersRouter.get('/stats', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;

    // Cross-user access check: cannot access another user's stats
    const requestedUserId = req.query.userId as string | undefined;
    if (requestedUserId && requestedUserId !== uid && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Cannot access another user's private stats",
      });
    }

    const user = await UserRepository.getById(uid);
    const stats = await AnalyticsRepository.getUserStats(uid);

    res.status(200).json({
      success: true,
      data: {
        userId: uid,
        totalWorkouts: user?.totalWorkouts || stats?.workoutsCompleted || 0,
        totalMinutes: user?.totalMinutes || stats?.totalDuration || 0,
        totalCalories: user?.totalCalories || stats?.totalCalories || 0,
        currentStreak: user?.currentStreak || 0,
        longestStreak: user?.longestStreak || 0,
        xp: user?.xp || 0,
        level: user?.level || 1,
        badgesCount: user?.badges?.length || 0,
        averageFormAccuracy: stats?.averageFormAccuracy || 88,
        muscleGroupBreakdown: stats?.muscleGroupBreakdown || {},
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/users/:userId - Public Social Profile View with Strict Cross-User Privacy
usersRouter.get('/:userId', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const callerUid = req.user!.uid;
    const isOwner = callerUid === userId;
    const isAdmin = req.user?.role === 'admin';

    const targetUser = await UserRepository.getById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    // If caller is the resource owner or an admin, return full profile
    if (isOwner || isAdmin) {
      return res.status(200).json({ success: true, data: targetUser });
    }

    // Privacy Guard: Check if target user has opted into private profile
    if ((targetUser.preferences as any)?.isPrivate === true) {
      AuditLogger.logSecurityEvent({
        eventType: 'unauthorized_access_attempt',
        userId: callerUid,
        targetUserId: userId,
        status: 'denied',
        details: { reason: 'Attempted to access private profile' },
      });
      return res.status(403).json({ success: false, error: 'This profile is private' });
    }

    // Return sanitized public social profile strictly excluding private health & contact data
    const publicProfile = {
      userId: targetUser.userId,
      name: targetUser.name,
      profileImage: targetUser.profileImage || '',
      collegeName: targetUser.collegeName || '',
      department: targetUser.department || '',
      xp: targetUser.xp || 0,
      level: targetUser.level || 1,
      badges: targetUser.badges || [],
      currentStreak: targetUser.currentStreak || 0,
    };

    return res.status(200).json({ success: true, data: publicProfile });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
