/**
 * SportX AI Coach — Main Coach Engine (Phase 2)
 * Orchestrates context building, AI prompt assembly, AI API communication,
 * response validation, and secure execution.
 * 
 * Rules:
 * 1. AI API accessed ONLY from backend (never exposed to client).
 * 2. Strong system instructions enforcing grounding on provided context.
 * 3. Never invent data or claim camera/CV analysis unless supplied.
 * 4. Structured JSON response strictly validated via validators.ts.
 * 5. Handle timeouts, network failures, and parsing errors safely.
 */

import { buildCoachContext, CoachUserContext, buildSessionAnalysisContext, SessionAnalysisContext } from './contextBuilder';
import { validateCoachResponse, AICoachResponse, validateFormFeedbackResponse, AIFormFeedbackResponse } from './validators';
import { VisionResultPayload, validateVisionResult } from '../vision/validators';
import { CoachInsightRepository } from '../repositories/coachInsightRepository';
import { SessionRepository } from '../repositories/sessionRepository';
import { CoachInsightDoc } from '../types';
import * as logger from 'firebase-functions/logger';

export interface CoachGenerationOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  testMockProvider?: (context: CoachUserContext, question: string) => Promise<AICoachResponse>;
}

const SYSTEM_INSTRUCTION = `You are the SportX AI Coach, an expert fitness and athletic performance companion for student athletes.
Your purpose is to provide personalized, encouraging, concise, and actionable guidance based STRICTLY on the user context provided below.

MANDATORY RULES:
1. GROUNDING: Use the supplied user context (fitness level, goals, sport, recent workout count, streak, average performance, recent issues).
2. TRUTHFULNESS: Distinguish between (a) information supplied in the context, (b) general fitness knowledge, and (c) information that is unavailable. NEVER invent or assume facts about the user that were not supplied.
3. NO FALSE CV CLAIMS: NEVER claim that you analyzed camera footage, watched their movement, or detected joint form errors unless such explicit feedback is supplied in the context.
4. MEDICAL SAFETY: You are a fitness coach, NOT a doctor or physical therapist. If the user asks about sharp pain, injury diagnosis, or medical symptoms, clearly and warmly advise them to seek medical evaluation.
5. CONCISE & ACTIONABLE: Keep advice practical, motivating, and immediately applicable to their routine.
6. STRICT JSON: You MUST respond with ONLY a valid JSON object matching this schema:
{
  "summary": "1-2 sentence personalized assessment addressing the user's question and context",
  "strengths": ["1-2 positive observations based on current streak, consistency, or performance"],
  "recommendations": ["1-3 concise, actionable steps to improve"],
  "nextFocus": "A brief specific focus point (e.g., 'consistency', 'progressive overload', 'recovery')"
}
No markdown formatting, no code block backticks, only valid raw JSON.`;

/**
 * Builds the AI prompt combining system rules, user context, and user inquiry.
 */
function buildPrompt(context: CoachUserContext, userMessage: string): string {
  return `=== STUDENT CONTEXT ===
${JSON.stringify(context, null, 2)}

=== STUDENT QUESTION ===
"${userMessage}"

Provide your structured coaching response following the strict JSON schema.`;
}

/**
 * Calls the Google Gemini AI API via secure server-side REST endpoint.
 * Supports auto-fallback across candidate models if Google returns HTTP 404 (model retired/unsupported).
 */
