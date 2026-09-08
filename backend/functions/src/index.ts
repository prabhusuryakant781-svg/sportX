/**
 * SportX API – Main Router
 * All 31 core feature endpoints registered here.
 *
 * Runs as a local Express server in demo mode (no Firebase required).
 * Switch to Cloud Functions by replacing localServer.ts with functions.https.onRequest().
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Route modules
import { authRouter } from './auth/authRouter';
import { usersRouter } from './users';
import { sportsRouter } from './sports';
import { exercisesRouter } from './exercises';
import { workoutsRouter } from './workouts';
import { sessionsRouter } from './sessions';
import { activityRouter } from './activity';
import { gamificationRouter } from './gamification';
import { leaderboardRouter } from './leaderboard';
import { aiCoachRouter } from './aiCoach';
import { challengesRouter } from './challenges';
import { lobbiesRouter } from './lobbies';
import { bugsRouter } from './bugs';

export const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Health ─────────────────────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    service: 'SportX API',
    version: '1.0.0',
    mode: 'DEMO (in-memory, no Firebase)',
    status: '🟢 Running',
    docsUrl: 'http://localhost:3001/api/v1',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime().toFixed(1) + 's' });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
const v1 = express.Router();

v1.use('/auth', authRouter);           // CF1: Signup/Login
v1.use('/users', usersRouter);         // CF2: Profile | CF3: Sports | CF4: Fitness Level
v1.use('/sports', sportsRouter);       // CF3: Sports Selection
v1.use('/exercises', exercisesRouter); // CF11: Exercise Library
v1.use('/workouts', workoutsRouter);   // CF12-CF14: Personalized Plans / Daily Plan
v1.use('/sessions', sessionsRouter);   // CF9: Rep Counting | CF15: Activity Log | CF24: XP
v1.use('/activity', activityRouter);   // CF15: Activity Log | CF16: History
v1.use('/gamification', gamificationRouter); // CF19: Streak | CF21: Milestones | CF24: XP | CF27: Badges
v1.use('/leaderboard', leaderboardRouter);   // CF20: Leaderboard | CF22: Social Comparison
v1.use('/ai', aiCoachRouter);          // CF6-CF10: AI Pose, Form, Feedback, Coach
v1.use('/challenges', challengesRouter); // CF25: Peer Challenges
v1.use('/lobbies', lobbiesRouter);     // CF23: Multiplayer Workout Mode
v1.use('/bugs', bugsRouter);           // CF30: Bug Reporting

// Index — list all registered routes
v1.get('/', (_req, res) => {
  res.status(200).json({
    message: 'SportX API v1 — 31 Core Feature Endpoints',
    routes: [
      'POST /api/v1/auth/signup', 'POST /api/v1/auth/login',
      'GET  /api/v1/users/profile', 'PUT  /api/v1/users/profile',
      'GET  /api/v1/sports', 'POST /api/v1/sports/select',
      'GET  /api/v1/exercises', 'GET  /api/v1/exercises/:id',
      'GET  /api/v1/workouts', 'GET  /api/v1/workouts/today', 'GET  /api/v1/workouts/:id',
      'POST /api/v1/sessions/start', 'POST /api/v1/sessions/:id/complete', 'POST /api/v1/sessions/:id/cancel',
      'GET  /api/v1/activity/history',
      'GET  /api/v1/gamification/badges',
      'GET  /api/v1/leaderboard/global', 'GET  /api/v1/leaderboard/college',
      'POST /api/v1/ai/analyze-form', 'GET  /api/v1/ai/coaching-tip',
      'POST /api/v1/challenges', 'GET  /api/v1/challenges', 'PATCH /api/v1/challenges/:id/respond',
      'POST /api/v1/lobbies', 'POST /api/v1/lobbies/:id/join', 'GET  /api/v1/lobbies/:id', 'POST /api/v1/lobbies/:id/start',
      'POST /api/v1/bugs', 'GET  /api/v1/bugs',
    ],
  });
});

app.use('/api/v1', v1);

// ── 404 fallback ───────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    hint: 'Visit GET /api/v1 for all available endpoints',
  });
});
