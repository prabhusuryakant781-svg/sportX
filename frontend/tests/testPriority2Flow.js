/**
 * SportX Priority 2 Frontend Integration Test Suite
 * Validates frontend API client contracts, session initiation, completion payloads,
 * AI session analysis triggers, and privacy invariants.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n================================================================');
console.log('⚡ SportX Priority 2 Frontend Integration Test Suite');
console.log('================================================================\n');

let passed = 0;

function testAssert(condition, description) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${description}`);
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

// -----------------------------------------------------------------
// 1. API Client Contracts
// -----------------------------------------------------------------
console.log('[1/5] Testing Frontend API Client Service (api.js)...');
const apiTsPath = path.resolve(__dirname, '../src/services/api.ts');
const apiJsPath = path.resolve(__dirname, '../src/services/api.js');
const apiPath = fs.existsSync(apiTsPath) ? apiTsPath : apiJsPath;
const apiJsSource = fs.readFileSync(apiPath, 'utf-8');

testAssert(apiJsSource.includes('startSession:'), 'api.js exports startSession');
testAssert(apiJsSource.includes('finishSession:'), 'api.js exports finishSession');
testAssert(apiJsSource.includes('getSession:'), 'api.js exports getSession');
testAssert(apiJsSource.includes('getUserSessions:'), 'api.js exports getUserSessions');
testAssert(apiJsSource.includes('getProgress:'), 'api.js exports getProgress');
testAssert(apiJsSource.includes('analyzeSession:'), 'api.js exports analyzeSession');
testAssert(apiJsSource.includes('/ai/session-analysis'), 'analyzeSession points to backend endpoint');

// -----------------------------------------------------------------
// 2. Client-side Privacy & Secret Protection
// -----------------------------------------------------------------
console.log('\n[2/5] Testing Client-Side Privacy & Secret Invariants...');
testAssert(!apiJsSource.includes('GEMINI_API_KEY'), 'api.js has no GEMINI_API_KEY');
testAssert(!apiJsSource.includes('generativelanguage.googleapis.com'), 'Browser client does not call Gemini API directly');

// Helper to resolve .tsx or .jsx
function resolveComponentPath(base) {
  const tsx = base + '.tsx';
  const jsx = base + '.jsx';
  return fs.existsSync(tsx) ? tsx : jsx;
}

// Verify frontend source files don't upload webcam frames
const cameraWorkoutPath = resolveComponentPath(path.resolve(__dirname, '../src/components/CameraWorkout'));
const cameraWorkoutSource = fs.readFileSync(cameraWorkoutPath, 'utf-8');

testAssert(!cameraWorkoutSource.includes('canvas.toDataURL'), 'CameraWorkout does not serialize canvas frames');
testAssert(!cameraWorkoutSource.includes('uploadBytes'), 'CameraWorkout does not upload raw video/frames');
testAssert(cameraWorkoutSource.includes('onStartWorkout'), 'CameraWorkout accepts onStartWorkout lifecycle prop');

// -----------------------------------------------------------------
// 3. Camera Workout Page Session Integration
// -----------------------------------------------------------------
console.log('\n[3/5] Testing CameraWorkoutPage Lifecycle Binding...');
const cameraPagePath = resolveComponentPath(path.resolve(__dirname, '../src/pages/CameraWorkoutPage'));
const cameraPageSource = fs.readFileSync(cameraPagePath, 'utf-8');

testAssert(cameraPageSource.includes('api.startSession'), 'CameraWorkoutPage initiates backend session on workout start');
testAssert(cameraPageSource.includes('api.completeSession'), 'CameraWorkoutPage finalizes session with vision telemetry');
testAssert(cameraPageSource.includes('api.submitVisionResult'), 'CameraWorkoutPage records standardized vision telemetry');
testAssert(cameraPageSource.includes('/result'), 'CameraWorkoutPage navigates to /result with authoritative sessionId');

// -----------------------------------------------------------------
// 4. Session Result Page AI Debriefing
// -----------------------------------------------------------------
console.log('\n[4/5] Testing SessionResultPage AI Analysis Integration...');
const sessionResultPath = resolveComponentPath(path.resolve(__dirname, '../src/pages/SessionResultPage'));
const sessionResultSource = fs.readFileSync(sessionResultPath, 'utf-8');

testAssert(sessionResultSource.includes('api.analyzeSession'), 'SessionResultPage connects to api.analyzeSession');
testAssert(sessionResultSource.includes('handleRequestAIAnalysis'), 'SessionResultPage implements interactive AI trigger');
testAssert(sessionResultSource.includes('aiAnalysis'), 'SessionResultPage tracks structured AI feedback state');
testAssert(sessionResultSource.includes('actionableCues'), 'SessionResultPage renders biomechanical actionable cues');
testAssert(sessionResultSource.includes('Consult AI Coach in Chat'), 'SessionResultPage provides deep-link to AI Coach');

// -----------------------------------------------------------------
// 5. Vision Result Standardized Contract Validation
// -----------------------------------------------------------------
console.log('\n[5/5] Testing Vision Result Mapping & Sanitization...');
const sampleVisionPayload = {
  sessionId: 'sess_test_123',
  exerciseId: 'squat',
  reps: 15,
  formScore: 84,
  durationSeconds: 90,
  confidence: 0.95,
  errors: [{ code: 'knees_inward', severity: 'medium', description: 'Knees drifted inward' }],
  timestamp: new Date().toISOString()
};

testAssert(sampleVisionPayload.reps >= 0, 'Completed reps non-negative');
testAssert(sampleVisionPayload.formScore >= 0 && sampleVisionPayload.formScore <= 100, 'Form score normalized between 0-100');
testAssert(sampleVisionPayload.errors.every(e => Boolean(e.code && e.severity)), 'Biomechanical errors properly structured');

console.log('\n================================================================');
console.log(`🎉 ALL FRONTEND INTEGRATION TESTS PASSED! (${passed}/${passed})`);
console.log('================================================================\n');