export async function callGeminiApi(
  apiKey: string,
  prompt: string,
  requestedModel = 'gemini-2.5-flash',
  timeoutMs = 10000,
  systemInstructionText = SYSTEM_INSTRUCTION
): Promise<string> {
  const cleanKey = apiKey.trim();
  const cleanRequested = (requestedModel || 'gemini-2.5-flash').trim().replace(/^models\//, '');

  // Ordered list of candidate models to try: user's requested model first, followed by active models
  const candidateModels = Array.from(
    new Set([cleanRequested, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'])
  );

  let lastStatus = 0;
  let lastErrorBody = '';

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 800
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        lastStatus = response.status;
        lastErrorBody = await response.text().catch(() => '');
        const safeErrorBody = lastErrorBody.replace(/key=[^&\s"']+/gi, 'key=[REDACTED]');
        logger.error(`[AI Coach] Gemini API request failed for model "${model}": HTTP status ${response.status}`, safeErrorBody);

        // If model returned 404 (retired or unsupported in project), try next candidate model
        if (response.status === 404 && i < candidateModels.length - 1) {
          logger.info(`[AI Coach] Model "${model}" returned HTTP 404. Trying fallback model "${candidateModels[i + 1]}"...`);
          continue;
        }

        const apiErr: any = new Error(
          response.status === 404
            ? `AI service model "${model}" was not found (status 404). Please verify AI_MODEL in environment settings.`
            : `AI service returned status ${response.status}`
        );
        apiErr.category = 'Gemini API request failure';
        apiErr.statusCode = response.status === 429 ? 429 : 502;
        throw apiErr;
      }

      const data: any = await response.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText || typeof candidateText !== 'string') {
        logger.error('[AI Coach] AI provider initialization failure: Empty response candidate from Gemini');
        const emptyErr: any = new Error('AI service returned an empty response');
        emptyErr.category = 'AI provider initialization failure';
        emptyErr.statusCode = 502;
        throw emptyErr;
      }

      return candidateText;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        logger.error('[AI Coach] Gemini API request failure: Request timed out after', timeoutMs, 'ms');
        const timeoutErr: any = new Error('AI Coach service request timed out');
        timeoutErr.category = 'Gemini API request failure';
        timeoutErr.statusCode = 504;
        throw timeoutErr;
      }
      // If 404 and more models to try, loop continues
      if (lastStatus === 404 && i < candidateModels.length - 1) {
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const finalErr: any = new Error(`AI service returned status ${lastStatus || 404}`);
  finalErr.category = 'Gemini API request failure';
  finalErr.statusCode = 502;
  throw finalErr;
}

/**
 * Generates a structured response from the AI Coach.
 * Flow: Authenticated UID -> contextBuilder -> AI Prompt -> AI API -> Validator -> Structured Data.
 * 
 * @param userId Authenticated user UID
 * @param userMessage User's fitness question or request
 * @param options Optional overrides for API key, model, or test mock
 */
export async function generateCoachResponse(
  userId: string,
  userMessage: string,
  options?: CoachGenerationOptions
): Promise<AICoachResponse> {
  if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    const err: any = new Error('Invalid request: question or message is required');
    err.category = 'Invalid request';
    err.statusCode = 400;
    throw err;
  }

  const trimmedMessage = userMessage.trim();
  if (trimmedMessage.length > 500) {
    const err: any = new Error('Invalid request: message exceeds maximum length of 500 characters');
    err.category = 'Invalid request';
    err.statusCode = 400;
    throw err;
  }

  // 1. Collect relevant user context from Firestore
  const context = await buildCoachContext(userId);

  // 2. Build prompt
  const prompt = buildPrompt(context, trimmedMessage);

  // 3. Obtain AI response (using test mock if provided in testing, or live AI API)
  let rawResponseText = '';

  if (options?.testMockProvider) {
    const mockData = await options.testMockProvider(context, trimmedMessage);
    const validation = validateCoachResponse(mockData);
    if (!validation.isValid || !validation.data) {
      throw new Error(`Validation failed for test mock: ${validation.errors.join(', ')}`);
    }
    return validation.data;
  }

  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    // If running in local test mode without a real API key configured, use safe test generator
    if (process.env.NODE_ENV === 'test' || process.env.LOCAL_TEST === 'true') {
      logger.info('[AI Coach] Running in local test mode with simulated AI provider');
      const fallbackResponse = generateLocalTestResponse(context, trimmedMessage);
      const validation = validateCoachResponse(fallbackResponse);
      if (validation.isValid && validation.data) {
        return validation.data;
      }
    }
    logger.error('[AI Coach] Missing environment variable: GEMINI_API_KEY is not configured on the server');
    const configErr: any = new Error('SportX AI Coach is temporarily unavailable: GEMINI_API_KEY is not configured on the server.');
    configErr.category = 'Missing environment variable';
    configErr.statusCode = 503;
    throw configErr;
  }

  const model = options?.model || process.env.AI_MODEL || 'gemini-2.5-flash';
  const timeoutMs = options?.timeoutMs || 10000;

  try {
    rawResponseText = await callGeminiApi(apiKey, prompt, model, timeoutMs);
  } catch (apiError: any) {
    if (!apiError.category) {
      apiError.category = 'Gemini API request failure';
      apiError.statusCode = apiError.statusCode || 502;
    }
    throw apiError;
  }

  // 4. Parse JSON
  let parsedJson: any;
  try {
    // Strip possible markdown ticks if returned
    const cleanJson = rawResponseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    parsedJson = JSON.parse(cleanJson);
  } catch (parseErr) {
    logger.error('[AI Coach] AI provider initialization failure: Failed to parse AI JSON response');
    const malformedErr: any = new Error('AI service returned a malformed response structure');
    malformedErr.category = 'AI provider initialization failure';
    malformedErr.statusCode = 502;
    throw malformedErr;
  }

  // 5. Validate the structured AI response
  const validation = validateCoachResponse(parsedJson);
  if (!validation.isValid || !validation.data) {
    logger.error('[AI Coach] AI provider initialization failure: Response validation failed:', validation.errors);
    const valErr: any = new Error('AI response did not satisfy safety and quality constraints');
    valErr.category = 'AI provider initialization failure';
    valErr.statusCode = 502;
    throw valErr;
  }

  return validation.data;
}

/**
 * Deterministic local test response generator adhering to strict schema
 * Used during automated local tests when no live internet key is provided.
 */
function generateLocalTestResponse(context: CoachUserContext, question: string): AICoachResponse {
  const isConsistencyIssue = context.performance.currentStreak < 3 || context.recentIssues.includes('low_consistency');
  const userGoal = context.user.goal || 'fitness';
  const sport = context.user.sport || 'general_fitness';
  const formIssue = context.recentIssues.find(i => i.startsWith('error_'));
  const qLower = question.toLowerCase();

  // 1. Performance decreasing
  if (qLower.includes('decreas') || qLower.includes('drop') || qLower.includes('worse') || qLower.includes('tired')) {
    return {
      summary: `A temporary dip in performance often stems from accumulated fatigue or inadequate recovery. Your current average is ${context.performance.averagePerformance}%.`,
      strengths: [
        `You have stayed engaged with ${context.performance.recentWorkouts} recent sessions.`,
        `Maintaining a ${context.performance.currentStreak}-day streak demonstrates determination.`
      ],
      recommendations: [
        'Prioritize 7-8 hours of sleep and adequate hydration between hard training sessions.',
        'Incorporate a light mobility or active recovery day before your next intense workout.',
        'Focus on controlled tempo and form precision rather than pushing max volume.'
      ],
      nextFocus: 'recovery & form control'
    };
  }

  // 2. What should I focus on
  if (qLower.includes('focus') || qLower.includes('priority')) {
    const focusTarget = formIssue
      ? formIssue.replace('error_', '').replace(/_/g, ' ')
      : (isConsistencyIssue ? 'workout consistency' : 'progressive overload');

    return {
      summary: `Based on your recent performance, your highest-leverage focus area is ${focusTarget}.`,
      strengths: [
        `You have built momentum toward your ${userGoal} goal.`,
        context.performance.averagePerformance >= 80 ? 'Solid baseline movement technique.' : 'Committed to athletic growth.'
      ],
      recommendations: [
        formIssue ? `Address ${focusTarget} during warmups and working sets.` : 'Target 3 structured sessions per week.',
        `Tailor movement patterns to support your athletic progress in ${sport}.`
      ],
      nextFocus: focusTarget
    };
  }

  // 3. What should I do today
  if (qLower.includes('today') || qLower.includes('now') || qLower.includes('plan')) {
    return {
      summary: `For today, an adaptive ${sport}-focused ${userGoal} session targeting 20-30 minutes is optimal.`,
      strengths: [
        `Active streak: ${context.performance.currentStreak} days.`,
        `Recent workouts logged: ${context.performance.recentWorkouts}.`
      ],
      recommendations: [
        `Perform 3 sets of compound movements (squats, push-ups) tailored for ${sport}.`,
        'Keep rest intervals between 30-45 seconds to elevate cardiovascular conditioning.'
      ],
      nextFocus: 'session completion'
    };
  }

  // 4. How should I train
  if (qLower.includes('train') || qLower.includes('schedule')) {
    return {
      summary: `For a ${context.user.fitnessLevel} athlete targeting ${userGoal} in ${sport}, structured undulating periodization works best.`,
      strengths: [
        `Clear commitment to ${userGoal}.`,
        `Current streak is active at ${context.performance.currentStreak} days.`
      ],
      recommendations: [
        'Train 3-4 days per week alternating between strength and sports-specific conditioning.',
        'Always include 3-5 minutes of dynamic joint warmup prior to heavy movement.'
      ],
      nextFocus: 'training split structure'
    };
  }

  // 5. Default "How can I improve?"
  return {
    summary: isConsistencyIssue
      ? `Your consistency is improving, but maintaining regular sessions will accelerate your ${userGoal} progress.`
      : `Great momentum with a ${context.performance.currentStreak}-day streak towards your ${userGoal} goal.`,
    strengths: [
      context.performance.recentWorkouts > 0
        ? `You have completed ${context.performance.recentWorkouts} recent workout sessions.`
        : 'You are taking the initiative to plan and improve your fitness.'
    ],
    recommendations: [
      'Maintain a consistent workout schedule tailored to your daily routine.',
      `Prioritize proper warmup and recovery for ${sport}.`,
      formIssue ? `Keep working on correcting ${formIssue.replace('error_', '').replace(/_/g, ' ')}.` : 'Gradually increase rep volume across sets.'
    ],
    nextFocus: isConsistencyIssue ? 'consistency' : 'progressive overload'
  };
}

/**
 * Main Cloud Function Request Handler for askCoach.
 * Securely authenticates request, gathers context, invokes AI coach, validates, and responds.
 */
export async function askCoachHandler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    logger.warn(`[AI Coach] Invalid request: Method ${req.method} not allowed`);
    res.status(405).json({ success: false, error: 'Method Not Allowed. Please use POST.' });
    return;
  }

  try {
    // 1. Authenticate user securely
    const { authenticateRequest } = await import('../auth');
    const user = await authenticateRequest(req);
    if (!user || !user.uid) {
      logger.warn('[AI Coach] Firebase authentication failure: Missing or invalid bearer token');
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Valid authentication token required to consult SportX AI Coach'
      });
      return;
    }

    // 2. Validate request parameters safely across object, string, or buffer formats
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // keep as is
      }
    }

    const message = body?.message || body?.question;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      logger.warn('[AI Coach] Invalid request: "message" parameter is required');
      res.status(400).json({
        success: false,
        error: 'Invalid request: "message" is required and must be a non-empty string'
      });
      return;
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 500) {
      logger.warn('[AI Coach] Invalid request: "message" parameter exceeds 500 characters');
      res.status(400).json({
        success: false,
        error: 'Invalid request: "message" exceeds maximum length of 500 characters'
      });
      return;
    }

    // 3. Security: enforce server-authenticated UID (never trust client-supplied userId)
    const authenticatedUid = user.uid;

    // 4. Generate structured response
    const coachResponse = await generateCoachResponse(authenticatedUid, trimmedMessage);

    // 5. Return validated JSON response
    res.status(200).json({
      success: true,
      data: coachResponse,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const category = err?.category || 'Unexpected server error';
    const statusCode = err?.statusCode || 500;
    logger.error(`[AI Coach] ${category}:`, err?.message || err);

    res.status(statusCode).json({
      success: false,
      error: err?.message || 'SportX AI Coach service encountered an error. Please try again shortly.'
    });
  }
}

