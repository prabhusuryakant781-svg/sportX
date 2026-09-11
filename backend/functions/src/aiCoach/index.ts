/**
 * AI Coach Tip Routes: GET /ai/coaching-tip
 * Core Features: Exercise Tips & Guidance
 */
import { Router } from 'express';

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


// GET /api/v1/ai/coaching-tip?exerciseId=squat
aiCoachRouter.get('/coaching-tip', (req, res) => {
  const exerciseId = String(req.query.exerciseId ?? 'default');
  const tips = COACHING_TIPS[exerciseId] ?? COACHING_TIPS['default'];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const tipIndex = Math.abs(dayOfYear) % tips.length;
  const tip = tips[tipIndex];
  res.status(200).json({ success: true, exerciseId, tip });
});
