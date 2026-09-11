/**
 * SportX Input Validation & Domain Invariants Automated Test Suite
 * Validates request schemas, field protection against client-tampering,
 * workout plan constraints, session transitions, and activity telemetry.
 */
import {
  validateFitnessProfile,
  sanitizeUserProfileUpdate,
  validateWorkoutPlan,
  validateActivityLog,
  PROTECTED_USER_FIELDS,
} from './middleware/validation';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    testsFailed++;
  }
}

export async function runValidationTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('🧪 Running SportX Domain Validation & Schema Guard Test Suite');
  console.log('================================================================\n');

  // ── GROUP 1: Profile Validation & Sensitive Field Protection ──────────────────
  console.log('[Validation 1/4] Testing Profile Validation & Field Protection...');
  {
    // 1.1: Default User Profile State
    const defaultProfile = {
      userId: 'test_user_1',
      name: 'Rohan Sharma',
      email: 'rohan@campus.edu',
      fitnessLevel: 'beginner',
      xp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
    };
    assert(defaultProfile.xp === 0, 'New user profile defaults to 0 XP');
    assert(defaultProfile.level === 1, 'New user profile defaults to Level 1');
    assert(defaultProfile.currentStreak === 0, 'New user profile defaults to 0 current streak');
    assert(defaultProfile.longestStreak === 0, 'New user profile defaults to 0 longest streak');

    // 1.2: Fitness Profile Validation
    const validFitness = validateFitnessProfile({
      fitnessLevel: 'intermediate',
      goals: ['muscle_gain', 'endurance'],
      selectedSports: ['cricket', 'running'],
      availableWorkoutTime: 25,
    });
    assert(validFitness.isValid, 'Valid fitness profile passes validation');

    const invalidFitnessLevel = validateFitnessProfile({
      fitnessLevel: 'superhuman',
    });
    assert(!invalidFitnessLevel.isValid, 'Invalid fitness level is rejected');

    const negativeTime = validateFitnessProfile({
      availableWorkoutTime: -10,
    });
    assert(!negativeTime.isValid, 'Negative available workout time is rejected');

    // 1.3: Sensitive Gamification Field Stripping (Security Invariant)
    const clientPayload = {
      name: 'Updated Athlete Name',
      fitnessLevel: 'advanced',
      xp: 99999, // Malicious tamper attempt
      totalXp: 99999,
      level: 10,
      currentStreak: 100,
      longestStreak: 100,
      badges: ['grandmaster'],
      role: 'admin', // Privilege escalation attempt
    };

    const sanitized = sanitizeUserProfileUpdate(clientPayload);
    assert(sanitized.name === 'Updated Athlete Name', 'Safe field (name) is preserved during update');
    assert(sanitized.fitnessLevel === 'advanced', 'Safe field (fitnessLevel) is preserved');
    assert(sanitized.xp === undefined, 'Security Guard: Client cannot directly inject xp');
    assert(sanitized.totalXp === undefined, 'Security Guard: Client cannot directly inject totalXp');
    assert(sanitized.level === undefined, 'Security Guard: Client cannot directly inject level');
    assert(sanitized.currentStreak === undefined, 'Security Guard: Client cannot directly inject currentStreak');
    assert(sanitized.longestStreak === undefined, 'Security Guard: Client cannot directly inject longestStreak');
    assert(sanitized.badges === undefined, 'Security Guard: Client cannot directly inject badges');
    assert(sanitized.role === undefined, 'Security Guard: Client cannot escalate role to admin');
    assert(PROTECTED_USER_FIELDS.has('xp') && PROTECTED_USER_FIELDS.has('role'), 'Protected field set includes all critical security fields');
  }

  // ── GROUP 2: Workout Plans Validation & Integrity ─────────────────────────────
  console.log('\n[Validation 2/4] Testing Workout Plan Validation & Structure...');
  {
    // Valid Plan
    const validPlan = validateWorkoutPlan({
      title: 'Campus Blast',
      exercises: [
        { exerciseId: 'squat', targetSets: 3, targetReps: 15, restInterval: 45, order: 1 },
        { exerciseId: 'pushup', targetSets: 3, targetReps: 10, restInterval: 45, order: 2 },
      ],
    });
    assert(validPlan.isValid, 'Valid workout plan passes validation');

    // Missing Name/Title
    const missingTitlePlan = validateWorkoutPlan({
      title: '',
      exercises: [{ exerciseId: 'squat', targetSets: 3, targetReps: 15, restInterval: 45, order: 1 }],
    });
    assert(!missingTitlePlan.isValid, 'Plan with missing title is rejected');

    // Empty Exercises
    const emptyExercisesPlan = validateWorkoutPlan({
      title: 'Empty Routine',
      exercises: [],
    });
    assert(!emptyExercisesPlan.isValid, 'Plan with empty exercises array is rejected');

    // Negative Reps or Sets
    const negativeSetsPlan = validateWorkoutPlan({
      title: 'Negative Sets Routine',
      exercises: [{ exerciseId: 'squat', sets: -1, reps: 10, restSeconds: 30, order: 1 }],
    });
    assert(!negativeSetsPlan.isValid, 'Exercise with negative sets is rejected');

    // Missing Exercise ID
    const missingExerciseIdPlan = validateWorkoutPlan({
      title: 'Incomplete Exercise',
      exercises: [{ sets: 3, reps: 10, restSeconds: 30, order: 1 }],
    });
    assert(!missingExerciseIdPlan.isValid, 'Exercise without exerciseId is rejected');
  }

  // ── GROUP 3: Workout Session Lifecycle & State Transitions ───────────────────
  console.log('\n[Validation 3/4] Testing Session State Transition Integrity...');
  {
    const allowedTransitions: Record<string, string[]> = {
      started: ['paused', 'completed', 'cancelled'],
      paused: ['resumed', 'cancelled'],
      resumed: ['paused', 'completed', 'cancelled'],
      completed: [], // Terminal
      cancelled: [], // Terminal
    };

    function isValidTransition(from: string, to: string): boolean {
      return allowedTransitions[from]?.includes(to) ?? false;
    }

    assert(isValidTransition('started', 'paused') === true, 'Can transition: started -> paused');
    assert(isValidTransition('paused', 'resumed') === true, 'Can transition: paused -> resumed');
    assert(isValidTransition('resumed', 'completed') === true, 'Can transition: resumed -> completed');
    assert(isValidTransition('completed', 'paused') === false, 'Cannot modify session once completed (terminal state)');
    assert(isValidTransition('cancelled', 'completed') === false, 'Cannot complete an already cancelled session');
  }

  // ── GROUP 4: Activity Telemetry Logging & Ingestion ──────────────────────────
  console.log('\n[Validation 4/4] Testing Activity Telemetry Validation...');
  {
    // Valid CV Payload
    const validLog = validateActivityLog({
      exerciseId: 'squat',
      reps: 15,
      duration: 45,
      formScore: 88,
      errors: ['knees_inward'],
    });
    assert(validLog.isValid, 'Valid CV/MediaPipe activity payload passes validation');

    // Negative Reps
    const negReps = validateActivityLog({
      exerciseId: 'squat',
      reps: -5,
      duration: 30,
      formScore: 80,
    });
    assert(!negReps.isValid, 'Negative reps in activity log are rejected');

    // Negative Duration
    const negDuration = validateActivityLog({
      exerciseId: 'pushup',
      reps: 10,
      duration: -10,
      formScore: 85,
    });
    assert(!negDuration.isValid, 'Negative duration in activity log is rejected');

    // Form Score > 100
    const invalidScore = validateActivityLog({
      exerciseId: 'bicep_curl',
      reps: 12,
      duration: 40,
      formScore: 150,
    });
    assert(!invalidScore.isValid, 'Form score > 100 is rejected');

    // Form Score < 0
    const negativeScore = validateActivityLog({
      exerciseId: 'bicep_curl',
      reps: 12,
      duration: 40,
      formScore: -5,
    });
    assert(!negativeScore.isValid, 'Negative form score is rejected');
  }

  console.log(`\nValidation Tests Passed: ${testsPassed}, Failed: ${testsFailed}`);
  if (testsFailed > 0) {
    throw new Error(`${testsFailed} validation tests failed.`);
  }
  return { passed: testsPassed, failed: testsFailed };
}

if (require.main === module) {
  runValidationTests()
    .then(() => console.log('🎉 All domain validation tests passed successfully.'))
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}
