/**
 * Exercises Routes: GET /exercises, GET /exercises/:id, POST /exercises/search
 * Core Feature: Exercise Library, Form Rules & Biomechanical Specs
 */
import { Router } from 'express';
import { ExerciseRepository, INITIAL_EXERCISES } from '../repositories/exerciseRepository';
import * as logger from 'firebase-functions/logger';

export const exercisesRouter = Router();

// Re-export initial exercises for backwards compatibility
export const EXERCISES = INITIAL_EXERCISES;

// GET /api/v1/exercises
exercisesRouter.get('/', async (req, res) => {
  try {
    const { sportId, difficulty, muscle } = req.query;
    const exercises = await ExerciseRepository.getAll({
      sportId: sportId as string,
      difficulty: difficulty as string,
      targetMuscle: muscle as string,
    });

    res.status(200).json({ success: true, count: exercises.length, data: exercises });
  } catch (err: any) {
    logger.error('Error fetching exercises:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/exercises/:id
exercisesRouter.get('/:id', async (req, res) => {
  try {
    const exercise = await ExerciseRepository.getById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ success: false, error: 'Exercise not found' });
    }
    return res.status(200).json({ success: true, data: exercise });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/exercises/search
exercisesRouter.post('/search', async (req, res) => {
  try {
    const { query, muscle, equipment, difficulty } = req.body;
    let list = await ExerciseRepository.getAll();

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.targetMuscles.some((m) => m.toLowerCase().includes(q)) ||
          e.sportId.toLowerCase().includes(q)
      );
    }
    if (muscle) {
      const m = muscle.toLowerCase();
      list = list.filter(
        (e) =>
          e.targetMuscles.some((t) => t.toLowerCase().includes(m)) ||
          e.secondaryMuscles.some((s) => s.toLowerCase().includes(m))
      );
    }
    if (equipment) {
      list = list.filter((e) => e.equipmentNeeded.includes(equipment));
    }
    if (difficulty) {
      list = list.filter((e) => e.difficulty === difficulty);
    }

    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