// ── Phase 3: AI Form Feedback ──────────────────────────────────────────────────

const FORM_FEEDBACK_SYSTEM_INSTRUCTION = `You are the SportX AI Biomechanics Coach.
You provide post-set exercise form feedback to student athletes based SOLELY on Computer Vision analysis data provided to you.

MANDATORY RULES:
1. GROUNDING ON VISION DATA: Evaluate performance based strictly on the provided exercise, rep count, form score, and detected errors.
2. ABSOLUTE TRUTHFULNESS — NEVER HALLUCINATE ERRORS:
   - You must ONLY discuss movement errors that are explicitly listed in the Vision data errors array.
   - If the errors array is empty, celebrate their clean form and do NOT invent any biomechanical flaws.
   - NEVER claim that you "watched" them through a camera yourself; attribute the detection to the SportX Computer Vision pose engine.
3. CLEAR RECOVERY & CUES:
   - Explain what was done well (based on reps, consistency, form score).
   - For each detected error, explain what went wrong and provide 1-2 actionable biomechanical cues to correct it.
4. STRICT JSON SCHEMA: You MUST output ONLY valid JSON matching this schema:
{
  "summary": "1-2 sentence overall evaluation of the set",
  "doneWell": ["1-2 positive points about reps, tempo, or form score"],
  "areasToImprove": ["Specific issues detected by Computer Vision, or 'None detected' if flawless"],
  "actionableCues": ["1-3 direct cues to fix the detected error(s)"],
  "nextFocus": "Key cue or focus for the next set"
}
No markdown backticks, no code block delimiters, only raw valid JSON.`;

