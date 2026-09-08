/**
 * User Profile Routes: GET /profile, PUT /profile
 * Core Features: 2 (User Profile), 3 (Sports Selection), 4 (Fitness Level), 5 (Privacy)
 */
import { Router, Response } from 'express';
import { users } from '../config/demoStore';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const usersRouter = Router();

// GET /api/v1/users/profile
usersRouter.get('/profile', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user!.uid;
  const user = users.get(uid);

  if (!user) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const { password, ...safeUser } = user;
  res.status(200).json({ success: true, data: safeUser });
});

// PUT /api/v1/users/profile
usersRouter.put('/profile', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user!.uid;
  const user = users.get(uid);

  if (!user) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const {
    name, collegeName, department, fitnessLevel,
    fitnessGoal, availableTimeMinutes, selectedSports,
    age, height, weight,
  } = req.body;

  if (name !== undefined) user.name = name;
  if (collegeName !== undefined) user.collegeName = collegeName;
  if (department !== undefined) user.department = department;
  if (fitnessLevel !== undefined) user.fitnessLevel = fitnessLevel;
  if (fitnessGoal !== undefined) user.fitnessGoal = fitnessGoal;
  if (availableTimeMinutes !== undefined) user.availableTimeMinutes = Number(availableTimeMinutes);
  if (selectedSports !== undefined) user.selectedSports = selectedSports;

  users.set(uid, user);

  const { password, ...safeUser } = user;
  res.status(200).json({ success: true, message: 'Profile updated', data: safeUser });
});
