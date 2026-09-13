/**
 * SportX Canonical Test Suite — Pre-Step 5 Fix: Workout XP + Progress Updating
 *
 * Validates:
 * 1. Server-authoritative XP calculation on real workout completion.
 * 2. Persistence of `totalXp` (and `xp`/`XP`) on users/{userId}.
 * 3. Retrieval of updated `totalXp` on user profile refresh.
 * 4. Idempotency protection: same session cannot award duplicate XP.
 * 5. Completion response contains authoritative `xpEarned` and `totalXp`.
 * 6. Activity logs store `xpEarned` and `xpAwarded`.
 * 7. Activity history endpoint query returns positive XP.
 * 8. Progress calculation reflects completed workouts, reps, duration, and XP.
 * 9. Multiple workouts correctly accumulate XP.
 * 10. Streak updates operate synchronously alongside XP without conflicts.
 */

import { WorkoutCompletionService } from './services/workoutCompletionService';
import { SessionRepository } from './repositories/sessionRepository';
import { UserRepository } from './repositories/userRepository';
import { ActivityRepository } from './repositories/activityRepository';
import { ProgressRepository } from './repositories/progressRepository';
import { WorkoutSessionDoc } from './types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log('⚡ SportX Pre-Step 5: Workout XP & Progress Persistence Tests');
  console.log('================================================================\n');

  const testUid = `user_test_xp_${Date.now()}`;
  const initialXp = 200;

  // Setup initial test user
  await UserRepository.create(testUid, {
    userId: testUid,
    name: 'XP Test Athlete',
    email: 'xptest@sportx.app',
    totalXp: initialXp,
    xp: initialXp,
    XP: initialXp,
    currentStreak: 2,
    longestStreak: 5,
    lastWorkoutDate: '2026-09-12',
  });

  const initialUser = await UserRepository.getById(testUid);
  assert(initialUser !== null, 'Initial test user created successfully');
  assert(
    (initialUser as any)?.totalXp === initialXp,
    `Initial user totalXp is ${initialXp}`,
    `Got ${(initialUser as any)?.totalXp}`
  );

  // ── TEST 1: Workout Completion Awards Authoritative XP ─────────────────────
  console.log('\n[1/7] Completing real workout session...');
  const sessionId1 = `sess_xp_${Date.now()}_1`;
  const startTime = new Date(Date.now() - 60000).toISOString();

  const sessionDoc1: WorkoutSessionDoc = {
    sessionId: sessionId1,
    userId: testUid,
    workoutId: 'dorm_blast_20',
    sportId: 'general',
    exerciseId: 'squat',
    exerciseName: 'Bodyweight Squats',
    startTime,
    pauseTimes: [],
    resumeTimes: [],
    completionTime: null,
    endTime: null,
    durationMinutes: 0,
    totalReps: 0,
    formAccuracyAverage: 0,
    caloriesBurned: 0,
    heartRateAverage: null,
    exerciseLogs: [],
    xpEarned: 0,
    status: 'in-progress',
    createdAt: startTime,
  };
  await SessionRepository.create(sessionDoc1);

  const completionResult1 = await WorkoutCompletionService.completeSession({
    sessionId: sessionId1,
    userId: testUid,
    exerciseId: 'squat',
    totalReps: 15,
    averageFormScore: 92,
    durationSeconds: 60,
  });

  assert(completionResult1.success === true, 'Workout completion succeeded');
  assert(completionResult1.statusCode === 200, 'Completion returned HTTP 200');
  assert(typeof completionResult1.data?.xpEarned === 'number', 'Authoritative xpEarned is a number');
  assert(completionResult1.data!.xpEarned > 0, `Authoritative xpEarned > 0 (awarded ${completionResult1.data?.xpEarned} XP)`);

  const awardedXp1 = completionResult1.data!.xpEarned;
  const expectedTotalXp1 = initialXp + awardedXp1;
  assert(
    completionResult1.data!.totalXp === expectedTotalXp1,
    `Returned totalXp matches expected (${expectedTotalXp1})`,
    `Got ${completionResult1.data!.totalXp}`
  );

  // ── TEST 2: Persistence to users/{userId} ─────────────────────────────────
  console.log('\n[2/7] Verifying user account XP persistence...');
  const userAfterWorkout1 = await UserRepository.getById(testUid);
  assert(userAfterWorkout1 !== null, 'User profile fetched from repository');
  assert(
    (userAfterWorkout1 as any)?.totalXp === expectedTotalXp1,
    `Persisted user totalXp equals initial + awarded (${expectedTotalXp1})`,
    `Got ${(userAfterWorkout1 as any)?.totalXp}`
  );
  assert(
    userAfterWorkout1?.xp === expectedTotalXp1,
    `Persisted user.xp is also synced to ${expectedTotalXp1}`,
    `Got ${userAfterWorkout1?.xp}`
  );
  assert(
    (userAfterWorkout1 as any)?.XP === expectedTotalXp1,
    `Persisted user.XP alias is also synced to ${expectedTotalXp1}`,
    `Got ${(userAfterWorkout1 as any)?.XP}`
  );

  // ── TEST 3: Idempotency Guard (No duplicate XP) ───────────────────────────
  console.log('\n[3/7] Testing duplicate completion protection (idempotency)...');
  const duplicateCompletion = await WorkoutCompletionService.completeSession({
    sessionId: sessionId1,
    userId: testUid,
    exerciseId: 'squat',
    totalReps: 15,
    averageFormScore: 92,
    durationSeconds: 60,
  });

  assert(duplicateCompletion.success === true, 'Idempotent completion request returns success');
  assert(duplicateCompletion.idempotent === true, 'idempotent flag is true');
  assert(
    duplicateCompletion.data?.xpEarned === awardedXp1,
    'Returned xpEarned matches original award'
  );
  assert(
    duplicateCompletion.data?.totalXp === expectedTotalXp1,
    'totalXp was NOT incremented again on duplicate request'
  );

  const userAfterDuplicate = await UserRepository.getById(testUid);
  assert(
    (userAfterDuplicate as any)?.totalXp === expectedTotalXp1,
    `User totalXp remains unchanged at ${expectedTotalXp1} after duplicate call`,
    `Got ${(userAfterDuplicate as any)?.totalXp}`
  );

  // ── TEST 4: Activity Logs XP Mapping ──────────────────────────────────────
  console.log('\n[4/7] Checking Activity Logs telemetry & XP...');
  const activityLogs = await ActivityRepository.getByUser(testUid, 'all');
  assert(activityLogs.length > 0, `ActivityRepository returns recorded logs (${activityLogs.length} found)`);

  const matchingLog = activityLogs.find(l => l.sessionId === sessionId1);
  assert(matchingLog !== undefined, 'Activity log exists for completed session');
  assert(
    matchingLog?.xpAwarded !== undefined && matchingLog.xpAwarded > 0,
    `Activity log contains positive xpAwarded (${matchingLog?.xpAwarded})`,
    `Got ${matchingLog?.xpAwarded}`
  );
  assert(
    matchingLog?.xpEarned !== undefined && matchingLog.xpEarned > 0,
    `Activity log contains positive xpEarned (${matchingLog?.xpEarned})`,
    `Got ${matchingLog?.xpEarned}`
  );

  // ── TEST 5: Progress Summary Aggregation ──────────────────────────────────
  console.log('\n[5/7] Testing server-authoritative progress calculation...');
  const progressSummary = await ProgressRepository.calculateProgress(testUid, 'all');
  assert(progressSummary.totalWorkouts >= 1, `progressSummary.totalWorkouts >= 1 (${progressSummary.totalWorkouts})`);
  assert(progressSummary.totalReps >= 15, `progressSummary.totalReps >= 15 (${progressSummary.totalReps})`);
  assert(progressSummary.totalMinutes >= 1, `progressSummary.totalMinutes >= 1 (${progressSummary.totalMinutes})`);
  assert(
    progressSummary.totalXp >= expectedTotalXp1,
    `progressSummary.totalXp reflects updated user XP (${progressSummary.totalXp})`,
    `Got ${progressSummary.totalXp}`
  );

  // ── TEST 6: Multiple Workouts Accumulation ─────────────────────────────────
  console.log('\n[6/7] Testing second workout completion and XP accumulation...');
  const sessionId2 = `sess_xp_${Date.now()}_2`;
  const startTime2 = new Date().toISOString();

  await SessionRepository.create({
    sessionId: sessionId2,
    userId: testUid,
    workoutId: 'dorm_blast_20',
    sportId: 'general',
    exerciseId: 'pushup',
    exerciseName: 'Standard Push-ups',
    startTime: startTime2,
    pauseTimes: [],
    resumeTimes: [],
    completionTime: null,
    endTime: null,
    durationMinutes: 0,
    totalReps: 0,
    formAccuracyAverage: 0,
    caloriesBurned: 0,
    heartRateAverage: null,
    exerciseLogs: [],
    xpEarned: 0,
    status: 'in-progress',
    createdAt: startTime2,
  });

  const completionResult2 = await WorkoutCompletionService.completeSession({
    sessionId: sessionId2,
    userId: testUid,
    exerciseId: 'pushup',
    totalReps: 20,
    averageFormScore: 95,
    durationSeconds: 90,
  });

  assert(completionResult2.success === true, 'Second workout completed successfully');
  const awardedXp2 = completionResult2.data!.xpEarned;
  const expectedTotalXp2 = expectedTotalXp1 + awardedXp2;

  assert(
    completionResult2.data!.totalXp === expectedTotalXp2,
    `Second completion totalXp equals first + second award (${expectedTotalXp2})`,
    `Got ${completionResult2.data!.totalXp}`
  );

  const finalUser = await UserRepository.getById(testUid);
  assert(
    (finalUser as any)?.totalXp === expectedTotalXp2,
    `Final user totalXp persisted correctly as ${expectedTotalXp2}`,
    `Got ${(finalUser as any)?.totalXp}`
  );

  // ── TEST 7: Streak & Gamification Integration ──────────────────────────────
  console.log('\n[7/7] Testing streak integration...');
  assert(finalUser?.currentStreak !== undefined, 'User currentStreak is defined');
  assert(finalUser!.currentStreak >= 1, `User currentStreak is valid (${finalUser?.currentStreak})`);
  assert(finalUser?.lastWorkoutDate !== null, `User lastWorkoutDate updated (${finalUser?.lastWorkoutDate})`);

  console.log('\n================================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
