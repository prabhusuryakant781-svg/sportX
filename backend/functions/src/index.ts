/**
 * SportX API – Firebase Cloud Functions 2nd Gen Master Router
 * Person 2: Backend Intelligence Layer Foundation
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { db } from './config/firebase';

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
import { askCoachHandler } from './ai';

export const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// Lightweight request logging
app.use((req: Request, _res: Response, next) => {
  logger.info(`[SportX API] ${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip
  });
  next();
});

// ── Core Health & Status ───────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    service: 'SportX Backend Intelligence Layer',
    version: '2.0.0 (Cloud Functions 2nd Gen)',
    status: '🟢 Running',
    docsUrl: '/api/v1',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Health & Firestore Connectivity Endpoint
 * Flow: Flutter/Client Request -> Cloud Function -> Firestore (Write & Read) -> JSON Response
 */
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const testDocRef = db.collection('systemChecks').doc('backendFoundation');
    const writeData = {
      service: 'SportX Intelligence Layer',
      phase: 'Phase 1 — Backend Foundation',
      status: 'operational',
      updatedAt: new Date().toISOString(),
      verifiedBy: 'Cloud Functions 2nd Gen'
    };

    await testDocRef.set(writeData, { merge: true });
    const snapshot = await testDocRef.get();

    res.status(200).json({
      status: 'ok',
      service: 'SportX Backend Intelligence Layer',
      runtime: 'Node.js + Firebase Cloud Functions 2nd Gen',
      uptime: `${process.uptime().toFixed(1)}s`,
      firestore: {
        connected: true,
        testWrite: 'success',
        testRead: 'success',
        persistedData: snapshot.data()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Firestore connection check failed:', error);
    res.status(500).json({
      status: 'error',
      firestore: {
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
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
v1.post('/ai/ask-coach', askCoachHandler); // Phase 2: AI Coach consultation
v1.use('/challenges', challengesRouter); // CF25: Peer Challenges
v1.use('/lobbies', lobbiesRouter);     // CF23: Multiplayer Workout Mode
v1.use('/bugs', bugsRouter);           // CF30: Bug Reporting

// Dedicated Firestore connectivity verification route
v1.get('/system/firestore-check', async (req: Request, res: Response) => {
  try {
    const testDocRef = db.collection('systemChecks').doc('firestoreTest');
    const testPayload = {
      pingId: `ping_${Date.now()}`,
      clientTimestamp: req.query.timestamp || new Date().toISOString(),
      serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      platform: req.headers['user-agent'] || 'Flutter/HTTP Client'
    };

    await testDocRef.set(testPayload, { merge: true });
    const snapshot = await testDocRef.get();

    res.status(200).json({
      success: true,
      message: 'Firestore connection test passed successfully',
      data: snapshot.data()
    });
  } catch (error: any) {
    logger.error('Firestore check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Index — list all registered routes
v1.get('/', (_req, res) => {
  res.status(200).json({
    message: 'SportX API v1 — Backend Intelligence Layer',
    firestoreStatus: '/api/v1/system/firestore-check',
    routes: [
      'GET  /health',
      'GET  /api/v1/system/firestore-check',
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
app.use('/v1', v1); // Serverless compatibility fallback if /api prefix is stripped by proxy

// ── 404 fallback ───────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    hint: 'Visit GET /api/v1 for all available endpoints',
  });
});

// ===============================================================================
// FIREBASE CLOUD FUNCTIONS 2ND GEN EXPORTS
// ===============================================================================

/**
 * Main Cloud Function 2nd Gen API gateway
 * Mounts the complete Express router under Cloud Function HTTPS handling.
 */
export const api = onRequest({ cors: true }, app);

/**
 * Dedicated 2nd Gen Cloud Function: Direct Health Check & Firestore Connectivity
 * Flow: Flutter/Client Request -> Cloud Function -> Firestore (Write & Read) -> JSON Response
 */
export const healthCheck = onRequest({ cors: true }, async (req: Request, res: Response) => {
  try {
    logger.info('Received healthCheck Cloud Function call', { method: req.method, ip: req.ip });

    const testDocRef = db.collection('systemChecks').doc('backendFoundation');
    const checkPayload = {
      service: 'SportX Intelligence Layer',
      phase: 'Phase 1 — Backend Foundation',
      status: 'operational',
      clientTimestamp: req.query.timestamp || new Date().toISOString(),
      verifiedAt: new Date().toISOString()
    };

    await testDocRef.set(checkPayload, { merge: true });
    const snapshot = await testDocRef.get();

    res.status(200).json({
      success: true,
      message: 'Cloud Function 2nd Gen and Firestore are connected and fully operational!',
      cloudFunction: {
        gen: '2nd Gen',
        region: process.env.FUNCTION_REGION || 'us-central1'
      },
      firestore: {
        connected: true,
        collection: 'systemChecks',
        documentId: 'backendFoundation',
        data: snapshot.data()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error in healthCheck Cloud Function:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Firestore communication error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Dedicated 2nd Gen Cloud Function: SportX AI Coach
 * Flow: Flutter/Client Request -> Authentication -> contextBuilder -> Firestore -> AI API -> Validator -> Structured JSON Response
 */
export const askCoach = onRequest({ cors: true }, askCoachHandler);

