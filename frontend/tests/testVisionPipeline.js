/**
 * SportX Edge Vision Pipeline — Deterministic Unit Tests
 * 
 * Verifies:
 * 1. MediaPipe landmark adapter & anatomical mapping integrity
 * 2. Normalized coordinate conversion to canvas coordinates
 * 3. Outlier rejection & exponential moving average (EMA) smoothing
 * 4. Confidence validation for exercise-critical joints
 * 5. Deterministic Squat FSM rep detection (UP -> DESC -> BOTTOM -> ASC -> UP)
 * 6. Deterministic Pushup FSM rep detection (PLANK -> DESC -> INFLECTION -> ASC -> PLANK)
 * 7. Deterministic Jumping Jacks FSM rep detection (NEUTRAL -> EXTENDED -> NEUTRAL)
 */

import {
  mapPoseLandmarksToSportX,
  applyPoseSmoothing,
  filterOutliers,
  validatePoseConfidence,
  MEDIAPIPE_SPORTX_MAPPING
} from '../src/utils/mediapipeLandmarks.js';
import { calculateAngle, validateCameraPositioning } from '../src/utils/poseMath.ts';
import { RepCounterFSM } from '../src/utils/repCounterFSM.ts';
import { normalizeExerciseId, getPlanId, getExerciseId, buildCameraRoute } from '../src/utils/exerciseUtils.ts';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✓ ${message}`);
}

console.log('\n🏃 Running SportX Vision Pipeline Test Suite...\n');

// -------------------------------------------------------------
// Test Group 1: MediaPipe Landmark Adapter & Mapping
// -------------------------------------------------------------
console.log('--- Test Group 1: MediaPipe Landmark Adapter ---');

// Generate mock 33-point raw MediaPipe normalized landmarks
function createMockMediaPipeLandmarks() {
  const landmarks = [];
  for (let i = 0; i < 33; i++) {
    landmarks.push({
      x: 0.5,
      y: 0.5,
      z: 0.0,
      visibility: 0.95,
      presence: 0.95
    });
  }

  // Set distinct values for critical landmarks
  landmarks[0] = { x: 0.50, y: 0.15, z: 0.0, visibility: 0.99 }; // nose -> head
  landmarks[11] = { x: 0.40, y: 0.25, z: -0.1, visibility: 0.92 }; // left_shoulder
  landmarks[12] = { x: 0.60, y: 0.25, z: -0.1, visibility: 0.92 }; // right_shoulder
  landmarks[13] = { x: 0.35, y: 0.40, z: -0.05, visibility: 0.90 }; // left_elbow
  landmarks[14] = { x: 0.65, y: 0.40, z: -0.05, visibility: 0.90 }; // right_elbow
  landmarks[15] = { x: 0.30, y: 0.55, z: 0.0, visibility: 0.88 }; // left_wrist
  landmarks[16] = { x: 0.70, y: 0.55, z: 0.0, visibility: 0.88 }; // right_wrist
  landmarks[23] = { x: 0.42, y: 0.55, z: 0.0, visibility: 0.94 }; // left_hip
  landmarks[24] = { x: 0.58, y: 0.55, z: 0.0, visibility: 0.94 }; // right_hip
  landmarks[25] = { x: 0.41, y: 0.75, z: 0.1, visibility: 0.93 }; // left_knee
  landmarks[26] = { x: 0.59, y: 0.75, z: 0.1, visibility: 0.93 }; // right_knee
  landmarks[27] = { x: 0.40, y: 0.92, z: 0.2, visibility: 0.91 }; // left_ankle
  landmarks[28] = { x: 0.60, y: 0.92, z: 0.2, visibility: 0.91 }; // right_ankle

  return landmarks;
}

const mockRaw = createMockMediaPipeLandmarks();
const sportxMap = mapPoseLandmarksToSportX(mockRaw, 640, 480);

assert(sportxMap !== null, 'Adapter returns non-null map');
assert(Object.keys(sportxMap).length === 13, 'Contains all 13 SportX anatomical keypoints');
assert(sportxMap.head.x === 320 && sportxMap.head.y === 72, 'Converts normalized coordinates to 640x480 canvas pixels (head)');
assert(sportxMap.shoulder_l.x === 256 && sportxMap.shoulder_r.x === 384, 'Preserves anatomical left vs right horizontal orientation');
assert(sportxMap.shoulder_l.score === 0.92, 'Preserves visibility score');

// -------------------------------------------------------------
// Test Group 2: Temporal Smoothing & Outlier Protection
// -------------------------------------------------------------
console.log('\n--- Test Group 2: Temporal Smoothing & Outliers ---');

const frame1 = {
  knee_l: { name: 'knee_l', x: 260, y: 360, z: 0, score: 0.9 }
};
const frame2 = {
  knee_l: { name: 'knee_l', x: 280, y: 380, z: 0, score: 0.9 }
};

// EMA with alpha = 0.5: 0.5 * 280 + 0.5 * 260 = 270
const smoothed = applyPoseSmoothing(frame2, frame1, 0.5);
assert(smoothed.knee_l.x === 270 && smoothed.knee_l.y === 370, 'EMA correctly smooths coordinate changes between frames');

// Outlier detection: sudden jump of 400px in single frame should be rejected
const teleportFrame = {
  knee_l: { name: 'knee_l', x: 600, y: 10, z: 0, score: 0.9 }
};
const filtered = filterOutliers(teleportFrame, frame1, 640, 480);
assert(filtered.knee_l.x === 260 && filtered.knee_l.y === 360, 'Outlier filter rejects physically impossible teleport jumps');

// Confidence validation
const confidentCheck = validatePoseConfidence(sportxMap, 'squat', 0.5);
assert(confidentCheck.isValid === true, 'Validates full confidence when all joints are visible');

const degradedMap = { ...sportxMap, knee_l: { ...sportxMap.knee_l, score: 0.2 } };
const degradedCheck = validatePoseConfidence(degradedMap, 'squat', 0.5);
assert(degradedCheck.isValid === false && degradedCheck.missingJoints.includes('knee_l'), 'Detects low-confidence critical joints');

// -------------------------------------------------------------
// Test Group 3: Deterministic Squat FSM Verification
// -------------------------------------------------------------
console.log('\n--- Test Group 3: Deterministic Squat FSM ---');

const squatFsm = new RepCounterFSM('squat');
assert(squatFsm.state === 'UP', 'Squat FSM begins in UP state');

function createSquatFrame(kneeAngle) {
  // Fix hip at (270, 260), knee at (270, 360).
  // Ankle position determined by knee angle:
  // Upright (170°): ankle roughly straight down at (270, 460)
  // Deep squat (85°): knee bends forward/shin angles
  const rad = (kneeAngle * Math.PI) / 180;
  return {
    hip_l: { name: 'hip_l', x: 270, y: 260, score: 0.95 },
    hip_r: { name: 'hip_r', x: 370, y: 260, score: 0.95 },
    knee_l: { name: 'knee_l', x: 270, y: 360, score: 0.95 },
    knee_r: { name: 'knee_r', x: 370, y: 360, score: 0.95 },
    ankle_l: { name: 'ankle_l', x: 270 + Math.sin(Math.PI - rad) * 100, y: 360 + Math.cos(Math.PI - rad) * 100, score: 0.95 },
    ankle_r: { name: 'ankle_r', x: 370 + Math.sin(Math.PI - rad) * 100, y: 360 + Math.cos(Math.PI - rad) * 100, score: 0.95 },
    shoulder_l: { name: 'shoulder_l', x: 260, y: 150, score: 0.95 },
    shoulder_r: { name: 'shoulder_r', x: 380, y: 150, score: 0.95 },
  };
}

// 1. Standing upright (170°)
squatFsm.processFrame(createSquatFrame(170));
assert(squatFsm.state === 'UP', 'Phase 1: Standing tall -> UP');

// 2. Descending (knee angle reaches 130°)
squatFsm.processFrame(createSquatFrame(130));
assert(squatFsm.state === 'DESCENDING', 'Phase 2: Knee bends < 150° -> DESCENDING');

// 3. Reaches full depth (knee angle reaches 90° <= 95°)
squatFsm.processFrame(createSquatFrame(90));
assert(squatFsm.state === 'BOTTOM', 'Phase 3: Knee angle <= 95° -> BOTTOM');

// 4. Ascending out of the hole (knee angle rises to 125°)
squatFsm.processFrame(createSquatFrame(125));
assert(squatFsm.state === 'ASCENDING', 'Phase 4: Knee angle > 105° -> ASCENDING');

// 5. Standing tall lockout (knee angle reaches 165° >= 160°)
const squatResult = squatFsm.processFrame(createSquatFrame(165));
assert(squatFsm.state === 'UP', 'Phase 5: Lockout at top -> UP');
assert(squatResult.reps === 1, 'Squat Rep successfully counted: reps === 1');
assert(squatResult.validFormReps === 1, 'Valid form rep awarded for reaching <= 95° depth');
assert(squatResult.formScore === 100, 'Form score is 100 for deep clean squat');

// -------------------------------------------------------------
// Test Group 4: Deterministic Pushup FSM Verification
// -------------------------------------------------------------
console.log('\n--- Test Group 4: Deterministic Pushup FSM ---');

const pushupFsm = new RepCounterFSM('pushup');
assert(pushupFsm.state === 'PLANK', 'Pushup FSM begins in PLANK state');

function createPushupFrame(elbowAngle) {
  const rad = (elbowAngle * Math.PI) / 180;
  return {
    shoulder_l: { name: 'shoulder_l', x: 200, y: 200, score: 0.95 },
    shoulder_r: { name: 'shoulder_r', x: 200, y: 280, score: 0.95 },
    elbow_l: { name: 'elbow_l', x: 280, y: 200, score: 0.95 },
    elbow_r: { name: 'elbow_r', x: 280, y: 280, score: 0.95 },
    wrist_l: { name: 'wrist_l', x: 280 + Math.cos(Math.PI - rad) * 80, y: 200 + Math.sin(Math.PI - rad) * 80, score: 0.95 },
    wrist_r: { name: 'wrist_r', x: 280 + Math.cos(Math.PI - rad) * 80, y: 280 + Math.sin(Math.PI - rad) * 80, score: 0.95 },
    hip_l: { name: 'hip_l', x: 380, y: 210, score: 0.95 },
    hip_r: { name: 'hip_r', x: 380, y: 270, score: 0.95 },
    ankle_l: { name: 'ankle_l', x: 500, y: 220, score: 0.95 },
    ankle_r: { name: 'ankle_r', x: 500, y: 260, score: 0.95 },
  };
}

// 1. Plank top lockout (170°)
pushupFsm.processFrame(createPushupFrame(170));
assert(pushupFsm.state === 'PLANK', 'Phase 1: Locked out plank -> PLANK');

// 2. Descending (elbow angle 130° < 150°)
pushupFsm.processFrame(createPushupFrame(130));
assert(pushupFsm.state === 'DESCENDING', 'Phase 2: Elbow bends < 150° -> DESCENDING');

// 3. Bottom inflection depth (elbow angle 88° <= 95°)
pushupFsm.processFrame(createPushupFrame(88));
assert(pushupFsm.state === 'INFLECTION', 'Phase 3: Elbow angle <= 95° -> INFLECTION');

// 4. Pressing up (elbow angle 120° > 105°)
pushupFsm.processFrame(createPushupFrame(120));
assert(pushupFsm.state === 'ASCENDING', 'Phase 4: Elbow angle > 105° -> ASCENDING');

// 5. Complete lockout (elbow angle 160° >= 155°)
const pushupResult = pushupFsm.processFrame(createPushupFrame(160));
assert(pushupFsm.state === 'PLANK', 'Phase 5: Lockout at top -> PLANK');
assert(pushupResult.reps === 1, 'Pushup Rep successfully counted: reps === 1');
assert(pushupResult.formScore === 100, 'Chest depth awarded full score');

// -------------------------------------------------------------
// Test Group 5: Deterministic Jumping Jacks FSM Verification
// -------------------------------------------------------------
console.log('\n--- Test Group 5: Deterministic Jumping Jacks FSM ---');

const jjFsm = new RepCounterFSM('jumping_jacks');
assert(jjFsm.state === 'NEUTRAL', 'Jumping Jacks begins in NEUTRAL state');

function createJumpingJackFrame(isExtended) {
  return {
    shoulder_l: { name: 'shoulder_l', x: 260, y: 200, score: 0.95 },
    shoulder_r: { name: 'shoulder_r', x: 380, y: 200, score: 0.95 },
    // When extended: arms overhead (wrist y < shoulder y), feet wide (ankle distance > 1.35 * shoulderWidth)
    wrist_l: { name: 'wrist_l', x: isExtended ? 200 : 260, y: isExtended ? 100 : 320, score: 0.95 },
    wrist_r: { name: 'wrist_r', x: isExtended ? 440 : 380, y: isExtended ? 100 : 320, score: 0.95 },
    ankle_l: { name: 'ankle_l', x: isExtended ? 200 : 290, y: 450, score: 0.95 },
    ankle_r: { name: 'ankle_r', x: isExtended ? 440 : 350, y: 450, score: 0.95 },
  };
}

// 1. Neutral starting position
jjFsm.processFrame(createJumpingJackFrame(false));
assert(jjFsm.state === 'NEUTRAL', 'Phase 1: Feet together, hands down -> NEUTRAL');

// 2. Extended position: feet wide, hands over head
jjFsm.processFrame(createJumpingJackFrame(true));
assert(jjFsm.state === 'EXTENDED', 'Phase 2: Feet spread, arms up -> EXTENDED');

// 3. Return to neutral
const jjResult = jjFsm.processFrame(createJumpingJackFrame(false));
assert(jjFsm.state === 'NEUTRAL', 'Phase 3: Return to start -> NEUTRAL');
assert(jjResult.reps === 1, 'Jumping Jack Rep successfully counted: reps === 1');


// -------------------------------------------------------------
// Test Group 6: Edge Cases, Incomplete Movements & Raw Arrays
// -------------------------------------------------------------
console.log('\n--- Test Group 6: Edge Cases & Raw 33-Array Processing ---');

// 1. Incomplete squat: Standing tall, small dip to 155°, then standing tall again -> 0 reps
const incompleteSquatFsm = new RepCounterFSM('squat');
incompleteSquatFsm.processFrame(createSquatFrame(170));
incompleteSquatFsm.processFrame(createSquatFrame(155));
const shallowResult = incompleteSquatFsm.processFrame(createSquatFrame(170));
assert(shallowResult.reps === 0, 'Incomplete/shallow squat does NOT count a rep');
assert(incompleteSquatFsm.state === 'UP', 'Returns to UP state after shallow dip');

// 2. Continuous extended frame in Jumping Jacks must NOT count multiple reps
const staticJjFsm = new RepCounterFSM('jumping_jacks');
staticJjFsm.processFrame(createJumpingJackFrame(false));
staticJjFsm.processFrame(createJumpingJackFrame(true));
assert(staticJjFsm.state === 'EXTENDED', 'Jumping jack extended');
staticJjFsm.processFrame(createJumpingJackFrame(true));
staticJjFsm.processFrame(createJumpingJackFrame(true));
const staticExtendedStatus = staticJjFsm.getStatus();
assert(staticExtendedStatus.reps === 0, 'Stationary extended position does not increment reps');
assert(staticJjFsm.state === 'EXTENDED', 'Remains in EXTENDED while arms stay overhead');
const closedResult = staticJjFsm.processFrame(createJumpingJackFrame(false));
assert(closedResult.reps === 1, 'Closing posture counts exactly 1 rep');

// 3. Raw 33-landmark array direct processing in RepCounterFSM
const rawArrayFsm = new RepCounterFSM('squat');
function createRawMediaPipeArray(kneeAngleDeg) {
  const arr = new Array(33).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 }));
  arr[23] = { x: 0.42, y: 0.45, z: 0, visibility: 0.95 };
  arr[25] = { x: 0.42, y: 0.65, z: 0, visibility: 0.95 };
  const rad = (kneeAngleDeg * Math.PI) / 180;
  arr[27] = { x: 0.42 + Math.sin(Math.PI - rad) * 0.2, y: 0.65 + Math.cos(Math.PI - rad) * 0.2, z: 0, visibility: 0.95 };
  return arr;
}
rawArrayFsm.processFrame(createRawMediaPipeArray(170));
rawArrayFsm.processFrame(createRawMediaPipeArray(130));
rawArrayFsm.processFrame(createRawMediaPipeArray(90));
rawArrayFsm.processFrame(createRawMediaPipeArray(120));
const rawArrayResult = rawArrayFsm.processFrame(createRawMediaPipeArray(165));
assert(rawArrayResult.reps === 1, 'RepCounterFSM successfully processes raw MediaPipe 33-landmark arrays');

// 4. Reset logic
rawArrayFsm.reset();
assert(rawArrayFsm.reps === 0, 'reset() clears reps back to 0');
assert(rawArrayFsm.state === 'UP', 'reset() restores starting FSM state to UP');

// -------------------------------------------------------------
// Test Group 8: Exercise ID Normalization & Route Generation Regression
// -------------------------------------------------------------
console.log('--- Test Group 8: Exercise ID Normalization & Route Generation ---');

// 1. Canonical normalization of jumping jacks variations
assert(normalizeExerciseId('jumping_jacks') === 'jumping_jacks', 'Canonical jumping_jacks preserved');
assert(normalizeExerciseId('jumping-jacks') === 'jumping_jacks', 'Hyphenated jumping-jacks normalized');
assert(normalizeExerciseId('jumpingJacks') === 'jumping_jacks', 'CamelCase jumpingJacks normalized');
assert(normalizeExerciseId('jumping jack') === 'jumping_jacks', 'Space separated jumping jack normalized');
assert(normalizeExerciseId('jumping_jack') === 'jumping_jacks', 'Singular jumping_jack normalized');

// 2. Canonical normalization of squats and pushups
assert(normalizeExerciseId('squat') === 'squat', 'Canonical squat preserved');
assert(normalizeExerciseId('squats') === 'squat', 'Plural squats normalized to squat');
assert(normalizeExerciseId('pushup') === 'pushup', 'Canonical pushup preserved');
assert(normalizeExerciseId('pushups') === 'pushup', 'Plural pushups normalized to pushup');
assert(normalizeExerciseId('push_ups') === 'pushup', 'push_ups normalized to pushup');
assert(normalizeExerciseId('push-up') === 'pushup', 'Hyphenated push-up normalized to pushup');
assert(normalizeExerciseId(undefined) === 'squat', 'undefined falls back to safe default squat');
assert(normalizeExerciseId(null) === 'squat', 'null falls back to safe default squat');
assert(normalizeExerciseId('') === 'squat', 'empty string falls back to safe default squat');

// 3. Plan ID extraction
assert(getPlanId({ workoutId: 'dorm_blast_10' }) === 'dorm_blast_10', 'Extracts workoutId correctly');
assert(getPlanId({ planId: 'dorm_blast_20' }) === 'dorm_blast_20', 'Extracts planId correctly');
assert(getPlanId({ id: 'strength_30' }) === 'strength_30', 'Extracts id correctly');
assert(getPlanId('free') === 'free', 'String "free" preserved');
assert(getPlanId('undefined') === 'free', 'Literal string "undefined" mapped to "free"');
assert(getPlanId(undefined) === 'free', 'undefined plan object mapped to "free"');
assert(getPlanId(null) === 'free', 'null plan object mapped to "free"');

// 4. Exercise ID extraction
assert(getExerciseId({ exerciseId: 'jumping_jacks' }) === 'jumping_jacks', 'Extracts exerciseId from object');
assert(getExerciseId({ id: 'jumping_jacks' }) === 'jumping_jacks', 'Extracts id from object');
assert(getExerciseId({ id: 'jumping-jacks' }) === 'jumping_jacks', 'Extracts and normalizes id from object');
assert(getExerciseId('jumping_jacks') === 'jumping_jacks', 'String exerciseId preserved');
assert(getExerciseId('undefined') === 'squat', 'Literal string "undefined" exercise mapped to default squat');

// 5. Zero-undefined Camera Route Generation
const squatRoute = buildCameraRoute('free', { exerciseId: 'squat' });
assert(squatRoute === '/camera/free/squat', 'Generates /camera/free/squat');

const pushupRoute = buildCameraRoute('free', { exerciseId: 'pushup' });
assert(pushupRoute === '/camera/free/pushup', 'Generates /camera/free/pushup');

const jjRoute = buildCameraRoute('free', { exerciseId: 'jumping_jacks' });
assert(jjRoute === '/camera/free/jumping_jacks', 'Generates /camera/free/jumping_jacks');

// CRITICAL REGRESSION: Plan object with only workoutId and exerciseId
const planObj = {
  workoutId: 'dorm_blast_10',
  title: 'Dorm Room Blast',
  exercises: [{ exerciseId: 'jumping_jacks' }]
};
const planRoute = buildCameraRoute(planObj, planObj.exercises[0].exerciseId);
assert(planRoute === '/camera/dorm_blast_10/jumping_jacks', 'Plan workout route generated with workoutId');
assert(!planRoute.includes('undefined'), 'Plan workout route contains NO "undefined"');

// CRITICAL REGRESSION: Accidental undefined inputs NEVER produce /camera/undefined/...
const bugRegressionRoute1 = buildCameraRoute(undefined, 'jumping_jacks');
assert(bugRegressionRoute1 === '/camera/free/jumping_jacks', 'Undefined plan gracefully defaults to /camera/free/jumping_jacks');
assert(!bugRegressionRoute1.includes('undefined'), 'Regression 1 contains NO "undefined"');

const bugRegressionRoute2 = buildCameraRoute('undefined', 'jumping_jacks');
assert(bugRegressionRoute2 === '/camera/free/jumping_jacks', 'Literal "undefined" plan gracefully defaults to /camera/free/jumping_jacks');
assert(!bugRegressionRoute2.includes('undefined'), 'Regression 2 contains NO "undefined"');

const bugRegressionRoute3 = buildCameraRoute('free', undefined);
assert(bugRegressionRoute3 === '/camera/free/squat', 'Undefined exercise gracefully defaults to /camera/free/squat');
assert(!bugRegressionRoute3.includes('undefined'), 'Regression 3 contains NO "undefined"');

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log(`\n========================================`);
console.log(`🎉 All tests passed! (${passedTests}/${totalTests})`);
console.log(`========================================\n`);
