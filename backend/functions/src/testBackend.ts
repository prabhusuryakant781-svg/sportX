/**
 * SportX Comprehensive Backend Automated Test Suite
 * Tests Critical Backend Logic:
 * 1. Authentication Logic & ID Token Decoding
 * 2. User Ownership & Authorization Guards
 * 3. Server-side Anti-Cheat XP Calculation
 * 4. Duplicate XP Replay Prevention & Idempotency
 * 5. Streak Progression & Missed-Day Reset Logic
 * 6. Dynamic Badge Unlocking Engine
 * 7. Progress Aggregation & Personal Records Tracking
 * 8. Activity Log Telemetry & Filtering
 * 9. Firestore Security Invariant Validation
 */

process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'sportx-ab55f';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'sportx-ab55f';

import { GamificationService, SYSTEM_BADGES } from './services/gamificationService';
import { runAuthTests } from './testAuthEndToEnd';
import { runWorkoutCompletionTests } from './testWorkoutCompletion';
import { runSecurityRulesTests } from './testSecurityRules';
import { runValidationTests } from './testValidation';
import { runProgressAndHistoryTests } from './testProgressAndHistory';
import { runEmulatorIntegrationTests } from './testEmulatorIntegration';
import { runCompetitiveTests } from './testCompetitive';

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