/**
 * Standard athletic cues for common biomechanical errors
 */
function getActionableCue(exerciseId: string, errorCode: string): string {
  const code = errorCode.toLowerCase();
  if (code.includes('knees_inward')) return 'Drive your knees outward over your second toe during both descent and ascent.';
  if (code.includes('shallow_depth')) return 'Descend until thighs are at least parallel to the floor before driving up.';
  if (code.includes('hip_sag')) return 'Brace your abdominal wall and squeeze glutes to keep hips in a straight line.';
  if (code.includes('elbow_flare')) return 'Tuck elbows to roughly 45 degrees from your torso to protect the shoulder capsule.';
  if (code.includes('chest_collapse')) return 'Keep chest lifted and shoulders retracted throughout the rep.';
  if (code.includes('heels_lifting')) return 'Root all three points of your foot into the ground, distributing weight into midfoot and heel.';
  if (code.includes('elbow_sway')) return 'Pin elbows securely to your ribs; eliminate torso momentum.';
  return `Focus on controlled tempo and form alignment for ${exerciseId.replace(/_/g, ' ')}.`;
}

function generateLocalFormFeedback(visionData: VisionResultPayload): AIFormFeedbackResponse {
  const errorCodes = (visionData.errors || []).map(e => (typeof e === 'string' ? e : e.code));
  const hasErrors = errorCodes.length > 0;

  return {
    summary: hasErrors
      ? `Completed ${visionData.reps} reps of ${visionData.exerciseId} with a form score of ${visionData.formScore}%. Targeted corrections will elevate your efficiency.`
      : `Outstanding form! Completed ${visionData.reps} clean reps of ${visionData.exerciseId} with a ${visionData.formScore}% form score.`,
    doneWell: [
      `Completed all ${visionData.reps} repetitions with consistent rhythm.`,
      visionData.formScore >= 80 ? 'Maintained strong overall alignment.' : 'Finished the full target set with determination.'
    ],
    areasToImprove: hasErrors
      ? errorCodes.map(c => `Detected ${c.replace(/_/g, ' ')} during movement execution.`)
      : ['No significant form breakdown detected during this set.'],
    actionableCues: hasErrors
      ? errorCodes.map(c => getActionableCue(visionData.exerciseId, c))
      : ['Continue maintaining smooth eccentric control on each repetition.'],
    nextFocus: hasErrors ? errorCodes[0].replace(/_/g, ' ') : 'tempo control'
  };
}

