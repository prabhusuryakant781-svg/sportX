import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import { usersRouter } from './users';
import { sportsRouter } from './sports';
import { exercisesRouter } from './exercises';
import { workoutsRouter } from './workouts';
import { sessionsRouter } from './sessions';
import { activityRouter } from './activity';
import { gamificationRouter } from './gamification';
import { challengesRouter } from './challenges';
import { leaderboardRouter } from './leaderboard';
import { notificationsRouter } from './notifications';
import { aiCoachRouter } from './ai/coach';
import { bugReportsRouter } from './bugReports';

const app = express();

// Middlewares
app.use(cors({ origin: true }));
app.use(express.json());

// API Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    project: 'SportX Backend (Cloud Functions 2nd Gen)',
    coreFeaturesCount: 31,
    version: '2.1.0',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes under /api/v1 mapped to the 31 Core Features
app.use('/api/v1/users', usersRouter);               // Features 1, 2, 4, 5
app.use('/api/v1/sports', sportsRouter);             // Feature 3
app.use('/api/v1/exercises', exercisesRouter);       // Feature 11
app.use('/api/v1/workouts', workoutsRouter);         // Features 12, 13, 14
app.use('/api/v1/sessions', sessionsRouter);         // Features 15, 28
app.use('/api/v1/activity', activityRouter);         // Features 15, 16
app.use('/api/v1/gamification', gamificationRouter); // Features 19, 21, 24, 27
app.use('/api/v1/challenges', challengesRouter);     // Features 7, 23, 25, 26
app.use('/api/v1/leaderboard', leaderboardRouter);   // Feature 27
app.use('/api/v1/notifications', notificationsRouter);// Features 26, 27
app.use('/api/v1/ai', aiCoachRouter);                // Features 8, 9, 10, 22
app.use('/api/v1/bugs', bugReportsRouter);           // Feature 30

// Export Cloud Function (2nd Generation)
export const api = onRequest({ cors: true, maxInstances: 10 }, app);

// Export express app for local execution
export { app };
