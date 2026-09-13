/**
 * SportX Canonical Test Suite — Step 3: Streak Tracking & Rewards Logic
 *
 * Exercises the production GamificationService, UserRepository, StreakRepository,
 * WorkoutCompletionService, and CompetitiveMatchmakingService.
 *
 * Tests:
 * 1. First qualifying completion -> streak 1
 * 2. Consecutive day completion -> streak increments
 * 3. Same-day second completion -> streak does NOT increment again
 * 4. Missed day -> next completion starts streak at 1
 * 5. Best streak updates correctly
 * 6. Best streak never decreases
 * 7. Duplicate completion request -> only one streak increment (idempotency)
 * 8. Workout completion updates streak
 * 9. Lobby challenge completion updates streak
 * 10. Opening workout does NOT update streak
 * 11. Starting workout does NOT update streak
 * 12. Abandoning workout does NOT update streak
 * 13. Unauthenticated request is rejected
 * 14. Non-existent session failure does not produce fake success
 * 15. 3-day milestone unlocks once
 * 16. 7-day milestone unlocks once
 * 17. 14-day milestone unlocks once
 * 18. 30-day milestone unlocks once
 */

process.env.LOCAL_TEST = 'true';
process.env.NODE_ENV = 'test';

import { GamificationService, SYSTEM_BADGES } from './services/gamificationService';
import { UserRepository } from './repositories/userRepository';
import { StreakRepository } from './repositories/streakRepository';
import { SessionRepository } from './repositories/sessionRepository';
import { ExerciseRepository } from './repositories/exerciseRepository';
import { WorkoutCompletionService } from './services/workoutCompletionService';
import { CompetitiveMatchmakingService } from './services/competitiveMatchmakingService';
import { CompetitiveRepository } from './repositories/competitiveRepository';
import { SEED_CHALLENGES } from './services/competitiveMatchmakingService';

function assert(condition: boolean, message: string, detail?: any) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`, detail !== undefined ? detail : '');
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASSED: ${message}`);
}

