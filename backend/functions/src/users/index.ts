import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const usersRouter = Router();

// GET /api/v1/users/profile
usersRouter.get('/profile', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'User not authenticated' });

    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      // Auto-provision demo profile for ease of testing
      const newProfile = {
        userId: uid,
        name: req.user?.name || 'Student Athlete',
        email: req.user?.email || 'student@campus.edu',
        collegeName: 'Campus University',
        department: 'Computer Science',
        age: 20,
        height: 175,
        weight: 68,
        fitnessLevel: 'beginner',
        fitnessGoal: 'fitness',
        availableTimeMinutes: 20,
        selectedSports: ['badminton', 'football'],
        totalXp: 150,
        currentStreak: 3,
        longestStreak: 5,
        lastWorkoutDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };
      await db.collection('users').doc(uid).set(newProfile);
      return res.status(200).json({ success: true, data: newProfile });
    }

    res.status(200).json({ success: true, data: { userId: doc.id, ...doc.data() } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/v1/users/profile
usersRouter.put('/profile', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'User not authenticated' });

    const {
      name,
      collegeName,
      department,
      age,
      height,
      weight,
      fitnessLevel,
      fitnessGoal,
      availableTimeMinutes,
      selectedSports
    } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (collegeName !== undefined) updates.collegeName = collegeName;
    if (department !== undefined) updates.department = department;
    if (age !== undefined) updates.age = Number(age);
    if (height !== undefined) updates.height = Number(height);
    if (weight !== undefined) updates.weight = Number(weight);
    if (fitnessLevel !== undefined) updates.fitnessLevel = fitnessLevel;
    if (fitnessGoal !== undefined) updates.fitnessGoal = fitnessGoal;
    if (availableTimeMinutes !== undefined) updates.availableTimeMinutes = Number(availableTimeMinutes);
    if (selectedSports !== undefined) updates.selectedSports = selectedSports;

    await db.collection('users').doc(uid).set(updates, { merge: true });
    res.status(200).json({ success: true, message: 'Profile updated successfully', updates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