/**
 * Generates structured AI form feedback from a validated Vision Result.
 */
export async function generateFormFeedback(
  visionData: VisionResultPayload,
  options?: CoachGenerationOptions
): Promise<AIFormFeedbackResponse> {
  const validation = validateVisionResult(visionData);
  if (!validation.isValid || !validation.data) {
    const err: any = new Error(`Invalid vision data for feedback: ${validation.errors.join('; ')}`);
    err.statusCode = 400;
    throw err;
  }

  const cleanData = validation.data;
  const prompt = `=== COMPUTER VISION ANALYSIS RESULT ===
Exercise: ${cleanData.exerciseId}
Reps Counted: ${cleanData.reps}
Form Score: ${cleanData.formScore}%
Confidence: ${cleanData.confidence}
Detected Errors: ${JSON.stringify(cleanData.errors, null, 2)}

Generate structured form feedback following the strict JSON schema. Remember: ONLY mention the errors explicitly listed above.`;

  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'test' || process.env.LOCAL_TEST === 'true') {
      logger.info('[AI Form Feedback] Running in local test mode with simulated AI feedback');
      const localFeedback = generateLocalFormFeedback(cleanData);
      const val = validateFormFeedbackResponse(localFeedback);
      if (val.isValid && val.data) return val.data;
    }
    const configErr: any = new Error('SportX AI Form Feedback is temporarily unavailable: GEMINI_API_KEY is not configured.');
    configErr.statusCode = 503;
    throw configErr;
  }

  const model = options?.model || process.env.AI_MODEL || 'gemini-2.5-flash';
  const timeoutMs = options?.timeoutMs || 10000;

  const rawText = await callGeminiApi(apiKey, prompt, model, timeoutMs, FORM_FEEDBACK_SYSTEM_INSTRUCTION);

  let parsed: any;
  try {
    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = JSON.parse(cleanJson);
  } catch (pErr) {
    logger.error('[AI Form Feedback] Failed to parse AI JSON response:', rawText);
    const malformedErr: any = new Error('AI service returned a malformed form feedback response');
    malformedErr.statusCode = 502;
    throw malformedErr;
  }

  const result = validateFormFeedbackResponse(parsed);
  if (!result.isValid || !result.data) {
    logger.error('[AI Form Feedback] Validation failed on AI response:', result.errors);
    const valErr: any = new Error('AI form feedback response failed safety and quality validation');
    valErr.statusCode = 502;
    throw valErr;
  }

  return result.data;
}

