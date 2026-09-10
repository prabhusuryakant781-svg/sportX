/**
 * Bug Reports Routes: POST /bugs, GET /bugs
 * Core Feature: Bug Reporting into Firestore bugReports/{reportId}
 */
import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import * as logger from 'firebase-functions/logger';

export const bugsRouter = Router();
const COLLECTION = 'bugReports';

// POST /api/v1/bugs
bugsRouter.post('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, exerciseId, description } = req.body;

    if (!category || !description) {
      return res.status(400).json({ success: false, error: 'category and description are required' });
    }

    const reportId = `bug_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const report = {
      id: reportId,
      userId: req.user!.uid,
      category: category ?? 'other',
      exerciseId: exerciseId ?? 'unknown',
      description,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    await db.collection(COLLECTION).doc(reportId).set(report);

    res.status(201).json({
      success: true,
      message: '🐛 Bug report submitted! Thank you for improving SportX.',
      data: { reportId },
    });
  } catch (err: any) {
    logger.error('Error submitting bug report:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/bugs — list reports
bugsRouter.get('/', async (_req, res) => {
  try {
    const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').limit(50).get();
    const reports = snap.docs.map((d) => d.data());
    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
