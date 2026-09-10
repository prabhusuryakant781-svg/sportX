/**
 * SportX — Phase 2 AI Coach Verification Script
 * Validates the complete AI Coach flow without depending on the Flutter frontend:
 * 
 * Authenticated Request
 *        ↓
 * Cloud Function (askCoach)
 *        ↓
 * Authentication Check & UID Extraction
 *        ↓
 * contextBuilder (Firestore)
 *        ↓
 * AI Coach & System Instructions
 *        ↓
 * Validator (Structured Schema)
 *        ↓
 * JSON Response to Client
 */

import dotenv from 'dotenv';
dotenv.config();

// Ensure local testing environment flags
process.env.LOCAL_TEST = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

import { buildCoachContext } from './ai/contextBuilder';
import { validateCoachResponse } from './ai/validators';
import { generateCoachResponse } from './ai/coach';
import { askCoachHandler } from './ai/coach';
import { authenticateRequest } from './auth';
import { users as demoUsers, sessions as demoSessions } from './config/demoStore';

// Helper mock response object for simulating Cloud Function HTTP invocations
function createMockResponse() {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    send(data: any) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('⚡ SportX Phase 2 — AI Coach Backend Foundation Test');
  console.log('====================================================\n');

  let passedTests = 0;
  const totalTests = 5;

  // -----------------------------------------------------------------
  // TEST 1: Authentication Handling & UID Extraction
  // -----------------------------------------------------------------
  console.log('[Test 1/5] Testing Authentication Handling...');
  
  // 1a. Unauthenticated request (no Authorization header)
  const unauthReq: any = { headers: {} };
  const unauthUser = await authenticateRequest(unauthReq);
  if (unauthUser === null) {
    console.log('  ✓ Unauthenticated request rejected (null user)');
  } else {
    throw new Error('Test 1 failed: Unauthenticated request was not rejected');
  }

  // 1b. Invalid token
  const invalidReq: any = { headers: { authorization: 'Bearer invalid_random_token_999' } };
  const invalidUser = await authenticateRequest(invalidReq);
  if (invalidUser === null) {
    console.log('  ✓ Invalid bearer token rejected');
  } else {
    throw new Error('Test 1 failed: Invalid bearer token was not rejected');
  }

  // 1c. Valid bearer token
  const validReq: any = { headers: { authorization: 'Bearer demo' } };
  const validUser = await authenticateRequest(validReq);
  if (validUser && validUser.uid === 'demo_student_01') {
    console.log(`  ✓ Valid bearer token authenticated UID: ${validUser.uid}`);
  } else {
    throw new Error('Test 1 failed: Valid token did not return expected user UID');
  }

  passedTests++;
  console.log('✅ Test 1 Passed: Authentication handling is verified.\n');

  // -----------------------------------------------------------------
  // TEST 2: contextBuilder.ts — Clean Scoped Context
  // -----------------------------------------------------------------
  console.log('[Test 2/5] Testing contextBuilder.ts...');
  const testUid = 'demo_student_01';

  // Seed test profile data in demo store if not already set
  demoUsers.set(testUid, {
    id: testUid,
    name: 'Aarav Sharma',
    email: 'aarav@campus.edu',
    password: 'demo',
    collegeName: 'Campus University',
    department: 'Engineering',
    fitnessLevel: 'beginner',
    fitnessGoal: 'strength',
    availableTimeMinutes: 20,
    selectedSports: ['football'],
    totalXp: 450,
    currentStreak: 6,
    longestStreak: 7,
    lastWorkoutDate: new Date().toISOString().split('T')[0],
    createdAt: '2026-09-01T00:00:00.000Z'
  });

  const context = await buildCoachContext(testUid);
  console.log('  Retrieved Context Structure:');
  console.log(JSON.stringify(context, null, 2));

  if (!context.user || !context.user.fitnessLevel || !context.user.goal || !context.user.sport) {
    throw new Error('Test 2 failed: Context missing required user fields (fitnessLevel, goal, sport)');
  }
  if (!context.performance || typeof context.performance.recentWorkouts !== 'number' || typeof context.performance.currentStreak !== 'number') {
    throw new Error('Test 2 failed: Context missing required performance metrics');
  }
  if (!Array.isArray(context.recentIssues)) {
    throw new Error('Test 2 failed: Context missing recentIssues array');
  }

  console.log(`  ✓ contextBuilder gathered user profile: [Level: ${context.user.fitnessLevel}, Goal: ${context.user.goal}, Sport: ${context.user.sport}]`);
  console.log(`  ✓ contextBuilder gathered performance: [Streak: ${context.performance.currentStreak}, Workouts: ${context.performance.recentWorkouts}, AvgScore: ${context.performance.averagePerformance}%]`);

  passedTests++;
  console.log('✅ Test 2 Passed: contextBuilder correctly formats structured context.\n');

  // -----------------------------------------------------------------
  // TEST 3: validators.ts — Strict Response Validation
  // -----------------------------------------------------------------
  console.log('[Test 3/5] Testing Response Validators (ai/validators.ts)...');

  // 3a. Valid response
  const validSample = {
    summary: 'Your consistency is improving, but maintaining regular sessions will accelerate your progress.',
    strengths: ['You have completed several recent workouts.'],
    recommendations: ['Maintain a consistent workout schedule tailored to your routine.'],
    nextFocus: 'consistency'
  };

  const validResult = validateCoachResponse(validSample);
  if (!validResult.isValid || !validResult.data) {
    throw new Error(`Test 3 failed: Valid sample was incorrectly rejected: ${validResult.errors.join(', ')}`);
  }
  console.log('  ✓ Valid structured response successfully passed validation');

  // 3b. Invalid response (missing nextFocus, empty strengths)
  const invalidSample = {
    summary: 'Testing invalid',
    strengths: [],
    recommendations: ['Test recommendation']
    // missing nextFocus
  };

  const invalidResult = validateCoachResponse(invalidSample);
  if (invalidResult.isValid) {
    throw new Error('Test 3 failed: Invalid payload unexpectedly passed validation');
  }
  console.log(`  ✓ Invalid response correctly rejected with errors: ${invalidResult.errors.join('; ')}`);

  passedTests++;
  console.log('✅ Test 3 Passed: Validators strictly enforce the schema contract.\n');

  // -----------------------------------------------------------------
  // TEST 4: generateCoachResponse — Core AI Engine Execution
  // -----------------------------------------------------------------
  console.log('[Test 4/5] Testing AI Coach Logic (ai/coach.ts)...');
  const userQuestion = 'How can I improve my workouts?';

  const coachResponse = await generateCoachResponse(testUid, userQuestion);
  console.log('  Generated AI Coach Response:');
  console.log(JSON.stringify(coachResponse, null, 2));

  if (!coachResponse.summary || !Array.isArray(coachResponse.strengths) || !Array.isArray(coachResponse.recommendations) || !coachResponse.nextFocus) {
    throw new Error('Test 4 failed: generateCoachResponse returned malformed data');
  }

  passedTests++;
  console.log('✅ Test 4 Passed: AI Coach engine generated a verified structured response.\n');

  // -----------------------------------------------------------------
  // TEST 5: askCoach Cloud Function Handler (End-to-End Simulation)
  // -----------------------------------------------------------------
  console.log('[Test 5/5] Testing askCoach Cloud Function Handler (End-to-End)...');

  // 5a. Unauthorized request check
  const reqUnauth: any = {
    method: 'POST',
    headers: {},
    body: { message: 'How can I improve?' }
  };
  const resUnauth = createMockResponse();
  await askCoachHandler(reqUnauth, resUnauth);
  if (resUnauth.statusCode !== 401) {
    throw new Error(`Test 5 failed: Expected status 401 for unauthenticated request, got ${resUnauth.statusCode}`);
  }
  console.log('  ✓ Cloud Function correctly returned HTTP 401 for unauthenticated caller');

  // 5b. Missing question check
  const reqMissingMsg: any = {
    method: 'POST',
    headers: { authorization: 'Bearer demo' },
    body: {}
  };
  const resMissingMsg = createMockResponse();
  await askCoachHandler(reqMissingMsg, resMissingMsg);
  if (resMissingMsg.statusCode !== 400) {
    throw new Error(`Test 5 failed: Expected status 400 for missing message, got ${resMissingMsg.statusCode}`);
  }
  console.log('  ✓ Cloud Function correctly returned HTTP 400 when message is missing');

  // 5c. Valid request with authenticated user
  const reqValid: any = {
    method: 'POST',
    headers: { authorization: 'Bearer demo' },
    body: {
      message: 'How can I improve my workouts?'
    }
  };
  const resValid = createMockResponse();
  await askCoachHandler(reqValid, resValid);

  if (resValid.statusCode !== 200) {
    throw new Error(`Test 5 failed: Expected status 200, got ${resValid.statusCode}: ${JSON.stringify(resValid.body)}`);
  }
  if (!resValid.body?.success || !resValid.body?.data) {
    throw new Error('Test 5 failed: Cloud function did not return success=true and data object');
  }

  console.log('  ✓ Cloud Function returned HTTP 200 with structured payload:');
  console.log(JSON.stringify(resValid.body, null, 2));

  passedTests++;
  console.log('✅ Test 5 Passed: End-to-end askCoach Cloud Function flow verified successfully!\n');

  console.log('====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} PHASE 2 VERIFICATION TESTS PASSED!`);
  console.log('Architecture Flow Verified:');
  console.log('  Client Request');
  console.log('        ↓');
  console.log('  askCoach() Cloud Function');
  console.log('        ↓');
  console.log('  Token Authentication (UID Extract)');
  console.log('        ↓');
  console.log('  buildCoachContext(userId)');
  console.log('        ↓');
  console.log('  AI Coach System Instructions & API');
  console.log('        ↓');
  console.log('  validateCoachResponse()');
  console.log('        ↓');
  console.log('  Structured JSON Response');
  console.log('====================================================');
  process.exit(0);
}

runPhase2Tests().catch(err => {
  console.error('\n❌ Verification Failed with Error:', err);
  process.exit(1);
});

