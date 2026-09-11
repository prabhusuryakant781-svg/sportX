/**
 * SportX Master Backend Intelligence Layer — Firebase Cloud Functions 2nd Gen
 * Person 1: Core Backend + Database + Security Foundation
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { auth as fbAuthTriggers } from 'firebase-functions/v1';

import { config } from './config/environment';
import { verifyAppCheck } from './middleware/appCheck';
import { sendSuccess } from './middleware/errorHandler';

// Domain Routers
import { authRouter } from './auth/authRouter';
import { usersRouter } from './users/usersRouter';
import { sportsRouter } from './sports/sportsRouter';
import { exercisesRouter } from './exercises/exercisesRouter';
import { workoutsRouter } from './workouts/workoutsRouter';
import { sessionsRouter } from './sessions/sessionsRouter';
import { activityRouter } from './activity/activityRouter';
import { progressRouter } from './progress/progressRouter';
import { gamificationRouter } from './gamification/gamificationRouter';

import { AuthService } from './auth/authService';
import { db } from './config/firebase';

export const app = express();

// ── Security & Core Middleware ────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(verifyAppCheck);

// Request telemetry logger
app.use((req: Request, _res: Response, next) => {
  logger.info(`[SportX Core API] ${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
});

// ── System Health & Telemetry ─────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, {
    service: 'SportX Core Backend API (Person 1)',
    version: '1.0.0',
    status: 'ONLINE',
    runtime: 'Firebase Cloud Functions 2nd Gen',
    appCheckEnforced: config.appCheckEnforced,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, { status: 'healthy', uptime: process.uptime() });
});

// ── Master REST API Routes (/api/v1) ──────────────────────────────────────────
const apiV1 = express.Router();
apiV1.use('/auth', authRouter);
apiV1.use('/users', usersRouter);
apiV1.use('/sports', sportsRouter);
apiV1.use('/exercises', exercisesRouter);
apiV1.use('/workouts', workoutsRouter);
apiV1.use('/sessions', sessionsRouter);
apiV1.use('/activity', activityRouter);
apiV1.use('/progress', progressRouter);
apiV1.use('/gamification', gamificationRouter);

app.use('/api/v1', apiV1);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested API endpoint was not found on SportX Backend',
    },
  });
});

// ── Firebase Cloud Functions 2nd Gen HTTP Export ──────────────────────────────
export const api = onRequest(
  {
    region: config.region,
    cors: true,
    maxInstances: 10,
  },
  app
);

// ── Firebase Auth Background Triggers ─────────────────────────────────────────
/**
 * Automatically provisions users/{userId} document if user registers via direct Firebase Client SDK
 */
export const onUserCreated = fbAuthTriggers.user().onCreate(async (user) => {
  try {
    logger.info(`Provisioning Firestore profile for new Auth user: ${user.uid} (${user.email})`);
    await AuthService.initializeUserProfile(user.uid, {
      name: user.displayName || 'Student Athlete',
      email: user.email || '',
    });
  } catch (err) {
    logger.error(`Error in onUserCreated trigger for ${user.uid}:`, err);
  }
});

/**
 * Handles cleanup when a user is deleted from Firebase Auth
 */
export const onUserDeleted = fbAuthTriggers.user().onDelete(async (user) => {
  try {
    logger.info(`Purging Firestore data for deleted user: ${user.uid}`);
    await db.collection('users').doc(user.uid).delete();
  } catch (err) {
    logger.error(`Error in onUserDeleted trigger for ${user.uid}:`, err);
  }
});
