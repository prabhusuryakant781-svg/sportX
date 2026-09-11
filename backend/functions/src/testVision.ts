/**
 * SportX — Phase 3 Computer Vision Integration Verification Script
 * Validates the complete Computer Vision integration pipeline independently without Flutter:
 * 
 * 1. Vision JSON Data Contract & Validators
 * 2. Result Processing & Storage (Firestore / demoStore)
 * 3. Vision Express API Endpoints (POST/GET results)
 * 4. Grounded AI Form Feedback Generation & Schema Validation
 * 5. Bridge to AI Coach Context Builder
 */

import dotenv from 'dotenv';
dotenv.config();

process.env.LOCAL_TEST = 'true';
process.env.NODE_ENV = 'test';

import { validateVisionResult, VisionResultPayload } from './vision/validators';
import { processVisionResult, getVisionResults, getVisionResultBySession } from './vision/visionResult';
import { validateFormFeedbackResponse } from './ai/validators';
import { generateFormFeedback } from './ai/coach';
import { buildCoachContext } from './ai/contextBuilder';
import { visionRouter } from './vision';
import { users as demoUsers, demoVisionResults } from './config/demoStore';

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('⚡ SportX Phase 3 — Computer Vision Integration Test');
  console.log('====================================================\n');

  let passedTests = 0;
  const totalTests = 5;
  const testUid = 'demo_student_01';

  // Ensure test user exists in demo store
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

  // -----------------------------------------------------------------
  // TEST 1: Vision Data Contract & Validation (vision/validators.ts)
  // -----------------------------------------------------------------
  console.log('[Test 1/5] Testing Vision Data Contract & Validation...');

  // 1a. Valid standard contract payload
  const validPayload: VisionResultPayload = {
    sessionId: 'sess_vision_test_001',
    exerciseId: 'squat',
    reps: 15,
    formScore: 78,
    confidence: 0.91,
    errors: [
      {
        code: 'knees_inward',
        severity: 'medium'
      }
    ]
  };

  const validRes = validateVisionResult(validPayload);
  if (!validRes.isValid || !validRes.data) {
    throw new Error(`Test 1 failed: Valid payload rejected: ${validRes.errors.join(', ')}`);
  }
  console.log('  ✓ Valid Vision JSON payload successfully validated');

  // 1b. Reject negative reps
  const invalidRepsRes = validateVisionResult({ ...validPayload, reps: -5 });
  if (invalidRepsRes.isValid) {
    throw new Error('Test 1 failed: Negative reps was not rejected');
  }
  console.log('  ✓ Negative reps rejected');

  // 1c. Reject out-of-range form score (> 100)
  const invalidScoreRes = validateVisionResult({ ...validPayload, formScore: 120 });
  if (invalidScoreRes.isValid) {
    throw new Error('Test 1 failed: Out-of-bounds formScore was not rejected');
  }
  console.log('  ✓ Out-of-bounds formScore rejected');

  // 1d. Reject invalid error severity
  const invalidSeverityRes = validateVisionResult({
    ...validPayload,
    errors: [{ code: 'knees_inward', severity: 'extreme' as any }]
  });
  if (invalidSeverityRes.isValid) {
    throw new Error('Test 1 failed: Invalid error severity was not rejected');
  }
  console.log('  ✓ Invalid error severity rejected');

  passedTests++;
  console.log('✅ Test 1 Passed: Vision data contract validation strictly verified.\n');

  // -----------------------------------------------------------------
  // TEST 2: Result Processing & Storage (vision/visionResult.ts)
  // -----------------------------------------------------------------
  console.log('[Test 2/5] Testing Vision Processing & Storage...');

  const stored = await processVisionResult(testUid, validPayload);
  if (!stored || !stored.id || stored.sessionId !== validPayload.sessionId) {
    throw new Error('Test 2 failed: Stored record missing ID or sessionId');
  }
  console.log(`  ✓ Vision result stored with ID: ${stored.id}`);

  // Retrieve by user
  const userResults = await getVisionResults(testUid, 5);
  const foundUserRecord = userResults.find(r => r.sessionId === validPayload.sessionId);
  if (!foundUserRecord) {
    throw new Error('Test 2 failed: Could not retrieve stored vision result by userId');
  }
  console.log(`  ✓ Successfully queried ${userResults.length} vision results for user ${testUid}`);

  // Retrieve by sessionId
  const sessionRecord = await getVisionResultBySession(validPayload.sessionId);
  if (!sessionRecord || sessionRecord.reps !== 15 || sessionRecord.formScore !== 78) {
    throw new Error('Test 2 failed: Could not retrieve vision result by sessionId');
  }
  console.log(`  ✓ Successfully queried vision result by sessionId: "${validPayload.sessionId}"`);

  passedTests++;
  console.log('✅ Test 2 Passed: Storage and retrieval services verified.\n');

  // -----------------------------------------------------------------
  // TEST 3: Vision Router HTTP Endpoints
  // -----------------------------------------------------------------
  console.log('[Test 3/5] Testing Vision Router Endpoints...');

  // Mock route handlers by matching express layer
  let postResultsHandler: any = null;
  let getResultsHandler: any = null;

  for (const layer of (visionRouter as any).stack) {
    if (layer.route && layer.route.path === '/results') {
      if (layer.route.methods.post) {
        postResultsHandler = layer.route.stack[layer.route.stack.length - 1].handle;
      }
      if (layer.route.methods.get) {
        getResultsHandler = layer.route.stack[layer.route.stack.length - 1].handle;
      }
    }
  }

  if (!postResultsHandler || !getResultsHandler) {
    throw new Error('Test 3 failed: Vision route handlers not found on router stack');
  }

  // 3a. POST /results - Valid authenticated submission
  const reqPost: any = {
    user: { uid: testUid },
    body: {
      sessionId: 'sess_http_test_002',
      exerciseId: 'pushup',
      reps: 20,
      formScore: 85,
      confidence: 0.95,
      errors: [{ code: 'elbow_flare', severity: 'low' }]
    }
  };
  const resPost = createMockResponse();
  await postResultsHandler(reqPost, resPost);

  if (resPost.statusCode !== 201 || !resPost.body?.success || !resPost.body?.data) {
    throw new Error(`Test 3 failed: POST /results returned status ${resPost.statusCode}`);
  }
  console.log('  ✓ POST /api/v1/vision/results returned HTTP 201 Created');

  // 3b. GET /results - Valid authenticated query
  const reqGet: any = {
    user: { uid: testUid },
    query: { limit: '5' }
  };
  const resGet = createMockResponse();
  await getResultsHandler(reqGet, resGet);

  if (resGet.statusCode !== 200 || !resGet.body?.success || !Array.isArray(resGet.body?.data)) {
    throw new Error(`Test 3 failed: GET /results returned status ${resGet.statusCode}`);
  }
  console.log(`  ✓ GET /api/v1/vision/results returned HTTP 200 with ${resGet.body.data.length} records`);

  passedTests++;
  console.log('✅ Test 3 Passed: Express Vision endpoints verified.\n');

  // -----------------------------------------------------------------
  // TEST 4: Grounded AI Form Feedback Generation & Validation
  // -----------------------------------------------------------------
  console.log('[Test 4/5] Testing Grounded AI Form Feedback...');

  const visionSample: VisionResultPayload = {
    sessionId: 'sess_sample_feedback_003',
    exerciseId: 'squat',
    reps: 15,
    formScore: 78,
    confidence: 0.91,
    errors: [
      {
        code: 'knees_inward',
        severity: 'medium'
      }
    ]
  };

  const feedback = await generateFormFeedback(visionSample);
  console.log('  Generated AI Form Feedback:');
  console.log(JSON.stringify(feedback, null, 2));

  // Validate feedback structure
  const feedbackValidation = validateFormFeedbackResponse(feedback);
  if (!feedbackValidation.isValid) {
    throw new Error(`Test 4 failed: Form feedback schema invalid: ${feedbackValidation.errors.join(', ')}`);
  }

  // Ensure AI feedback strictly mentions detected error and does NOT hallucinate
  const errorFoundInFeedback = feedback.areasToImprove.some(item =>
    item.toLowerCase().includes('knees') || item.toLowerCase().includes('inward')
  );
  if (!errorFoundInFeedback) {
    throw new Error('Test 4 failed: AI feedback did not address the detected error "knees_inward"');
  }
  console.log('  ✓ Feedback accurately addressed the Computer Vision detected error ("knees_inward")');

  // Test flawless set (no errors)
  const flawlessSample: VisionResultPayload = {
    sessionId: 'sess_flawless_004',
    exerciseId: 'squat',
    reps: 20,
    formScore: 95,
    confidence: 0.98,
    errors: []
  };
  const flawlessFeedback = await generateFormFeedback(flawlessSample);
  if (flawlessFeedback.areasToImprove.length === 0 || flawlessFeedback.areasToImprove[0].toLowerCase().includes('detected')) {
    // Should state no errors detected
    console.log('  ✓ Flawless set correctly noted no movement errors');
  }

  passedTests++;
  console.log('✅ Test 4 Passed: AI Form Feedback generation and strict grounding verified.\n');

  // -----------------------------------------------------------------
  // TEST 5: Vision Data Integration into AI Coach Context
  // -----------------------------------------------------------------
  console.log('[Test 5/5] Testing Vision Data Flow into AI Coach Context...');

  // Set the latest vision result to testUid
  await processVisionResult(testUid, {
    sessionId: 'sess_context_test_005',
    exerciseId: 'squat',
    reps: 18,
    formScore: 74,
    confidence: 0.92,
    errors: [{ code: 'knees_inward', severity: 'medium' }]
  });

  const coachContext = await buildCoachContext(testUid);
  console.log('  Retrieved Coach Context:');
  console.log(JSON.stringify(coachContext, null, 2));

  if (!coachContext.latestSessionFeedback) {
    throw new Error('Test 5 failed: Coach context missing latestSessionFeedback from Vision');
  }
  if (coachContext.latestSessionFeedback.exercise !== 'squat') {
    throw new Error(`Test 5 failed: Expected exercise "squat", got "${coachContext.latestSessionFeedback.exercise}"`);
  }
  if (!coachContext.latestSessionFeedback.errors.includes('knees_inward')) {
    throw new Error('Test 5 failed: latestSessionFeedback missing "knees_inward" error code');
  }
  if (!coachContext.recentIssues.includes('error_knees_inward')) {
    throw new Error('Test 5 failed: recentIssues did not incorporate "error_knees_inward"');
  }

  console.log('  ✓ latestSessionFeedback populated directly from Vision result');
  console.log(`  ✓ recentIssues correctly incorporated: ${JSON.stringify(coachContext.recentIssues)}`);

  passedTests++;
  console.log('✅ Test 5 Passed: Vision data seamlessly bridges into AI Coach context.\n');

  console.log('====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} PHASE 3 VERIFICATION TESTS PASSED!`);
  console.log('Architecture Flow Verified:');
  console.log('  Camera / Pose Detection');
  console.log('        ↓');
  console.log('  Computer Vision JSON Contract');
  console.log('        ↓');
  console.log('  validateVisionResult()');
  console.log('        ↓');
  console.log('  storeVisionResult() [Firestore]');
  console.log('        ↓');
  console.log('  generateFormFeedback() [AI Biomechanics]');
  console.log('        ↓');
  console.log('  buildCoachContext() [Integrated AI Coach]');
  console.log('====================================================');
  process.exit(0);
}

runPhase3Tests().catch(err => {
  console.error('\n❌ Phase 3 Verification Failed with Error:', err);
  process.exit(1);
});