/**
 * Cloud Function / Express Handler for POST /api/v1/vision/feedback
 */
export async function generateFormFeedbackHandler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed. Please use POST.' });
    return;
  }

  try {
    const { authenticateRequest } = await import('../auth');
    const user = await authenticateRequest(req);
    if (!user || !user.uid) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      return;
    }

    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {}
    }

    // Support either providing a direct vision payload or a sessionId to look up
    let visionData: VisionResultPayload | null = null;

    if (payload?.sessionId && !payload?.exerciseId) {
      const { getVisionResultBySession } = await import('../vision/visionResult');
      visionData = await getVisionResultBySession(payload.sessionId);
      if (!visionData) {
        res.status(404).json({ success: false, error: `No vision result found for sessionId "${payload.sessionId}"` });
        return;
      }
    } else {
      visionData = payload;
    }

    if (!visionData) {
      res.status(400).json({ success: false, error: 'Vision result payload or valid sessionId is required' });
      return;
    }

    const feedback = await generateFormFeedback(visionData);

    res.status(200).json({
      success: true,
      data: feedback,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    logger.error('[AI Form Feedback] Handler error:', err?.message || err);
    res.status(err?.statusCode || 500).json({
      success: false,
      error: err?.message || 'Failed to generate form feedback'
    });
  }
}

