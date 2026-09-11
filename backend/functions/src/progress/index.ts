/**
 * Progress Tracking Router
 * GET /api/v1/progress/summary
 * Core Requirements: Server-authoritative calculations for weekly progress, monthly progress,
 * goal completion %, total reps, workout frequency, duration, calories, unique workout days,
 * form score trends, and personal records.
 */
import { Router, Response } from 'express';
import { ProgressRepository, ProgressPeriod } from '../repositories/progressRepository';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import * as logger from 'firebase-functions/logger';

export const progressRouter = Router();

// Handler function for progress summary
const getProgressSummaryHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;

    // Strict ownership verification: cannot query another user's progress
    const requestedUserId = req.query.userId as string | undefined;
    if (requestedUserId && requestedUserId !== uid && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Cannot access another user's progress",
      });
    }

    // Validate period parameter: today | 7d | 30d | all (default: all)
    const validPeriods: ProgressPeriod[] = ['today', '7d', '30d', 'all'];
    const rawPeriod = req.query.period as string | undefined;
    const period: ProgressPeriod = validPeriods.includes(rawPeriod as ProgressPeriod)
      ? (rawPeriod as ProgressPeriod)
      : 'all';

    // Calculate trusted, server-authoritative progress from completed sessions & activity logs
    const progressData = await ProgressRepository.calculateProgress(uid, period);

    return res.status(200).json({
      success: true,
      data: progressData,
    });
  } catch (error: any) {
    logger.error('Error fetching progress summary:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/progress and GET /api/v1/progress/summary
progressRouter.get('/', verifyAuth, getProgressSummaryHandler);
progressRouter.get('/summary', verifyAuth, getProgressSummaryHandler);
