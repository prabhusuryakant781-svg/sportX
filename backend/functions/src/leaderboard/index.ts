/**
 * Leaderboard Routes: GET /leaderboard/global, GET /leaderboard/college
 * Core Feature: 20 (Leaderboard), 22 (Social Comparison)
 */
import { Router } from 'express';
import { users } from '../config/demoStore';

export const leaderboardRouter = Router();

// GET /api/v1/leaderboard/global
leaderboardRouter.get('/global', (_req, res) => {
  // Generate rich demo leaderboard
  const demoLeaders = [
    { rank: 1, userId: 'u1', name: 'Priya Patel', collegeName: 'IIT Bombay', totalXp: 2840, currentStreak: 12, avatar: '🏆' },
    { rank: 2, userId: 'u2', name: 'Aarav Sharma', collegeName: 'Campus University', totalXp: 2450, currentStreak: 4, avatar: '🥈' },
    { rank: 3, userId: 'u3', name: 'Neha Joshi', collegeName: 'IIT Delhi', totalXp: 2100, currentStreak: 9, avatar: '🥉' },
    { rank: 4, userId: 'u4', name: 'Rohan Verma', collegeName: 'VIT Vellore', totalXp: 1860, currentStreak: 7, avatar: '⚡' },
    { rank: 5, userId: 'u5', name: 'Anika Singh', collegeName: 'NIT Trichy', totalXp: 1720, currentStreak: 5, avatar: '🔥' },
    { rank: 6, userId: 'u6', name: 'Dev Kapoor', collegeName: 'IIT Madras', totalXp: 1540, currentStreak: 3, avatar: '💪' },
    { rank: 7, userId: 'u7', name: 'Shreya Gupta', collegeName: 'Campus University', totalXp: 1320, currentStreak: 6, avatar: '🎯' },
    { rank: 8, userId: 'u8', name: 'Vikram Nair', collegeName: 'IIT Kharagpur', totalXp: 1180, currentStreak: 2, avatar: '🌟' },
    { rank: 9, userId: 'u9', name: 'Meera Rao', collegeName: 'NIT Warangal', totalXp: 980, currentStreak: 4, avatar: '🚀' },
    { rank: 10, userId: 'u10', name: 'Arjun Mehta', collegeName: 'IIT Roorkee', totalXp: 750, currentStreak: 1, avatar: '💫' },
  ];

  // Inject current real demo user if they have XP
  const demoUser = [...users.values()].find(u => u.id === 'demo_student_01');
  if (demoUser && demoUser.totalXp > 0) {
    const userEntry = {
      rank: demoLeaders.findIndex(l => l.totalXp < demoUser.totalXp) + 1 || demoLeaders.length + 1,
      userId: demoUser.id,
      name: demoUser.name,
      collegeName: demoUser.collegeName,
      totalXp: demoUser.totalXp,
      currentStreak: demoUser.currentStreak,
      avatar: '🏅',
    };
    const existing = demoLeaders.find(l => l.name === demoUser.name);
    if (!existing) demoLeaders.push(userEntry);
    else existing.totalXp = demoUser.totalXp;
  }

  res.status(200).json({ success: true, period: 'all_time', data: demoLeaders });
});

// GET /api/v1/leaderboard/college
leaderboardRouter.get('/college', (_req, res) => {
  const campusLeaders = [
    { rank: 1, name: 'Aarav Sharma', department: 'Computer Science', totalXp: 2450, currentStreak: 4 },
    { rank: 2, name: 'Shreya Gupta', department: 'Electronics', totalXp: 1320, currentStreak: 6 },
    { rank: 3, name: 'Rahul Kumar', department: 'Mechanical', totalXp: 870, currentStreak: 2 },
  ];
  res.status(200).json({ success: true, collegeName: 'Campus University', data: campusLeaders });
});
