/**
 * SportX Workout Completion Integration Test Suite
 * Tests Server-Authoritative, Atomic, and Idempotent Session Completion:
 * 1. Forged Sessions (non-existent, cross-user ownership violation)
 * 2. Duplicate Requests (idempotency, zero duplicate XP/streaks/workouts)
 * 3. Concurrent Completion (race condition handling, single reward execution)
 * 4. Cancelled & Abandoned Sessions (status validation)
 * 5. Exaggerated Telemetry & Biomechanical Limits (impossible cadence, invalid reps/duration/form, unknown exercise ID)
 */

import { WorkoutCompletionService } from './services/workoutCompletionService';
import { SessionRepository } from './repositories/sessionRepository';
import { UserRepository } from './repositories/userRepository';
import { XPRepository } from './repositories/xpRepository';
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

export async function runWorkoutCompletionTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('🏋️ SportX Server-Authoritative Workout Completion Test Suite');
  console.log('================================================================\n');

  // ── TEST SUITE 1: Forged Sessions ──────────────────────────────────────────
  console.log('[1/5] Testing Forged & Cross-User Sessions...');
  {
    // 1.1 Non-existent session
    const res1 = await WorkoutCompletionService.completeSession({
      sessionId: 'forged_non_existent_session_9999',
      userId: 'user_attacker_01',
      totalReps: 15,
      durationSeconds: 60,
      exerciseId: 'squat',
    });
    assert(res1.statusCode === 404, 'Non-existent forged session returns 404', `Got ${res1.statusCode}`);
    assert(res1.success === false, 'Non-existent session completion fails');

    // 1.2 Cross-user session ownership violation
    const victimSessionId = `sess_victim_${Date.now()}`;
    await SessionRepository.create({
      sessionId: victimSessionId,
      userId: 'victim_user_01',
      workoutId: 'workout_standard',
      sportId: 'general',
      exerciseId: 'squat',
      startTime: new Date().toISOString(),
      endTime: null,
      durationMinutes: 0,
      totalReps: 0,
      formAccuracyAverage: 0,
      caloriesBurned: 0,
      heartRateAverage: null,
      exerciseLogs: [],
      xpEarned: 0,
      status: 'in-progress',
      createdAt: new Date().toISOString(),
    });

    const res2 = await WorkoutCompletionService.completeSession({
      sessionId: victimSessionId,
      userId: 'attacker_user_02', // Mismatched user!
      totalReps: 20,
      durationSeconds: 60,
      exerciseId: 'squat',
    });
    assert(res2.statusCode === 403, 'Cross-user completion attempt rejected with 403 Forbidden', `Got ${res2.statusCode}`);
    assert(res2.success === false, 'Attacker cannot complete another user session');
  }

  // ── TEST SUITE 2: Duplicate Requests & Idempotency ─────────────────────────
  console.log('\n[2/5] Testing Duplicate Requests & Reward Idempotency...');
  {
    const userId = `user_idemp_${Date.now()}`;
    const sessionId = `sess_idemp_${Date.now()}`;

    // Create active session
    await SessionRepository.create({
      sessionId,
      userId,
      workoutId: 'workout_standard',
      sportId: 'general',
      exerciseId: 'squat',
      startTime: new Date().toISOString(),
      endTime: null,
      durationMinutes: 0,
      totalReps: 0,
      formAccuracyAverage: 0,
      caloriesBurned: 0,
      heartRateAverage: null,
      exerciseLogs: [],
      xpEarned: 0,
      status: 'in-progress',
      createdAt: new Date().toISOString(),
    });

    // Request 1: Initial legitimate completion
    const res1 = await WorkoutCompletionService.completeSession({
      sessionId,
      userId,
      totalReps: 20,
      durationSeconds: 60,
      averageFormScore: 90,
      exerciseId: 'squat',
    });
    assert(res1.statusCode === 200, 'Initial workout completion succeeds with 200 OK');
    assert(res1.data?.xpEarned! > 0, 'Legitimate completion awards XP');

    const userAfterFirst = await UserRepository.getById(userId);
    const xpAfterFirst = userAfterFirst?.xp || 0;
    const workoutsAfterFirst = userAfterFirst?.totalWorkouts || 0;
    const streakAfterFirst = userAfterFirst?.currentStreak || 0;

    assert(workoutsAfterFirst === 1, 'Total workouts incremented to 1');
    assert(streakAfterFirst === 1, 'Streak initialized to 1');

    // Request 2: Duplicate completion request for same session
    const res2 = await WorkoutCompletionService.completeSession({
      sessionId,
      userId,
      totalReps: 20,
      durationSeconds: 60,
      averageFormScore: 90,
      exerciseId: 'squat',
    });
    assert(res2.statusCode === 200, 'Duplicate request succeeds idempotently with 200 OK');
    assert(res2.idempotent === true, 'Response is marked as idempotent');

    const userAfterSecond = await UserRepository.getById(userId);
    assert(
      userAfterSecond?.xp === xpAfterFirst,
      'Duplicate request did NOT add duplicate XP',
      `Before: ${xpAfterFirst}, After: ${userAfterSecond?.xp}`
    );
    assert(
      userAfterSecond?.totalWorkouts === 1,
      'Duplicate request did NOT increment total workouts',
      `Expected 1, Got: ${userAfterSecond?.totalWorkouts}`
    );
    assert(
      userAfterSecond?.currentStreak === streakAfterFirst,
      'Duplicate request did NOT duplicate streak increments'
    );
  }

  // ── TEST SUITE 3: Concurrent Completion ────────────────────────────────────
  console.log('\n[3/5] Testing Concurrent Completion (Race Condition Guard)...');
  {
    const userId = `user_concurrent_${Date.now()}`;
    const sessionId = `sess_concurrent_${Date.now()}`;

    // Initialize user and session
    await UserRepository.create(userId, { userId, xp: 0, totalWorkouts: 0 });
    await SessionRepository.create({
      sessionId,
      userId,
      workoutId: 'workout_standard',
      sportId: 'general',
      exerciseId: 'squat',
      startTime: new Date().toISOString(),
      endTime: null,
      durationMinutes: 0,
      totalReps: 0,
      formAccuracyAverage: 0,
      caloriesBurned: 0,
      heartRateAverage: null,
      exerciseLogs: [],
      xpEarned: 0,
      status: 'in-progress',
      createdAt: new Date().toISOString(),
    });

    // Fire 5 concurrent completion requests simultaneously
    const concurrentRequests = Array.from({ length: 5 }, () =>
      WorkoutCompletionService.completeSession({
        sessionId,
        userId,
        totalReps: 15,
        durationSeconds: 45,
        averageFormScore: 85,
        exerciseId: 'squat',
      })
    );

    const results = await Promise.all(concurrentRequests);

    const allSuccessful = results.every((r) => r.statusCode === 200);
    assert(allSuccessful, 'All concurrent completion calls resolved with 200 OK');

    const primaryCompletions = results.filter((r) => !r.idempotent);
    const idempotentCompletions = results.filter((r) => r.idempotent);

    assert(primaryCompletions.length === 1, 'Exactly one concurrent request executed primary completion', `Got ${primaryCompletions.length}`);
    assert(idempotentCompletions.length === 4, 'Remaining 4 concurrent requests handled idempotently', `Got ${idempotentCompletions.length}`);

    const finalUser = await UserRepository.getById(userId);
    assert(finalUser?.totalWorkouts === 1, 'Final total workouts incremented exactly once', `Got ${finalUser?.totalWorkouts}`);
    assert(
      finalUser?.xp === primaryCompletions[0].data?.xpEarned,
      'Final user XP matches exactly single completion XP without duplicates',
      `XP: ${finalUser?.xp}, Expected: ${primaryCompletions[0].data?.xpEarned}`
    );
  }

  // ── TEST SUITE 4: Cancelled & Abandoned Sessions ───────────────────────────
  console.log('\n[4/5] Testing Cancelled & Abandoned Sessions...');
  {
    const userId = `user_cancel_${Date.now()}`;

    // 4.1 Abandoned session
    const abandonedId = `sess_abandoned_${Date.now()}`;
    await SessionRepository.create({
      sessionId: abandonedId,
      userId,
      workoutId: 'workout_standard',
      sportId: 'general',
      exerciseId: 'squat',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes: 5,
      totalReps: 0,
      formAccuracyAverage: 0,
      caloriesBurned: 0,
      heartRateAverage: null,
      exerciseLogs: [],
      xpEarned: 0,
      status: 'abandoned',
      createdAt: new Date().toISOString(),
    });

    const resAbandoned = await WorkoutCompletionService.completeSession({
      sessionId: abandonedId,
      userId,
      totalReps: 10,
      durationSeconds: 30,
      exerciseId: 'squat',
    });
    assert(resAbandoned.statusCode === 400, 'Abandoned session completion rejected with 400 Bad Request');
    assert(resAbandoned.success === false, 'Abandoned session cannot be completed');

    // 4.2 Cancelled session
    const cancelledId = `sess_cancelled_${Date.now()}`;
    await SessionRepository.create({
      sessionId: cancelledId,
      userId,
      workoutId: 'workout_standard',
      sportId: 'general',
      exerciseId: 'squat',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes: 2,
      totalReps: 0,
      formAccuracyAverage: 0,
      caloriesBurned: 0,
      heartRateAverage: null,
      exerciseLogs: [],
      xpEarned: 0,
      status: 'cancelled',
      createdAt: new Date().toISOString(),
    });

    const resCancelled = await WorkoutCompletionService.completeSession({
      sessionId: cancelledId,
      userId,
      totalReps: 10,
      durationSeconds: 30,
      exerciseId: 'squat',
    });
    assert(resCancelled.statusCode === 400, 'Cancelled session completion rejected with 400 Bad Request');
    assert(resCancelled.success === false, 'Cancelled session cannot be completed');
  }

  // ── TEST SUITE 5: Exaggerated Telemetry & Cadence Validation ─────────────────
  console.log('\n[5/5] Testing Exaggerated Telemetry & Biomechanical Limits...');
  {
    const userId = `user_telemetry_${Date.now()}`;
    const createActiveSession = async (sessId: string) => {
      await SessionRepository.create({
        sessionId: sessId,
        userId,
        workoutId: 'workout_standard',
        sportId: 'general',
        exerciseId: 'squat',
        startTime: new Date().toISOString(),
        endTime: null,
        durationMinutes: 0,
        totalReps: 0,
        formAccuracyAverage: 0,
        caloriesBurned: 0,
        heartRateAverage: null,
        exerciseLogs: [],
        xpEarned: 0,
        status: 'in-progress',
        createdAt: new Date().toISOString(),
      });
    };

    // 5.1 Impossible cadence: 50 squats in 5 seconds (0.10s/rep < 0.6s/rep)
    const sess1 = `sess_cadence_${Date.now()}`;
    await createActiveSession(sess1);
    const resCadence = await WorkoutCompletionService.completeSession({
      sessionId: sess1,
      userId,
      totalReps: 50,
      durationSeconds: 5, // 0.10s per squat violates biomechanics
      exerciseId: 'squat',
    });
    assert(resCadence.statusCode === 400, 'Impossible cadence rejected with 400 Bad Request', resCadence.error);
    assert(resCadence.error?.includes('Exaggerated cadence') === true, 'Error message explicitly flags cadence anomaly');

    // 5.2 Negative reps
    const sess2 = `sess_neg_reps_${Date.now()}`;
    await createActiveSession(sess2);
    const resNegReps = await WorkoutCompletionService.completeSession({
      sessionId: sess2,
      userId,
      totalReps: -10,
      durationSeconds: 60,
      exerciseId: 'squat',
    });
    assert(resNegReps.statusCode === 400, 'Negative reps rejected with 400 Bad Request');

    // 5.3 Form score out of bounds (> 100)
    const sess3 = `sess_form_high_${Date.now()}`;
    await createActiveSession(sess3);
    const resFormHigh = await WorkoutCompletionService.completeSession({
      sessionId: sess3,
      userId,
      totalReps: 15,
      durationSeconds: 60,
      averageFormScore: 125,
      exerciseId: 'squat',
    });
    assert(resFormHigh.statusCode === 400, 'Form score > 100 rejected with 400 Bad Request');

    // 5.4 Form score out of bounds (< 0)
    const sess4 = `sess_form_low_${Date.now()}`;
    await createActiveSession(sess4);
    const resFormLow = await WorkoutCompletionService.completeSession({
      sessionId: sess4,
      userId,
      totalReps: 15,
      durationSeconds: 60,
      averageFormScore: -5,
      exerciseId: 'squat',
    });
    assert(resFormLow.statusCode === 400, 'Negative form score rejected with 400 Bad Request');

    // 5.5 Duration too short (< 5 seconds)
    const sess5 = `sess_dur_short_${Date.now()}`;
    await createActiveSession(sess5);
    const resDurShort = await WorkoutCompletionService.completeSession({
      sessionId: sess5,
      userId,
      totalReps: 1,
      durationSeconds: 2,
      exerciseId: 'squat',
    });
    assert(resDurShort.statusCode === 400, 'Duration < 5s rejected with 400 Bad Request');

    // 5.6 Unknown / forged exercise ID
    const sess6 = `sess_bad_exercise_${Date.now()}`;
    await createActiveSession(sess6);
    const resBadEx = await WorkoutCompletionService.completeSession({
      sessionId: sess6,
      userId,
      totalReps: 15,
      durationSeconds: 60,
      exerciseId: 'non_existent_exercise_matrix_jump_999',
    });
    assert(resBadEx.statusCode === 400, 'Unknown exercise ID rejected with 400 Bad Request');
  }

  console.log('\n================================================================');
  console.log(`📊 Workout Completion Test Summary: ${passed} passed, ${failed} failed.`);
  console.log('================================================================');

  if (failed === 0) {
    console.log('🎉 ALL WORKOUT COMPLETION INTEGRATION TESTS PASSED!\n');
  } else {
    console.error(`💥 ${failed} WORKOUT COMPLETION TESTS FAILED!\n`);
  }

  return { passed, failed };
}