async function runStreakTests() {
  console.log('===============================================================');
  console.log('🔥 RUNNING SPORTX STEP 3 STREAK & REWARDS TEST SUITE');
  console.log('===============================================================\n');

  // ── TEST 1: First Qualifying Completion -> Streak 1 ────────────
  console.log('[Test 1] First qualifying completion initializes streak to 1...');
  {
    const res = GamificationService.evaluateStreak({
      lastWorkoutDate: null,
      currentStreak: 0,
      longestStreak: 0,
      sessionDate: '2026-09-01',
    });
    assert(res.currentStreak === 1, 'First completion sets currentStreak = 1');
    assert(res.longestStreak === 1, 'First completion sets longestStreak = 1');
    assert(res.streakIncremented === true, 'First completion marks streakIncremented = true');
  }

  // ── TEST 2: Consecutive Day Completion -> Increments ──────────
  console.log('\n[Test 2] Consecutive calendar day completion increments streak...');
  {
    const day2 = GamificationService.evaluateStreak({
      lastWorkoutDate: '2026-09-01',
      currentStreak: 1,
      longestStreak: 1,
      sessionDate: '2026-09-02',
    });
    assert(day2.currentStreak === 2, 'Day 2 sets currentStreak = 2');
    assert(day2.longestStreak === 2, 'Day 2 sets longestStreak = 2');
    assert(day2.streakIncremented === true, 'Day 2 marks streakIncremented = true');

    const day3 = GamificationService.evaluateStreak({
      lastWorkoutDate: '2026-09-02',
      currentStreak: 2,
      longestStreak: 2,
      sessionDate: '2026-09-03',
    });
    assert(day3.currentStreak === 3, 'Day 3 sets currentStreak = 3');
    assert(day3.longestStreak === 3, 'Day 3 sets longestStreak = 3');
    assert(day3.streakIncremented === true, 'Day 3 marks streakIncremented = true');
  }

  // ── TEST 3: Same-Day Second Completion -> Does NOT Increment ──
  console.log('\n[Test 3] Same-day multiple completions do NOT increment streak again...');
  {
    const sameDay = GamificationService.evaluateStreak({
      lastWorkoutDate: '2026-09-03',
      currentStreak: 3,
      longestStreak: 3,
      sessionDate: '2026-09-03',
    });
    assert(sameDay.currentStreak === 3, 'Second completion on same day maintains currentStreak = 3');
    assert(sameDay.streakIncremented === false, 'Same-day completion marks streakIncremented = false');
  }

  // ── TEST 4: Missed Day -> Resets Streak to 1 ───────────────────
  console.log('\n[Test 4] Missed calendar day resets currentStreak to 1 on next activity...');
  {
    // Last activity 2026-09-03, skipped 2026-09-04, next activity 2026-09-05
    const afterMissed = GamificationService.evaluateStreak({
      lastWorkoutDate: '2026-09-03',
      currentStreak: 3,
      longestStreak: 3,
      sessionDate: '2026-09-05',
    });
    assert(afterMissed.currentStreak === 1, 'Current streak resets to 1 after missing a day');
    assert(afterMissed.streakIncremented === true, 'Reset counts as new streak start');
  }

  // ── TEST 5 & 6: Best Streak Updates and NEVER Decreases ────────
  console.log('\n[Test 5 & 6] Best streak updates and never decreases...');
  {
    const afterMissed = GamificationService.evaluateStreak({
      lastWorkoutDate: '2026-09-03',
      currentStreak: 3,
      longestStreak: 5,
      sessionDate: '2026-09-05',
    });
    assert(afterMissed.currentStreak === 1, 'Current streak resets to 1');
    assert(afterMissed.longestStreak === 5, 'Best streak (5) NEVER decreases despite reset', afterMissed);
  }

  // ── TEST 7: Duplicate Completion Request (Idempotency) ────────
  console.log('\n[Test 7] Duplicate completion request causes zero extra streak increments...');
  {
    const userId = `user_idem_test_${Date.now()}`;
    const sessionId = `sess_idem_test_${Date.now()}`;

    await UserRepository.create(userId, {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
    });

    await SessionRepository.create({
      sessionId,
      userId,
      workoutId: 'w_test',
      sportId: 'general',
      exerciseId: 'squat',
      exerciseName: 'Squat',
      status: 'in-progress',
      startTime: new Date().toISOString(),
      endTime: null,
      totalReps: 0,
      formAccuracyAverage: 0,
      durationMinutes: 1,
      durationSeconds: 60,
      caloriesBurned: 0,
      heartRateAverage: null,
      exerciseLogs: [],
      xpEarned: 0,
      createdAt: new Date().toISOString(),
    });

    // First completion
    const res1 = await WorkoutCompletionService.completeSession({
      sessionId,
      userId,
      totalReps: 15,
      durationSeconds: 60,
      averageFormScore: 88,
      exerciseId: 'squat',
    });
    assert(res1.statusCode === 200, 'Initial completion returns 200');
    assert(res1.data?.currentStreak === 1, 'First completion sets currentStreak = 1');

    // Duplicate completion
    const res2 = await WorkoutCompletionService.completeSession({
      sessionId,
      userId,
      totalReps: 15,
      durationSeconds: 60,
      averageFormScore: 88,
      exerciseId: 'squat',
    });
    assert(res2.statusCode === 200, 'Duplicate completion returns 200');
    assert(res2.idempotent === true, 'Duplicate completion marked as idempotent');
    assert(res2.data?.currentStreak === 1, 'Duplicate completion did NOT increment streak again');

    const userInDb = await UserRepository.getById(userId);
    assert(userInDb?.currentStreak === 1, 'Database currentStreak remains strictly 1');
  }

  // ── TEST 8: Workout Completion Updates Streak ──────────────────
  console.log('\n[Test 8] Workout completion updates streak and persists in user profile & streak doc...');
  {
    const userId = `user_wk_test_${Date.now()}`;
    const sessionId = `sess_wk_test_${Date.now()}`;

    await UserRepository.create(userId, { userId, currentStreak: 0, longestStreak: 0 });
    await SessionRepository.create({
      sessionId,
      userId,
      workoutId: 'w_test',
      sportId: 'general',
      exerciseId: 'squat',
      exerciseName: 'Squat',
      status: 'in-progress',
      startTime: new Date().toISOString(),
      endTime: null,
      totalReps: 0,
      formAccuracyAverage: 0,
      durationMinutes: 1,
      durationSeconds: 60,
      caloriesBurned: 0,
      heartRateAverage: null,
      exerciseLogs: [],
      xpEarned: 0,
      createdAt: new Date().toISOString(),
    });

    const res = await WorkoutCompletionService.completeSession({
      sessionId,
      userId,
      totalReps: 12,
      durationSeconds: 60,
      averageFormScore: 85,
      exerciseId: 'squat',
    });

    assert(res.statusCode === 200, 'Workout completed successfully');
    assert(res.data?.currentStreak === 1, 'Response contains currentStreak = 1');
    assert(res.data?.bestStreak === 1, 'Response contains bestStreak = 1');

    const user = await UserRepository.getById(userId);
    assert(user?.currentStreak === 1, 'User doc has currentStreak = 1');
    assert(user?.longestStreak === 1, 'User doc has longestStreak = 1');
    assert(user?.bestStreak === 1, 'User doc has bestStreak = 1');
    assert(!!user?.lastWorkoutDate, 'User doc has lastWorkoutDate set');
    assert(!!user?.lastActivityDate, 'User doc has lastActivityDate set');
  }

  // ── TEST 9: Lobby Challenge Completion Updates Streak ──────────
  console.log('\n[Test 9] Competitive Lobby challenge completion updates streak...');
  {
    const userId = `user_lobby_test_${Date.now()}`;
    const matchId = `match_lobby_test_${Date.now()}`;

    await UserRepository.create(userId, { userId, currentStreak: 0, longestStreak: 0 });

    const testChallenge = SEED_CHALLENGES[0];
    await CompetitiveRepository.createMatch({
      matchId,
      challengeId: testChallenge.challengeId,
      challenge: testChallenge,
      players: [
        {
          userId,
          displayName: 'Lobby Athlete',
          avatarUrl: '',
          rankTier: 'Bronze',
          rankPoints: 100,
          isSimulated: false,
          ready: true,
          completed: true,
          telemetry: { reps: 15, formScore: 90, verifiedScore: 13, lastUpdated: new Date().toISOString() },
        },
        {
          userId: 'sim_user_99',
          displayName: 'Simulated Rival',
          avatarUrl: '',
          rankTier: 'Bronze',
          rankPoints: 100,
          isSimulated: true,
          ready: true,
          completed: true,
          telemetry: { reps: 10, formScore: 80, verifiedScore: 8, lastUpdated: new Date().toISOString() },
        },
      ],
      targetPlayers: 2,
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const finalized = await CompetitiveMatchmakingService.finalizeMatch(matchId, userId);
    assert(finalized.status === 'COMPLETED', 'Competitive match status is COMPLETED');

    const user = await UserRepository.getById(userId);
    assert(user?.currentStreak === 1, 'Lobby challenge completion updated currentStreak to 1');
    assert(user?.longestStreak === 1, 'Lobby challenge completion updated longestStreak to 1');
    assert(user?.bestStreak === 1, 'Lobby challenge completion updated bestStreak to 1');
    assert(!!user?.lastActivityDate, 'Lobby challenge completion set lastActivityDate');
  }

  // ── TEST 10: Opening Workout Does NOT Update Streak ────────────
  console.log('\n[Test 10] Opening / inspecting an exercise does NOT update streak...');
  {
    const userId = `user_view_test_${Date.now()}`;
    await UserRepository.create(userId, { userId, currentStreak: 0, longestStreak: 0 });

    const ex = await ExerciseRepository.getById('squat');
    assert(!!ex, 'Exercise catalog inspected');

    const user = await UserRepository.getById(userId);
    assert(user?.currentStreak === 0, 'Inspecting exercise did NOT increment streak');
  }

  // ── TEST 11: Starting Workout Does NOT Update Streak ───────────
  console.log('\n[Test 11] Starting a workout session does NOT update streak...');
  {
    const userId = `user_start_test_${Date.now()}`;
    const sessionId = `sess_start_test_${Date.now()}`;
    await UserRepository.create(userId, { userId, currentStreak: 0, longestStreak: 0 });

    await SessionRepository.create({
      sessionId,
      userId,
      workoutId: 'w_test',
      sportId: 'general',
      exerciseId: 'squat',
      exerciseName: 'Squat',
      status: 'in-progress',
      startTime: new Date().toISOString(),
      endTime: null,
      totalReps: 0,
      formAccuracyAverage: 0,
      durationMinutes: 0,
      durationSeconds: 0,
      caloriesBurned: 0,
      heartRateAverage: null,
      exerciseLogs: [],
      xpEarned: 0,
      createdAt: new Date().toISOString(),
    });

    const user = await UserRepository.getById(userId);
    assert(user?.currentStreak === 0, 'Starting session did NOT increment streak');
  }

  // ── TEST 12: Abandoning Workout Does NOT Update Streak ─────────
  console.log('\n[Test 12] Abandoning / cancelling a workout does NOT update streak...');
  {
    const userId = `user_cancel_test_${Date.now()}`;
    const sessionId = `sess_cancel_test_${Date.now()}`;
    await UserRepository.create(userId, { userId, currentStreak: 0, longestStreak: 0 });

    await SessionRepository.create({
      sessionId,
      userId,
      workoutId: 'w_test',
      sportId: 'general',
      exerciseId: 'squat',
      exerciseName: 'Squat',
      status: 'cancelled',
      startTime: new Date().toISOString(),
      endTime: null,
      totalReps: 2,
      formAccuracyAverage: 50,
      durationMinutes: 1,
      durationSeconds: 15,
      caloriesBurned: 0,
      heartRateAverage: null,
      exerciseLogs: [],
      xpEarned: 0,
      createdAt: new Date().toISOString(),
    });

    const res = await WorkoutCompletionService.completeSession({
      sessionId,
      userId,
      totalReps: 2,
      durationSeconds: 15,
      averageFormScore: 50,
      exerciseId: 'squat',
    });

    assert(res.statusCode === 400, 'Attempt to complete cancelled session rejected with 400');
    const user = await UserRepository.getById(userId);
    assert(user?.currentStreak === 0, 'Cancelled session did NOT increment streak');
  }

  // ── TEST 13: Unauthenticated Request is Rejected ──────────────
  console.log('\n[Test 13] Unauthenticated completion request is rejected...');
  {
    const res = await WorkoutCompletionService.completeSession({
      sessionId: 'sess_unauth',
      userId: '',
    });
    assert(res.statusCode === 401, 'Empty userId rejected with 401 Unauthorized');
  }

  // ── TEST 14: Non-existent Session Does Not Produce Fake Success ─
  console.log('\n[Test 14] Non-existent session returns 404 without fake success...');
  {
    const res = await WorkoutCompletionService.completeSession({
      sessionId: 'sess_nonexistent_99999',
      userId: 'user_any',
    });
    assert(res.statusCode === 404, 'Non-existent session returned 404 Not Found');
    assert(res.success === false, 'success is false');
  }

  // ── TEST 15, 16, 17, 18: Streak Milestones (3, 7, 14, 30 days) ───
  console.log('\n[Test 15-18] Streak milestone badges (3, 7, 14, 30 days) unlock once and never duplicate...');
  {
    // Check 3-day milestone
    const badges3 = GamificationService.evaluateUnlockedBadges({
      currentBadges: [],
      totalWorkouts: 3,
      totalReps: 50,
      totalXP: 500,
      currentStreak: 3,
    });
    assert(badges3.newBadges.some((b) => b.id === 'streak_3'), 'streak_3 unlocked at 3-day streak');

    // Check that having streak_3 prevents unlocking it again
    const badges3Duplicate = GamificationService.evaluateUnlockedBadges({
      currentBadges: ['streak_3'],
      totalWorkouts: 4,
      totalReps: 75,
      totalXP: 700,
      currentStreak: 4,
    });
    assert(!badges3Duplicate.newBadges.some((b) => b.id === 'streak_3'), 'streak_3 is NOT re-awarded on day 4');

    // Check 7-day milestone
    const badges7 = GamificationService.evaluateUnlockedBadges({
      currentBadges: ['streak_3'],
      totalWorkouts: 7,
      totalReps: 150,
      totalXP: 1200,
      currentStreak: 7,
    });
    assert(badges7.newBadges.some((b) => b.id === 'streak_7'), 'streak_7 unlocked at 7-day streak');

    // Check 14-day milestone
    const badges14 = GamificationService.evaluateUnlockedBadges({
      currentBadges: ['streak_3', 'streak_7'],
      totalWorkouts: 14,
      totalReps: 300,
      totalXP: 2500,
      currentStreak: 14,
    });
    assert(badges14.newBadges.some((b) => b.id === 'streak_14'), 'streak_14 unlocked at 14-day streak');

    // Check 30-day milestone
    const badges30 = GamificationService.evaluateUnlockedBadges({
      currentBadges: ['streak_3', 'streak_7', 'streak_14'],
      totalWorkouts: 30,
      totalReps: 600,
      totalXP: 5000,
      currentStreak: 30,
    });
    assert(badges30.newBadges.some((b) => b.id === 'streak_30'), 'streak_30 unlocked at 30-day streak');
    assert(badges30.allBadges.includes('streak_30'), 'streak_30 added to allBadges list');
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL 18 STREAK TRACKING & REWARD TESTS PASSED PERFECTLY!');
  console.log('===============================================================\n');
}

runStreakTests().catch((err) => {
  console.error('\n❌ STREAK TEST SUITE FAILED:', err);
  process.exit(1);
});