// ── Phase 2: Post-Workout Session Analysis ─────────────────────────────────────

const POST_WORKOUT_SYSTEM_INSTRUCTION = `You are the SportX Senior Athletic Performance AI Coach.
You provide post-workout evaluations to student athletes based STRICTLY on authoritative session telemetry and Computer Vision data.

MANDATORY RULES:
1. GROUNDING: Base your evaluation strictly on the provided workout metrics (exercise, reps, form score, duration, detected errors, personal records).
2. TRUTHFULNESS: NEVER fabricate facts or pretend to have watched video frames. Acknowledge the SportX Vision pose engine for detected movement metrics.
3. CONSTRUCTIVE & ACTIONABLE: Highlight what was done well (volume, consistency, form score), clearly address any detected errors with concrete biomechanical cues, and define a single primary next focus.
4. STRICT JSON SCHEMA: You MUST respond ONLY with valid JSON matching this schema:
{
  "summary": "1-2 sentence overall evaluation of completed workout session",
  "doneWell": ["1-2 positive points about reps, tempo, form score, or personal records"],
  "areasToImprove": ["Specific biomechanical issues detected or 'Clean form throughout'"],
  "actionableCues": ["1-3 direct cues to improve in subsequent sessions"],
  "nextFocus": "Primary focus keyword"
}
No markdown backticks, no code block fences, only valid raw JSON.`;

/**
 * Analyzes a completed workout session with Gemini, using authoritative Firestore session and vision data.
 * Saves result in coachInsights collection and links back to the workout session.
 */
