/**
 * SportX Computer Vision Integration Module (Phase 3)
 * Provides routes and services for receiving, storing, querying Vision results,
 * and generating AI biomechanical form feedback.
 */

import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { processVisionResult, getVisionResults, getVisionResultBySession } from './visionResult';
import { validateVisionResult } from './validators';
import { generateFormFeedbackHandler } from '../ai/coach';
import * as logger from 'firebase-functions/logger';

export * from './validators';
export * from './visionResult';

export const visionRouter = Router();

/**
 * POST /api/v1/vision/results
 * Ingests, validates, and persists a Computer Vision analysis result.
 */
visionRouter.post('/results', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const storedRecord = await processVisionResult(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Vision result received, validated, and stored successfully',
      data: storedRecord
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    logger.warn('[Vision API] Error processing vision result:', err.message);
    res.status(status).json({
      success: false,
      error: err.message || 'Failed to process vision result',
      ...(err.validationErrors ? { validationErrors: err.validationErrors } : {})
    });
  }
});

/**
 * GET /api/v1/vision/results
 * Retrieves recent vision results for the authenticated user.
 */
visionRouter.get('/results', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const results = await getVisionResults(userId, limit);

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err: any) {
    logger.error('[Vision API] Error retrieving results:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve vision results'
    });
  }
});

/**
 * GET /api/v1/vision/results/:sessionId
 * Retrieves vision result for a specific session ID.
 */
visionRouter.get('/results/:sessionId', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const record = await getVisionResultBySession(sessionId);

    if (!record) {
      res.status(404).json({
        success: false,
        error: `No vision result found for session "${sessionId}"`
      });
      return;
    }

    if (record.userId !== req.user!.uid) {
      res.status(403).json({
        success: false,
        error: 'Access denied: You do not own this vision result'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (err: any) {
    logger.error('[Vision API] Error retrieving session vision result:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session vision result'
    });
  }
});

/**
 * POST /api/v1/vision/feedback
 * Generates grounded AI form feedback for a vision result or sessionId.
 */
visionRouter.post('/feedback', generateFormFeedbackHandler);
