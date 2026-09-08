/**
 * AI Coach Routes: POST /ai/analyze-form, GET /ai/coaching-tip
 * Core Features: 6 (Pose Estimation), 7 (Form Correction), 8 (Real-time Feedback), 10 (AI Coach)
 */
import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { EXERCISES } from '../exercises';

export const aiCoachRouter = Router();

const COACHING_TIPS: Record<string, string[]> = {
  squat: [
    '💡 Keep your chest up — imagine balancing a plate on your head!',
    '🦵 Drive knees outward to track over toes on the descent.',
    '⬇️ Aim for at least parallel — your quads will thank you.',
  ],
  pushup: [
    '🎯 Keep your body in a straight line from head to heels.',
    '🤲 Hand placement: slightly wider than shoulders for maximum chest engagement.',
    '🔻 Lower until chest nearly touches the floor for a full rep.',
  ],
  bicep_curl: [
    '📌 Pin your elbows to your sides — no swinging!',
    '⬆️ Squeeze hard at the top before lowering with control.',
  ],
  plank: [
    '😤 Breathe steadily — don\'t hold your breath.',
    '🔒 Engage glutes and core simultaneously for maximum stability.',
  ],
  jumping_jacks: [
    '🙌 Get arms fully overhead for every rep.',
    '🦶 Land softly on the balls of your feet.',
  ],
  default: [
    '📱 Position your device 2-3 metres away so your full body is in frame.',
    '💧 Stay hydrated — drink water between sets.',
    '🧘 Warm up for 2 minutes before any intense session.',
  ],
};

// POST /api/v1/ai/analyze-form
aiCoachRouter.post('/analyze-form', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  const { exerciseId, keypoints, timestamp } = req.body;

  if (!exerciseId) {
    return res.status(400).json({ error: 'exerciseId is required' });
  }

  const exercise = EXERCISES.find(e => e.id === exerciseId);

  // Simulate form analysis
  const formScore = Math.min(100, Math.max(50, 72 + Math.round(Math.random() * 28)));
  const errors = exercise?.commonErrors ?? [];
  const detectedError = formScore < 75 && errors.length ? errors[Math.floor(Math.random() * errors.length)] : null;

  const corrections: string[] = [];
  if (detectedError === 'knees_inward') corrections.push('❗ Knees caving inward. Push knees out to track over toes.');
  if (detectedError === 'hip_sag') corrections.push('❗ Hips dropping. Squeeze glutes and pull navel toward spine.');
  if (detectedError === 'elbow_flare') corrections.push('❗ Elbows flaring out. Keep elbows at 45° from torso.');
  if (detectedError === 'shallow_depth') corrections.push('❗ Not deep enough. Lower until thighs are parallel to floor.');
  if (detectedError === 'chest_collapse') corrections.push('❗ Chest rounding. Open chest and pull shoulders back.');
  if (detectedError === 'back_sway') corrections.push('❗ Back swaying. Pin elbows and control the movement.');
  if (corrections.length === 0) corrections.push('✅ Great form! Keep it up!');

  res.status(200).json({
    success: true,
    data: {
      exerciseId,
      formScore,
      phase: formScore > 80 ? 'up' : 'transition',
      repCounted: formScore >= 70,
      feedback: corrections,
      keyMetrics: {
        kneeAngle: exercise?.formRules ? Math.floor(Math.random() * 40) + 90 : null,
        spineNeutral: formScore > 75,
        depthAchieved: formScore > 70,
      },
    },
  });
});

// GET /api/v1/ai/coaching-tip?exerciseId=squat
aiCoachRouter.get('/coaching-tip', (req, res) => {
  const exerciseId = String(req.query.exerciseId ?? 'default');
  const tips = COACHING_TIPS[exerciseId] ?? COACHING_TIPS['default'];
  const tip = tips[Math.floor(Math.random() * tips.length)];
  res.status(200).json({ success: true, exerciseId, tip });
});
