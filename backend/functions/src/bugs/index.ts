/**
 * Bug Reports Routes: POST /bugs
 * Core Feature: 30 (Bug Reporting)
 */
import { Router, Response } from 'express';
import { bugReports, nextId } from '../config/demoStore';
import { verifyAuth, AuthenticatedRequest } from '../auth';

export const bugsRouter = Router();

// POST /api/v1/bugs
bugsRouter.post('/', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const { category, exerciseId, description } = req.body;

  if (!category || !description) {
    return res.status(400).json({ error: 'category and description are required' });
  }

  const report = {
    id: nextId('bug'),
    userId: req.user!.uid,
    category: category ?? 'other',
    exerciseId: exerciseId ?? 'unknown',
    description,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  bugReports.push(report);

  res.status(201).json({
    success: true,
    message: '🐛 Bug report submitted! Thank you for improving SportX.',
    data: { reportId: report.id },
  });
});

// GET /api/v1/bugs — list all reports (for demo)
bugsRouter.get('/', (_req, res) => {
  res.status(200).json({ success: true, count: bugReports.length, data: bugReports });
});
