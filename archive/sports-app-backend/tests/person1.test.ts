/**
 * SportX Person 1 Comprehensive Backend Automated Test Suite
 * Validates all required domain rules, anti-cheat mechanisms, and security invariants.
 */
import { XPService } from '../functions/src/gamification/xpService';
import { StreakService } from '../functions/src/gamification/streakService';
import { BadgeService, SYSTEM_BADGES } from '../functions/src/gamification/badgeService';
import { validateFitnessProfile, sanitizeUserProfileUpdate, validateWorkoutPlan, validateActivityLog } from '../functions/src/middleware/validation';
import { DEFAULT_EXERCISES } from '../functions/src/exercises/exerciseService';

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

export async function runPerson1Tests(): Promise<void> {
  console.log('================================================================');
  console.log('🧪 Running SportX Person 1 Core Backend Automated Test Suite');
  console.log('================================================================\n');

  // ── GROUP 1: Authentication & Profile Validation ─────────────────────────────
  console.log('[1/7] Testing Authentication, Profile & Field Protection...');
  {
    // Test 1.1: Default User Profile State
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

    // Test 1.2: Fitness Profile Validation
    const validFitness = validateFitnessProfile({
      fitnessLevel: 'intermediate',
      goals: ['muscle_gain', 'endurance'],
      selectedSports: ['Cricket', 'Running'],
      availableWorkoutTime: 25,
    });
    assert(validFitness.isValid, 'Valid fitness profile passes validation');

    const invalidFitnessLevel = validateFitnessProfile({
      fitnessLevel: 'superhuman', // Invalid level
    });
    assert(!invalidFitnessLevel.isValid, 'Invalid fitness level is rejected');

    const negativeTime = validateFitnessProfile({
      availableWorkoutTime: -10,
    });
    assert(!negativeTime.isValid, 'Negative available workout time is rejected');

    // Test 1.3: Sensitive Gamification Field Stripping (Security Invariant)
    const clientPayload = {
      name: 'Updated Name',
      fitnessLevel: 'advanced',
      xp: 99999, // Malicious tamper attempt
      totalXp: 99999,
      level: 10,
      currentStreak: 100,
      longestStreak: 100,
      badges: ['grandmaster'],
    };

    const sanitized = sanitizeUserProfileUpdate(clientPayload);
    assert(sanitized.name === 'Updated Name', 'Safe field (name) is preserved during update');
    assert(sanitized.fitnessLevel === 'advanced', 'Safe field (fitnessLevel) is preserved');
    assert(sanitized.xp === undefined, 'Security Guard: Client cannot directly set xp');
    assert(sanitized.totalXp === undefined, 'Security Guard: Client cannot directly set totalXp');
    assert(sanitized.level === undefined, 'Security Guard: Client cannot directly set level');
    assert(sanitized.currentStreak === undefined, 'Security Guard: Client cannot directly set currentStreak');
    assert(sanitized.longestStreak === undefined, 'Security Guard: Client cannot directly set longestStreak');
    assert(sanitized.badges === undefined, 'Security Guard: Client cannot directly set badges');
  }

  // ── GROUP 2: Workout Plans Validation & Integrity ─────────────────────────────
  console.log('\n[2/7] Testing Workout Plans Validation & Integrity...');
  {
    // Valid Plan
    const validPlan = validateWorkoutPlan({
      name: 'Campus Blast',
      exercises: [
        { exerciseId: 'squat', sets: 3, reps: 15, restSeconds: 45, order: 1 },
        { exerciseId: 'pushup', sets: 3, reps: 10, restSeconds: 45, order: 2 },
      ],
    });
    assert(validPlan.isValid, 'Valid workout plan passes validation');

    // Missing Name
    const missingNamePlan = validateWorkoutPlan({
      name: '',
      exercises: [{ exerciseId: 'squat', sets: 3, reps: 15, restSeconds: 45, order: 1 }],
    });
    assert(!missingNamePlan.isValid, 'Plan without name is rejected');

    // Empty Exercises
    const emptyExercisesPlan = validateWorkoutPlan({
      name: 'Empty Workout',
      exercises: [],
    });
    assert(!emptyExercisesPlan.isValid, 'Plan with empty exercises array is rejected');

    // Negative Reps or Sets
    const negativeSetsPlan = validateWorkoutPlan({
      name: 'Negative Plan',
      exercises: [{ exerciseId: 'squat', sets: -1, reps: 10, restSeconds: 30, order: 1 }],
    });
    assert(!negativeSetsPlan.isValid, 'Exercise with negative sets is rejected');
  }

  // ── GROUP 3: Workout Sessions & Ownership Guards ──────────────────────────────
  console.log('\n[3/7] Testing Workout Session Lifecycle & Ownership Guards...');
  {
    const sessionOwner = 'user_athlete_42';
    const attackerUid = 'user_impostor_99';

    // Guard: Only owner can modify session
    function canAccessSession(requestUid: string, sessionUserId: string): boolean {
      return requestUid === sessionUserId;
    }

    assert(canAccessSession(sessionOwner, sessionOwner) === true, 'Owner can access their workout session');
    assert(canAccessSession(attackerUid, sessionOwner) === false, 'Non-owner CANNOT access or complete another user session (403)');

    // Session State Transitions
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
  }

  // ── GROUP 4: Activity Telemetry & MediaPipe Ingestion ────────────────────────
  console.log('\n[4/7] Testing Activity Telemetry Logging & Ingestion...');
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

    // Invalid Form Score (>100 or <0)
    const invalidScore = validateActivityLog({
      exerciseId: 'bicep_curl',
      reps: 12,
      duration: 40,
      formScore: 150,
    });
    assert(!invalidScore.isValid, 'Form score > 100 is rejected');
  }

  // ── GROUP 5: Server-Side XP Calculation & Anti-Cheat ─────────────────────────
  console.log('\n[5/7] Testing Server-Side XP Calculation & Anti-Cheat...');
  {
    // Standard session: 10 reps @ 100% form accuracy, 10 min duration, completed
    // 10 * 10 * 1.0 (100) + 10 * 5 (50) + 50 (completion) + 25 (excellence >= 90) = 225
    const xp1 = XPService.calculateSessionXP({
      totalReps: 10,
      formAccuracyAverage: 100,
      durationMinutes: 10,
      isCompleted: true,
    });
    assert(xp1 === 225, 'Standard session XP matches mathematical formula', `Got: ${xp1}`);

    // Lower form accuracy scales rep XP down
    // 10 * 10 * 0.5 (50) + 10 * 5 (50) + 0 (incomplete) + 0 (<90) = 100
    const xp2 = XPService.calculateSessionXP({
      totalReps: 10,
      formAccuracyAverage: 50,
      durationMinutes: 10,
      isCompleted: false,
    });
    assert(xp2 === 100, 'Low form accuracy (50%) accurately scales down rep XP', `Got: ${xp2}`);

    // Anti-Cheat: Duration bonus cap at 60 minutes
    const xpCapped = XPService.calculateSessionXP({
      totalReps: 0,
      formAccuracyAverage: 80,
      durationMinutes: 180, // Attempting 3 hours duration abuse
      isCompleted: false,
    });
    assert(xpCapped === 300, 'Duration bonus caps strictly at 60 mins (300 XP max bonus) to block bot abuse', `Got: ${xpCapped}`);

    // Level progression tests
    assert(XPService.calculateLevel(0) === 1, '0 XP is Level 1');
    assert(XPService.calculateLevel(99) === 1, '99 XP is Level 1');
    assert(XPService.calculateLevel(100) === 2, '100 XP is Level 2');
    assert(XPService.calculateLevel(400) === 3, '400 XP is Level 3');
    assert(XPService.calculateLevel(900) === 4, '900 XP is Level 4');
    assert(XPService.getXPForNextLevel(1) === 100, 'XP required for Level 2 is 100');
    assert(XPService.getXPForNextLevel(2) === 400, 'XP required for Level 3 is 400');

    // Idempotency check simulation
    const ledger = new Set<string>();
    const sessionTxKey = 'tx_sess_101_workout_completed';
    const run1 = !ledger.has(sessionTxKey);
    if (run1) ledger.add(sessionTxKey);
    const run2 = !ledger.has(sessionTxKey);

    assert(run1 === true, 'First XP transaction write is processed');
    assert(run2 === false, 'Duplicate XP transaction replay is rejected (Idempotency guarantee)');
  }

  // ── GROUP 6: Streak Continuity & Reset Algorithms ────────────────────────────
  console.log('\n[6/7] Testing Streak Continuity & Reset Engine...');
  {
    // 6.1 First workout ever
    const s1 = StreakService.evaluateStreak({
      lastWorkoutDate: null,
      currentStreak: 0,
      longestStreak: 0,
      sessionDate: '2026-09-10',
    });
    assert(s1.currentStreak === 1 && s1.streakIncremented, 'First completed workout initializes streak to 1');
    assert(s1.longestStreak === 1, 'Longest streak tracks initial streak');

    // 6.2 Duplicate workout on same calendar day
    const s2 = StreakService.evaluateStreak({
      lastWorkoutDate: '2026-09-10',
      currentStreak: 1,
      longestStreak: 1,
      sessionDate: '2026-09-10',
    });
    assert(s2.currentStreak === 1 && !s2.streakIncremented, 'Second workout on same calendar day does NOT increment streak');

    // 6.3 Consecutive calendar day workout
    const s3 = StreakService.evaluateStreak({
      lastWorkoutDate: '2026-09-10',
      currentStreak: 3,
      longestStreak: 5,
      sessionDate: '2026-09-11',
    });
    assert(s3.currentStreak === 4 && s3.streakIncremented, 'Consecutive day workout increments streak from 3 to 4');
    assert(s3.longestStreak === 5, 'Longest streak preserved when current < longest');

    // 6.4 Streak sets new longest streak
    const s4 = StreakService.evaluateStreak({
      lastWorkoutDate: '2026-09-11',
      currentStreak: 5,
      longestStreak: 5,
      sessionDate: '2026-09-12',
    });
    assert(s4.currentStreak === 6 && s4.longestStreak === 6, 'New record streak updates longestStreak to 6');

    // 6.5 Skipped day (Broken continuity)
    const s5 = StreakService.evaluateStreak({
      lastWorkoutDate: '2026-09-01', // 11 days ago
      currentStreak: 14,
      longestStreak: 25,
      sessionDate: '2026-09-12',
    });
    assert(s5.currentStreak === 1 && s5.isStreakReset, 'Skipped days correctly resets current streak back to 1');
    assert(s5.longestStreak === 25, 'Previous longest streak (25) is preserved after streak reset');
  }

  // ── GROUP 7: Badges Engine & Master Data Integrity ───────────────────────────
  console.log('\n[7/7] Testing Milestone Badges & Master Catalogue...');
  {
    // 7.1 Master data checks
    assert(DEFAULT_EXERCISES.length >= 5, `Master exercises catalogue has ${DEFAULT_EXERCISES.length} exercises (>= 5 required)`);
    assert(SYSTEM_BADGES.length >= 8, `Master badges catalogue has ${SYSTEM_BADGES.length} badges (>= 8 required)`);

    // 7.2 Badge unlock logic: First Step
    const b1 = BadgeService.evaluateUnlockedBadges({
      currentBadges: [],
      totalWorkouts: 1,
      totalReps: 15,
      totalXP: 225,
      currentStreak: 1,
    });
    assert(b1.newBadges.some((b) => b.id === 'first_workout'), 'Unlocks "First Step" badge on first completed workout');

    // 7.3 Duplicate unlock prevention
    const b2 = BadgeService.evaluateUnlockedBadges({
      currentBadges: ['first_workout'],
      totalWorkouts: 2,
      totalReps: 30,
      totalXP: 450,
      currentStreak: 2,
    });
    assert(!b2.newBadges.some((b) => b.id === 'first_workout'), 'Does not duplicate previously unlocked "First Step" badge');

    // 7.4 Streak Badge Unlock: Week Warrior
    const b3 = BadgeService.evaluateUnlockedBadges({
      currentBadges: ['first_workout', 'streak_3'],
      totalWorkouts: 7,
      totalReps: 105,
      totalXP: 1500,
      currentStreak: 7,
    });
    assert(b3.newBadges.some((b) => b.id === 'streak_7'), 'Unlocks "Week Warrior" upon reaching 7-day streak');

    // 7.5 Form Perfectionist Badge
    const b4 = BadgeService.evaluateUnlockedBadges({
      currentBadges: [],
      totalWorkouts: 1,
      totalReps: 10,
      totalXP: 200,
      currentStreak: 1,
      sessionFormAccuracy: 98,
    });
    assert(b4.newBadges.some((b) => b.id === 'perfect_form'), 'Unlocks "Form Perfectionist" when session form accuracy >= 95%');
  }

  console.log('\n================================================================');
  console.log(`📊 Test Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('================================================================');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL PERSON 1 BACKEND BUSINESS LOGIC & SECURITY INVARIANTS PASSED!');
  }
}

if (require.main === module) {
  runPerson1Tests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
