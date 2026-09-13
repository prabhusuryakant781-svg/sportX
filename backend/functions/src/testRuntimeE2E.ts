import { WorkoutCompletionService } from './services/workoutCompletionService';
import { UserRepository } from './repositories/userRepository';
import { ActivityRepository } from './repositories/activityRepository';
import { ProgressRepository } from './repositories/progressRepository';
import { SessionRepository } from './repositories/sessionRepository';
import { WorkoutSessionDoc } from './types';

async function runRealRuntimeE2E() {
  console.log('===============================================================');
  console.log('🚀 SPORTX: PRE-STEP 5 REAL RUNTIME END-TO-END VERIFICATION');
  console.log('===============================================================');

  const testUserId = `e2e_user_${Date.now()}`;
  const nowIso = new Date().toISOString();

  // 1. Setup real user profile in database
  console.log('\n[Step 1] Creating authentic user profile in Firestore...');
  await UserRepository.create(testUserId, {
    email: `${testUserId}@example.com`,
    name: 'Runtime E2E User',
    xp: 500,
    totalXp: 500,
    level: 2,
    currentStreak: 4,
    longestStreak: 4,
    bestStreak: 4,
    lastWorkoutDate: '2026-09-12',
    lastActivityDate: '2026-09-12',
    totalWorkouts: 8
  });

  const initialUser = await UserRepository.getById(testUserId);
  console.log(`  Initial User XP: ${initialUser?.totalXp} (xp: ${initialUser?.xp})`);
  if (initialUser?.totalXp !== 500) {
    throw new Error(`Expected initial XP to be 500, got ${initialUser?.totalXp}`);
  }

  // 2. Setup real workout session
  console.log('\n[Step 2] Creating workout session in Firestore...');
  const sessionId = `e2e_sess_${Date.now()}`;
  const sessionDoc: WorkoutSessionDoc = {
    sessionId,
    userId: testUserId,
    workoutId: 'dorm_blast_20',
    sportId: 'fitness',
    exerciseId: 'squat',
    exerciseName: 'Bodyweight Squats',
    startTime: new Date(Date.now() - 120000).toISOString(),
    pauseTimes: [],
    resumeTimes: [],
    completionTime: null,
    endTime: null,
    durationMinutes: 2,
    totalReps: 0,
    formAccuracyAverage: 0,
    caloriesBurned: 0,
    heartRateAverage: null,
    exerciseLogs: [],
    xpEarned: 0,
    status: 'in-progress',
    createdAt: new Date(Date.now() - 120000).toISOString(),
    updatedAt: new Date(Date.now() - 120000).toISOString()
  };
  await SessionRepository.create(sessionDoc);

  // 3. Complete workout using the production WorkoutCompletionService
  console.log('\n[Step 3] Submitting workout completion through WorkoutCompletionService...');
  const completionPayload = {
    userId: testUserId,
    sessionId: sessionId,
    exerciseId: 'squat',
    totalReps: 20,
    averageFormScore: 92,
    durationSeconds: 120
  };

  const completionResult = await WorkoutCompletionService.completeSession(completionPayload);
  console.log('  Completion Response:', {
    success: completionResult.success,
    statusCode: completionResult.statusCode,
    xpEarned: completionResult.data?.xpEarned,
    totalXp: completionResult.data?.totalXp,
    currentStreak: completionResult.data?.currentStreak,
    bestStreak: completionResult.data?.bestStreak
  });

  if (!completionResult.success) {
    throw new Error(`Completion failed: ${JSON.stringify(completionResult)}`);
  }
  const xpEarned = completionResult.data?.xpEarned ?? 0;
  const returnedTotalXp = completionResult.data?.totalXp ?? 0;

  if (xpEarned <= 0) {
    throw new Error(`Authoritative XP earned must be > 0, got ${xpEarned}`);
  }
  if (returnedTotalXp !== 500 + xpEarned) {
    throw new Error(`Returned totalXp (${returnedTotalXp}) != expected (${500 + xpEarned})`);
  }

  // 4. Verify Firestore persistence of user account
  console.log('\n[Step 4] Checking Firestore users/{userId} persistence...');
  const userAfterCompletion = await UserRepository.getById(testUserId);
  console.log(`  Persisted totalXp: ${userAfterCompletion?.totalXp}`);
  console.log(`  Persisted xp: ${userAfterCompletion?.xp}`);
  console.log(`  Persisted currentStreak: ${userAfterCompletion?.currentStreak}`);
  console.log(`  Persisted totalWorkouts: ${userAfterCompletion?.totalWorkouts}`);

  if (userAfterCompletion?.totalXp !== 500 + xpEarned) {
    throw new Error(`Database totalXp ${userAfterCompletion?.totalXp} mismatch with awarded XP`);
  }
  if (userAfterCompletion?.xp !== userAfterCompletion?.totalXp) {
    throw new Error(`Database user.xp (${userAfterCompletion?.xp}) not synchronized with totalXp`);
  }

  // 5. Verify Activity History and Progress endpoints
  console.log('\n[Step 5] Checking Progress & Activity History APIs...');
  const activityLogs = await ActivityRepository.getByUser(testUserId, '7d');
  console.log(`  Retrieved ${activityLogs.length} activity log(s)`);
  if (activityLogs.length === 0) {
    throw new Error('No activity logs found for completed workout!');
  }
  const latestActivity = activityLogs[0];
  console.log('  Latest Activity Log Telemetry:', {
    exerciseId: latestActivity.exerciseId,
    reps: latestActivity.reps,
    xpAwarded: latestActivity.xpAwarded,
    xpEarned: latestActivity.xpEarned,
    durationMinutes: latestActivity.durationMinutes
  });

  if (!latestActivity.xpAwarded || latestActivity.xpAwarded <= 0) {
    throw new Error(`Activity log xpAwarded is ${latestActivity.xpAwarded}, expected positive number!`);
  }

  const progressSummary7d = await ProgressRepository.calculateProgress(testUserId, '7d');
  console.log('  Calculated Progress Summary (Period: 7d):', {
    totalWorkouts: progressSummary7d.totalWorkouts,
    totalReps: progressSummary7d.totalReps,
    totalMinutes: progressSummary7d.totalMinutes,
    periodXp: progressSummary7d.totalXp,
    averageFormScore: progressSummary7d.averageFormScore
  });

  if (progressSummary7d.totalWorkouts < 1) {
    throw new Error('Progress summary totalWorkouts < 1');
  }
  if (progressSummary7d.totalReps < 19) {
    throw new Error('Progress summary totalReps < 19');
  }
  if (progressSummary7d.totalXp !== xpEarned) {
    throw new Error(`Progress 7d totalXp (${progressSummary7d.totalXp}) != xpEarned (${xpEarned})`);
  }

  const progressSummaryAll = await ProgressRepository.calculateProgress(testUserId, 'all');
  console.log('  Calculated Progress Summary (Period: all):', {
    totalWorkouts: progressSummaryAll.totalWorkouts,
    totalReps: progressSummaryAll.totalReps,
    allTimeTotalXp: progressSummaryAll.totalXp
  });

  if (progressSummaryAll.totalXp !== userAfterCompletion?.totalXp) {
    throw new Error(`Progress all-time totalXp (${progressSummaryAll.totalXp}) != User totalXp (${userAfterCompletion?.totalXp})`);
  }

  // 6. Test Idempotency: duplicate completion attempt
  console.log('\n[Step 6] Testing Idempotency & Duplicate Protection...');
  const duplicateResult = await WorkoutCompletionService.completeSession(completionPayload);
  console.log('  Duplicate Completion Response:', {
    success: duplicateResult.success,
    idempotent: duplicateResult.idempotent,
    xpEarned: duplicateResult.data?.xpEarned,
    totalXp: duplicateResult.data?.totalXp
  });

  if (!duplicateResult.idempotent) {
    throw new Error('Expected duplicate completion to return idempotent: true');
  }
  if (duplicateResult.data?.xpEarned !== xpEarned) {
    throw new Error('Duplicate response returned differing xpEarned');
  }

  const userAfterDuplicate = await UserRepository.getById(testUserId);
  console.log(`  User totalXp after duplicate request: ${userAfterDuplicate?.totalXp}`);
  if (userAfterDuplicate?.totalXp !== userAfterCompletion?.totalXp) {
    throw new Error(`Duplicate call erroneously mutated totalXp: before ${userAfterCompletion?.totalXp}, after ${userAfterDuplicate?.totalXp}`);
  }

  console.log('\n===============================================================');
  console.log('✅ ALL RUNTIME END-TO-END VERIFICATION CHECKS PASSED!');
  console.log('===============================================================');
}

runRealRuntimeE2E()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ RUNTIME E2E FAILED:', err);
    process.exit(1);
  });
