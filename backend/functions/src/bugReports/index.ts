import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const bugReportsRouter = Router();

/**
 * Core Feature 30: Bug Reporting
 * Allows students to report false AI detections, camera issues, or app glitches.
 * POST /api/v1/bugs/report
 */
bugReportsRouter.post('/report', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { category, exerciseId, description, deviceModel, appVersion } = req.body;

    if (!description || !category) {
      return res.status(400).json({ error: 'Missing category or description' });
    }

    const reportDoc = {
      userId: uid || 'anonymous',
      category: category || 'ai_detection', // ai_detection | camera_issue | ui_glitch
      exerciseId: exerciseId || 'general',
      description,
      deviceModel: deviceModel || 'Unknown Device',
      appVersion: appVersion || '1.0.0',
      status: 'pending_review',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('bugReports').add(reportDoc);

    res.status(201).json({
      success: true,
      message: 'Bug report submitted successfully. Thank you for helping improve SportX!',
      data: { reportId: docRef.id, ...reportDoc }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