export async function analyzeSessionWithAI(
  userId: string,
  sessionId: string,
  options?: CoachGenerationOptions
): Promise<CoachInsightDoc> {
  if (!sessionId || typeof sessionId !== 'string') {
    const err: any = new Error('Field "sessionId" is required');
    err.statusCode = 400;
    throw err;
  }

  // 1. Check if insight already generated for this session (idempotency)
  const existingInsight = await CoachInsightRepository.getBySessionId(sessionId);
  if (existingInsight && existingInsight.userId === userId) {
    logger.info(`[AI Session Analysis] Returning cached insight for session ${sessionId}`);
    return existingInsight;
  }

  // 2. Build authoritative session context
  const context = await buildSessionAnalysisContext(userId, sessionId);

  // 3. Assemble prompt
  const prompt = `=== AUTHORITATIVE WORKOUT SESSION DATA ===
Exercise: ${context.exerciseName} (${context.exerciseId})
Total Reps: ${context.reps}
Duration: ${context.durationSeconds} seconds
Average Form Score: ${context.formScore}%
Detected Errors: ${JSON.stringify(context.detectedErrors)}
Personal Record for Exercise: ${context.personalRecordReps} reps
Previous Average Form Score: ${context.previousAverageFormScore}%
User Goal: ${context.userGoal}
Sport: ${context.sport}
Fitness Level: ${context.fitnessLevel}

Evaluate this completed session. Highlight what was done well, address detected errors with actionable biomechanical cues, and provide a clear next focus. Follow the strict JSON schema.`;

  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY || process.env.GOOGLE_API_KEY;

  let feedback: AIFormFeedbackResponse;

  if (!apiKey || process.env.NODE_ENV === 'test' || process.env.LOCAL_TEST === 'true') {
    // Local deterministic generator
    const hasErrors = context.detectedErrors.length > 0;
    const isPR = context.reps >= context.personalRecordReps && context.reps > 0;

    feedback = {
      summary: hasErrors
        ? `Completed ${context.reps} reps of ${context.exerciseName} with an average form score of ${context.formScore}%. Targeted biomechanical adjustments will improve your movement efficiency.`
        : `Outstanding workout! Completed ${context.reps} reps of ${context.exerciseName} with strong ${context.formScore}% form consistency.`,
      doneWell: [
        isPR ? `Hit a personal record of ${context.reps} reps!` : `Completed all ${context.reps} reps with dedicated effort.`,
        context.formScore >= 80 ? 'Maintained solid postural alignment throughout the session.' : 'Pushed through the working set with determination.'
      ],
      areasToImprove: hasErrors
        ? context.detectedErrors.map(e => `Detected ${e.replace(/_/g, ' ')} during movement execution.`)
        : ['Maintained consistent form through the entire set.'],
      actionableCues: hasErrors
        ? context.detectedErrors.map(e => getActionableCue(context.exerciseId, e))
        : ['Continue progressive overload by gradually increasing tempo control or reps.'],
      nextFocus: hasErrors ? context.detectedErrors[0].replace(/_/g, ' ') : 'progressive overload'
    };
  } else {
    const model = options?.model || process.env.AI_MODEL || 'gemini-2.5-flash';
    const timeoutMs = options?.timeoutMs || 10000;

    const rawText = await callGeminiApi(apiKey, prompt, model, timeoutMs, POST_WORKOUT_SYSTEM_INSTRUCTION);
    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      logger.error('[AI Session Analysis] Malformed JSON from Gemini:', rawText);
      const malformedErr: any = new Error('AI service returned a malformed response');
      malformedErr.statusCode = 502;
      throw malformedErr;
    }

    const validation = validateFormFeedbackResponse(parsed);
    if (!validation.isValid || !validation.data) {
      logger.error('[AI Session Analysis] Validation failed on Gemini response:', validation.errors);
      const valErr: any = new Error('AI session analysis response failed validation');
      valErr.statusCode = 502;
      throw valErr;
    }
    feedback = validation.data;
  }

  // 4. Save to coachInsights collection
  const insightId = `insight_${sessionId}_${Date.now()}`;
  const insightDoc: CoachInsightDoc = {
    insightId,
    userId,
    type: 'post_workout_analysis',
    sourceSessionId: sessionId,
    exerciseId: context.exerciseId,
    summary: feedback.summary,
    doneWell: feedback.doneWell,
    areasToImprove: feedback.areasToImprove,
    actionableCues: feedback.actionableCues,
    nextFocus: feedback.nextFocus,
    confidence: 0.95,
    createdAt: new Date().toISOString()
  };

  await CoachInsightRepository.create(insightDoc);

  // 5. Enrich workoutSessions/{sessionId} with aiAnalysis
  await SessionRepository.update(sessionId, {
    aiAnalysis: {
      insightId,
      summary: feedback.summary,
      nextFocus: feedback.nextFocus,
      analyzedAt: new Date().toISOString()
    }
  }).catch(() => {});

  return insightDoc;
}

/**
 * Cloud Function / Express Handler for POST /api/v1/ai/session-analysis
 */
export async function sessionAnalysisHandler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed. Please use POST.' });
    return;
  }

  try {
    const { authenticateRequest } = await import('../auth');
    const user = await authenticateRequest(req);
    if (!user || !user.uid) {
      res.status(401).json({ success: false, error: 'Unauthorized: Valid authentication required.' });
      return;
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }

    const sessionId = body?.sessionId || req.params?.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ success: false, error: 'Field "sessionId" is required' });
      return;
    }

    const insight = await analyzeSessionWithAI(user.uid, sessionId);

    res.status(200).json({
      success: true,
      data: insight,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    logger.error('[AI Session Analysis] Handler error:', err?.message || err);
    res.status(err?.statusCode || 500).json({
      success: false,
      error: err?.message || 'Failed to generate session analysis'
    });
  }
}