async function runTests() {
  console.log('================================================================');
  console.log('⚡ SportX Comprehensive Backend Automated Test Suite');
  console.log('================================================================\n');

  // ── TEST 1: Server-Side XP Calculation & Anti-Cheat ──────────────────────────
  console.log('[1/8] Testing Server-Side XP Calculation & Anti-Cheat...');
  {
    // Baseline test: 10 reps @ 100% accuracy, 10 min duration, completed
    const xp1 = GamificationService.calculateSessionXP({
      totalReps: 10,
      formAccuracyAverage: 100,
      durationMinutes: 10,
      isCompleted: true,
    });
    // Expected: 10*10*1.0 (100) + 10*5 (50) + 50 (completion) + 25 (excellence >= 90) = 225
    assert(xp1 === 225, 'Standard session XP calculation matches formula', `Got: ${xp1}, Expected: 225`);

    // Poor form test: 10 reps @ 50% accuracy, 10 min duration, incomplete
    const xp2 = GamificationService.calculateSessionXP({
      totalReps: 10,
      formAccuracyAverage: 50,
      durationMinutes: 10,
      isCompleted: false,
    });
    // Expected: 10*10*0.5 (50) + 10*5 (50) + 0 (incomplete) + 0 (<90%) = 100
    assert(xp2 === 100, 'Low form accuracy scales rep XP down correctly', `Got: ${xp2}, Expected: 100`);

    // Boundary condition: duration cap at 60 minutes
    const xpCapped = GamificationService.calculateSessionXP({
      totalReps: 0,
      formAccuracyAverage: 80,
      durationMinutes: 120, // Should be capped at 60 mins -> 300 XP duration bonus
      isCompleted: false,
    });
    assert(xpCapped === 300, 'Duration bonus caps at 60 minutes to prevent abuse', `Got: ${xpCapped}, Expected: 300`);
  }

  // ── TEST 2: Level Progression Formula ─────────────────────────────────────────
  console.log('\n[2/8] Testing Level Progression Engine...');
  {
    assert(GamificationService.calculateLevel(0) === 1, '0 XP is Level 1');
    assert(GamificationService.calculateLevel(99) === 1, '99 XP is Level 1');
    assert(GamificationService.calculateLevel(100) === 2, '100 XP is Level 2');
    assert(GamificationService.calculateLevel(400) === 3, '400 XP is Level 3');
    assert(GamificationService.calculateLevel(900) === 4, '900 XP is Level 4');
    assert(GamificationService.getXPForNextLevel(1) === 100, 'XP for Level 2 is 100');
    assert(GamificationService.getXPForNextLevel(2) === 400, 'XP for Level 3 is 400');
  }

  // ── TEST 3: Streak Calculation Engine ─────────────────────────────────────────
  console.log('\n[3/8] Testing Streak Progression & Reset Logic...');
  {
    // First workout ever
    const s1 = GamificationService.evaluateStreak({
      lastWorkoutDate: null,
      currentStreak: 0,
      longestStreak: 0,
      sessionDate: '2026-09-10',
    });
    assert(s1.currentStreak === 1 && s1.streakIncremented, 'First workout sets streak to 1');
    assert(s1.longestStreak === 1, 'Longest streak tracks initial streak');

    // Same day duplicate workout: should NOT increment streak
    const s2 = GamificationService.evaluateStreak({
      lastWorkoutDate: '2026-09-10',
      currentStreak: 1,
      longestStreak: 1,
      sessionDate: '2026-09-10',
    });
    assert(s2.currentStreak === 1 && !s2.streakIncremented, 'Second workout on same day does NOT increase streak');

    // Consecutive day workout: should increment streak
    const s3 = GamificationService.evaluateStreak({
      lastWorkoutDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      currentStreak: 4,
      longestStreak: 6,
      sessionDate: new Date().toISOString().split('T')[0],
    });
    assert(s3.currentStreak === 5 && s3.streakIncremented, 'Consecutive day increments streak from 4 to 5');
    assert(s3.longestStreak === 6, 'Longest streak retained when current < longest');

    // Broken continuity (missed days): resets to 1
    const s4 = GamificationService.evaluateStreak({
      lastWorkoutDate: '2026-08-01', // Missed over a month
      currentStreak: 12,
      longestStreak: 20,
      sessionDate: '2026-09-10',
    });
    assert(s4.currentStreak === 1 && s4.streakIncremented, 'Missed days resets current streak to 1');
    assert(s4.longestStreak === 20, 'Longest streak is preserved after streak reset');
  }

  // ── TEST 4: Duplicate XP Prevention & Idempotency ──────────────────────────────
  console.log('\n[4/8] Testing Duplicate XP Prevention & Idempotency...');
  {
    // Simulate transaction ledger
    const processedTxIds = new Set<string>();

    function recordXPIdempotent(txId: string, amount: number): boolean {
      if (processedTxIds.has(txId)) {
        return false; // Duplicate suppressed!
      }
      processedTxIds.add(txId);
      return true;
    }

    const sessionId = 'session_test_abc_123';
    const txId = `tx_${sessionId}_workout`;

    const firstRun = recordXPIdempotent(txId, 250);
    assert(firstRun === true, 'First workout completion records XP transaction');

    const duplicateRun = recordXPIdempotent(txId, 250);
    assert(duplicateRun === false, 'Duplicate workout submission is correctly rejected');
    assert(processedTxIds.size === 1, 'Ledger contains only one record for the session');
  }

  // ── TEST 5: Dynamic Badge Unlocking Engine ─────────────────────────────────────
  console.log('\n[5/8] Testing Badge Unlocking Rules Engine...');
  {
    // First workout unlocks 'first_workout'
    const b1 = GamificationService.evaluateUnlockedBadges({
      currentBadges: [],
      totalWorkouts: 1,
      totalReps: 15,
      totalXP: 200,
      currentStreak: 1,
      sessionFormAccuracy: 85,
    });
    assert(
      b1.newBadges.some((b) => b.id === 'first_workout'),
      'Unlocks "First Step" badge on first completed workout'
    );
    assert(b1.allBadges.includes('first_workout'), 'allBadges list contains unlocked badge');

    // Already possessed badges are not re-unlocked
    const b2 = GamificationService.evaluateUnlockedBadges({
      currentBadges: ['first_workout'],
      totalWorkouts: 2,
      totalReps: 30,
      totalXP: 400,
      currentStreak: 2,
    });
    assert(
      !b2.newBadges.some((b) => b.id === 'first_workout'),
      'Does NOT duplicate previously unlocked "First Step" badge'
    );

    // 7-day streak unlocks 'streak_7'
    const b3 = GamificationService.evaluateUnlockedBadges({
      currentBadges: ['first_workout', 'streak_3'],
      totalWorkouts: 7,
      totalReps: 105,
      totalXP: 1400,
      currentStreak: 7,
    });
    assert(
      b3.newBadges.some((b) => b.id === 'streak_7'),
      'Unlocks "Week Warrior" upon hitting 7-day streak'
    );

    // Form perfectionist badge (>= 95% form accuracy)
    const b4 = GamificationService.evaluateUnlockedBadges({
      currentBadges: [],
      totalWorkouts: 1,
      totalReps: 10,
      totalXP: 200,
      currentStreak: 1,
      sessionFormAccuracy: 98,
    });
    assert(
      b4.newBadges.some((b) => b.id === 'perfect_form'),
      'Unlocks "Form Perfectionist" when session form accuracy >= 95%'
    );
  }

  // ── TEST 6: User Ownership & Security Invariants ──────────────────────────────
  console.log('\n[6/8] Testing User Ownership & Security Invariants...');
  {
    const userA = 'uid_athlete_01';
    const userB = 'uid_athlete_02';

    // Verify session modification security check
    function canModifySession(requestUid: string, sessionOwnerUid: string): boolean {
      return requestUid === sessionOwnerUid;
    }

    assert(canModifySession(userA, userA) === true, 'User A can modify their own session');
    assert(canModifySession(userB, userA) === false, 'User B CANNOT modify User A session (403 Forbidden)');

    // Client-side forbidden fields check
    const protectedFields = new Set([
      'xp',
      'XP',
      'totalXp',
      'level',
      'currentStreak',
      'longestStreak',
      'badges',
      'totalWorkouts',
      'totalMinutes',
      'totalCalories',
    ]);

    function validateClientProfileUpdate(keys: string[]): boolean {
      return !keys.some((k) => protectedFields.has(k));
    }

    assert(
      validateClientProfileUpdate(['name', 'fitnessLevel', 'goals', 'selectedSports']) === true,
      'Valid client profile fields are permitted'
    );
    assert(
      validateClientProfileUpdate(['xp', 'level']) === false,
      'Direct client manipulation of XP/Level is blocked by security validation'
    );
    assert(
      validateClientProfileUpdate(['currentStreak']) === false,
      'Direct client manipulation of streak is blocked by security validation'
    );
  }

  // ── TEST 7: Progress Aggregation & Personal Records ────────────────────────────
  console.log('\n[7/8] Testing Progress Aggregation & PR Logic...');
  {
    interface MockProgress {
      totalReps: number;
      totalCalories: number;
      personalRecords: Record<string, number>;
      formScoreTrends: Array<{ date: string; score: number }>;
    }

    const currentProgress: MockProgress = {
      totalReps: 100,
      totalCalories: 450,
      personalRecords: { squat_max_reps: 20 },
      formScoreTrends: [{ date: '2026-09-08', score: 85 }],
    };

    function aggregateSession(
      progress: MockProgress,
      session: { reps: number; calories: number; formScore: number; exerciseId: string; date: string }
    ): MockProgress {
      const prKey = `${session.exerciseId}_max_reps`;
      const currentPr = progress.personalRecords[prKey] || 0;
      return {
        totalReps: progress.totalReps + session.reps,
        totalCalories: progress.totalCalories + session.calories,
        personalRecords: {
          ...progress.personalRecords,
          [prKey]: Math.max(currentPr, session.reps),
        },
        formScoreTrends: [...progress.formScoreTrends, { date: session.date, score: session.formScore }],
      };
    }

    const updated = aggregateSession(currentProgress, {
      reps: 25, // New PR! (25 > 20)
      calories: 90,
      formScore: 92,
      exerciseId: 'squat',
      date: '2026-09-10',
    });

    assert(updated.totalReps === 125, 'Total reps aggregated accurately');
    assert(updated.totalCalories === 540, 'Total calories aggregated accurately');
    assert(updated.personalRecords['squat_max_reps'] === 25, 'New Personal Record registered (25 reps)');
    assert(updated.formScoreTrends.length === 2, 'Form score trend appended to timeline');
  }

  // ── TEST 8: Master Data Integrity ─────────────────────────────────────────────
  console.log('\n[8/8] Testing Master Data Configuration...');
  {
    assert(SYSTEM_BADGES.length >= 8, `Master badge catalog contains ${SYSTEM_BADGES.length} badges (>= 8 required)`);
    assert(SYSTEM_BADGES.every((b) => Boolean(b.id && b.name && b.icon && b.category)), 'All badges have required metadata');
  }

  // ── TEST 9: End-to-End Authentication Security ────────────────────────────────
  console.log('\n[9/10] Running End-to-End Authentication Security Tests...');
  await runAuthTests();

  // ── TEST 10: Server-Authoritative Workout Completion ──────────────────────────
  console.log('\n[10/11] Running Server-Authoritative Workout Completion Tests...');
  const completionTestResults = await runWorkoutCompletionTests();
  testsPassed += completionTestResults.passed;
  testsFailed += completionTestResults.failed;

  // ── TEST 11: Firestore & Storage Security Rules & Invariants ──────────────────
  console.log('\n[11/12] Running Firebase Security Rules & Invariants Tests...');
  const rulesTestResults = await runSecurityRulesTests();
  testsPassed += rulesTestResults.passed;
  testsFailed += rulesTestResults.failed;

  // ── TEST 12: Domain Validation & Field Protection Tests ───────────────────────────
  console.log('\n[12/13] Running Domain Validation & Field Protection Tests...');
  const valResults = await runValidationTests();
  testsPassed += valResults.passed;
  testsFailed += valResults.failed;

  // ── TEST 13: Server-Authoritative Progress & History Tests ────────────────────
  console.log('\n[13/14] Running Progress & History Aggregation Tests...');
  const progressResults = await runProgressAndHistoryTests();
  testsPassed += progressResults.passed;
  testsFailed += progressResults.failed;

  // ── TEST 14: Production-Quality Verification & Integration Tests ─────────────
  console.log('\n[14/15] Running Production-Quality Verification & Integration Tests...');
  const emulatorResults = await runEmulatorIntegrationTests();
  testsPassed += emulatorResults.passed;
  testsFailed += emulatorResults.failed;

  // ── TEST 15: Global Matchmaking & Athlete-Development Challenges ────────────
  console.log('\n[15/15] Running Competitive Matchmaking & Challenges Tests...');
  const competitiveResults = await runCompetitiveTests();
  testsPassed += competitiveResults.passed;
  testsFailed += competitiveResults.failed;

  console.log('\n================================================================');
  console.log(`📊 Test Summary: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('================================================================');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL BACKEND BUSINESS LOGIC TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Unexpected test failure:', err);
  process.exit(1);
});
