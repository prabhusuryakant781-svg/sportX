/**
 * Auth Routes: POST /api/v1/auth/signup & POST /api/v1/auth/login
 * Core Features: 1 (Signup / Login), 29 (Authentication)
 */
import { Router } from 'express';
import { users, generateToken, nextId, DemoUser } from '../config/demoStore';

export const authRouter = Router();

// ── POST /api/v1/auth/signup ──────────────────────────────────────────────────
authRouter.post('/signup', (req, res) => {
  const { name, email, password, collegeName, department } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  // Check duplicate
  const existing = [...users.values()].find(u => u.email === email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const newUser: DemoUser = {
    id: nextId('user'),
    name,
    email,
    password,
    collegeName: collegeName || 'Campus University',
    department: department || 'Engineering',
    fitnessLevel: 'beginner',
    fitnessGoal: 'fitness',
    availableTimeMinutes: 20,
    selectedSports: [],
    totalXp: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastWorkoutDate: null,
    createdAt: new Date().toISOString(),
  };

  users.set(newUser.id, newUser);
  const token = generateToken(newUser.id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully!',
    data: {
      token,
      user: { id: newUser.id, name, email, collegeName: newUser.collegeName },
    },
  });
});

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  // Demo shortcut: auto-login for demo credentials
  if (email === 'demo' || email === 'demo@sportx.app') {
    const user = users.get('demo_student_01')!;
    const token = generateToken('demo_student_01');
    return res.status(200).json({
      success: true,
      message: 'Logged in as demo student',
      data: { token, user: { id: user.id, name: user.name, email: user.email, totalXp: user.totalXp, currentStreak: user.currentStreak } },
    });
  }

  const user = [...users.values()].find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user.id);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, totalXp: user.totalXp, currentStreak: user.currentStreak },
    },
  });
});
