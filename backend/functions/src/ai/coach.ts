import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyAuth, AuthenticatedRequest } from '../auth';
import { buildAICoachContext } from './contextBuilder';
import { generateAdaptiveWorkout } from './workoutGenerator';
import { getConsistencyInsights } from './insights';

export const aiCoachRouter = Router();

/**
 * 1. Vision -> Backend Endpoint
 * Receives structured results from Python/MediaPipe/OpenCV as defined in Section 6 & 9 of requirements.
 * Payload: { exercise: "squat", reps: 15, score: 86, feedback: "...", errors: [...] }
 */
aiCoachRouter.post('/vision-result', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { exercise, reps, score, feedback, errors, sessionId } = req.body;

    if (!exercise || reps === undefined || score === undefined) {
      return res.status(400).json({ error: 'Missing required vision fields: exercise, reps, score' });
    }

    const visionResultDoc = {
      userId: uid,
      sessionId: sessionId || 'adhoc_camera_session',
      exercise: String(exercise).toLowerCase(),
      reps: Number(reps),
      formScore: Number(score),
      feedback: feedback || 'Good effort!',
      errors: Array.isArray(errors) ? errors : [],
      receivedAt: new Date().toISOString()
    };

    // Store in Firestore vision logs
    const docRef = await db.collection('visionResults').add(visionResultDoc);

    // Generate immediate coaching synthesis
    const coachingTip = score < 80
      ? `AI Coach Note: You completed ${reps} ${exercise}s with a form score of ${score}%. Notice: ${feedback}`
      : `Outstanding form! ${reps} clean reps logged with ${score}% precision. Keep this rhythm.`;

    res.status(200).json({
      success: true,
      data: {
        id: docRef.id,
        ...visionResultDoc,
        coachSynthesis: coachingTip
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. AI Workout Generator Endpoint
 * Generates and validates an adaptive workout based on student constraints
 */
aiCoachRouter.post('/generate-workout', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const workoutPlan = await generateAdaptiveWorkout(uid!);
    res.status(200).json({ success: true, data: workoutPlan });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. AI Consistency Insights Endpoint
 */
aiCoachRouter.get('/insights', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const insights = await getConsistencyInsights(uid!);
    res.status(200).json({ success: true, data: insights });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 4. Controlled Coach Questions Endpoint
 * Allows students to ask questions ("How do I prevent knee pain during squats?", "Is 15 mins enough?")
 */
aiCoachRouter.post('/ask-coach', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Please provide a fitness question.' });
    }

    const context = await buildAICoachContext(uid!);

    // Context-grounded intelligent answer
    const qLower = question.toLowerCase();
    let responseText = '';

    if (qLower.includes('knee') || qLower.includes('pain') || qLower.includes('squat')) {
      responseText = `Based on your recent squat sessions, remember to push your knees outward so they track directly over your second toe, and keep your weight distributed evenly across your feet. Since your current average form score is ${context.averageFormScore}%, focus on controlled tempo rather than rushing reps.`;
    } else if (qLower.includes('time') || qLower.includes('dorm') || qLower.includes('busy')) {
      responseText = `Your current schedule is set to ${context.availableTimeMinutes} minutes. Even a single 10-minute session will preserve your ${context.streak}-day streak and trigger muscle protein synthesis. Quality of movement always beats quantity!`;
    } else {
      responseText = `Great question, ${context.studentName}! For your ${context.goal} goal, consistency is your greatest superpower. Make sure to complete today's recommended routine and allow 48 hours before working the same muscle group at high intensity.`;
    }

    // Save dialogue to coach history
    await db.collection('coachDialogues').add({
      userId: uid,
      question,
      answer: responseText,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      data: {
        question,
        answer: responseText,
        contextSnapshot: {
          streak: context.streak,
          fitnessLevel: context.fitnessLevel,
          goal: context.goal
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
