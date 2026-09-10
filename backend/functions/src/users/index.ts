/**
 * User Profile Routes: GET /profile, PUT /profile, GET /stats
 * Core Requirements: User Database, Profile Management, Preferences, Stats
 */
import { Router, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { AnalyticsRepository } from '../repositories/analyticsRepository';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import * as logger from 'firebase-functions/logger';

export const usersRouter = Router();

// GET /api/v1/users/profile
usersRouter.get('/profile', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    let user = await UserRepository.getById(uid);

    if (!user) {
      // Auto-initialize profile if missing
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

// PUT /api/v1/users/profile
usersRouter.put('/profile', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
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
    } = req.body;

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

    // Ensure user exists before updating
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

// GET /api/v1/users/stats
usersRouter.get('/stats', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
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
