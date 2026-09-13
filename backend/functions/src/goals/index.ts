/**
 * SportX Goals Router
 * Endpoints under /api/v1/goals/*
 * Handles goal creation, predefined templates, live progress synchronization, and deletion.
 */

import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { GoalRepository } from '../repositories/goalRepository';
import * as logger from 'firebase-functions/logger';

export const goalsRouter = Router();

/**
 * GET /api/v1/goals/templates
 * Retrieve certified measurable goal templates
 */
goalsRouter.get('/templates', (_req, res: Response) => {
  const templates = GoalRepository.getTemplates();
  res.status(200).json({
    success: true,
    data: templates,
    templates,
  });
});

/**
 * GET /api/v1/goals
 * Retrieve authenticated athlete's active and completed goals with synchronized authoritative progress
 */
goalsRouter.get('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const goals = await GoalRepository.getUserGoals(userId, true);

    const active = goals.filter((g) => g.status === 'active');
    const completed = goals.filter((g) => g.status === 'completed');

    res.status(200).json({
      success: true,
      data: goals,
      goals,
      active,
      completed,
      summary: {
        total: goals.length,
        activeCount: active.length,
        completedCount: completed.length,
      },
    });
  } catch (err: any) {
    logger.error('[GoalsRouter] Error fetching goals:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/goals
 * Create a new goal (from template or custom measurable parameters)
 */
goalsRouter.post('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const payload = req.body;

    const goal = await GoalRepository.createGoal(userId, payload);
    res.status(201).json({
      success: true,
      message: 'Goal established successfully! Track your progress as you train.',
      data: goal,
      goal,
    });
  } catch (err: any) {
    logger.warn('[GoalsRouter] Error creating goal:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/goals/:id
 * Retrieve details and synchronized progress of a specific goal
 */
goalsRouter.get('/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const goal = await GoalRepository.getGoalById(req.params.id);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    if (goal.userId !== req.user!.uid) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not own this goal' });
    }

    const synchronized = await GoalRepository.evaluateGoalProgress(goal);
    res.status(200).json({
      success: true,
      data: synchronized,
      goal: synchronized,
    });
  } catch (err: any) {
    logger.error('[GoalsRouter] Error fetching goal:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/v1/goals/:id
 * Cancel or remove an active goal
 */
goalsRouter.delete('/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const cancelled = await GoalRepository.cancelGoal(req.params.id, userId);

    res.status(200).json({
      success: cancelled,
      message: cancelled ? 'Goal cancelled successfully' : 'Goal could not be cancelled',
    });
  } catch (err: any) {
    logger.warn('[GoalsRouter] Error cancelling goal:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});
