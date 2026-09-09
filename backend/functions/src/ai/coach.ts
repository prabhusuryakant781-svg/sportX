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

import { buildCoachContext, CoachUserContext } from './contextBuilder';
import { validateCoachResponse, AICoachResponse } from './validators';
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
 */
async function callGeminiApi(
  apiKey: string,
  prompt: string,
  model = 'gemini-1.5-flash',
  timeoutMs = 12000
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }]
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      logger.error('[AI Coach] Gemini API error status:', response.status, errorBody);
      throw new Error(`AI service returned status ${response.status}`);
    }

    const data: any = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText || typeof candidateText !== 'string') {
      logger.error('[AI Coach] Empty response candidate from Gemini:', JSON.stringify(data));
      throw new Error('AI service returned an empty response');
    }

    return candidateText;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logger.error('[AI Coach] Gemini API request timed out after', timeoutMs, 'ms');
      throw new Error('AI Coach service request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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
    throw new Error('Invalid request: question or message is required');
  }

  const trimmedMessage = userMessage.trim();
  if (trimmedMessage.length > 500) {
    throw new Error('Invalid request: message exceeds maximum length of 500 characters');
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

  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

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
    logger.error('[AI Coach] GEMINI_API_KEY is not configured on the server');
    throw new Error('AI Coach service is temporarily unavailable (configuration error)');
  }

  const model = options?.model || process.env.AI_MODEL || 'gemini-1.5-flash';
  const timeoutMs = options?.timeoutMs || 12000;

  try {
    rawResponseText = await callGeminiApi(apiKey, prompt, model, timeoutMs);
  } catch (apiError: any) {
    logger.error('[AI Coach] AI API call failure:', apiError.message);
    throw new Error('Failed to communicate with AI Coach service');
  }

  // 4. Parse JSON
  let parsedJson: any;
  try {
    // Strip possible markdown ticks if returned
    const cleanJson = rawResponseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    parsedJson = JSON.parse(cleanJson);
  } catch (parseErr) {
    logger.error('[AI Coach] Failed to parse AI JSON response:', rawResponseText);
    throw new Error('AI service returned a malformed response structure');
  }

  // 5. Validate the structured AI response
  const validation = validateCoachResponse(parsedJson);
  if (!validation.isValid || !validation.data) {
    logger.error('[AI Coach] Response validation failed:', validation.errors, 'Raw:', parsedJson);
    throw new Error('AI response did not satisfy safety and quality constraints');
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
      `Prioritize proper warmup and recovery for ${context.user.sport}.`
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
    res.status(405).json({ success: false, error: 'Method Not Allowed. Please use POST.' });
    return;
  }

  try {
    // 1. Authenticate user securely
    const { authenticateRequest } = await import('../auth');
    const user = await authenticateRequest(req);
    if (!user || !user.uid) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Valid authentication token required to consult SportX AI Coach'
      });
      return;
    }

    // 2. Validate request parameters
    const message = req.body?.message || req.body?.question;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid request: "message" is required and must be a non-empty string'
      });
      return;
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 500) {
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
    logger.error('[askCoachHandler] Error processing request:', err?.message || err);
    res.status(500).json({
      success: false,
      error: 'SportX AI Coach service encountered an error. Please try again shortly.'
    });
  }
}

