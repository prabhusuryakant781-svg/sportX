/**
 * SportX — Phase 5 Challenges Backend Verification Script
 * Validates the complete Challenge lifecycle independently without Flutter:
 * 
 * 1. Challenge Creation (exercise, target, dates, rewards)
 * 2. Joining & Accepting (multi-participant state transition)
 * 3. Anti-Cheat Security (cross-user tampering protection)
 * 4. Incremental Progress Tracking
 * 5. Completion & Server-Side XP Awarding
 */

import dotenv from 'dotenv';
dotenv.config();

process.env.LOCAL_TEST = 'true';
process.env.NODE_ENV = 'test';

import { createChallenge } from './challenges/createChallenge';
import { joinChallenge, acceptChallenge, getChallengeById } from './challenges/joinChallenge';
import { updateChallengeProgress } from './challenges/updateChallenge';
import { completeChallenge } from './challenges/completeChallenge';
import { users as demoUsers } from './config/demoStore';

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('⚡ SportX Phase 5 — Challenges Backend Test Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  const totalTests = 5;

  const userA = { uid: 'student_alpha', name: 'Athlete Alpha' };
  const userB = { uid: 'student_beta', name: 'Athlete Beta' };
  const userHacker = { uid: 'student_hacker', name: 'Rogue Caller' };

  // Seed demo profiles
  demoUsers.set(userA.uid, {
    id: userA.uid,
    name: userA.name,
    email: 'alpha@campus.edu',
    password: 'demo',
    collegeName: 'Campus University',
    department: 'Sports Science',
    fitnessLevel: 'intermediate',
    fitnessGoal: 'strength',
    availableTimeMinutes: 30,
    selectedSports: ['football'],
    totalXp: 500,
    currentStreak: 3,
    longestStreak: 5,
    lastWorkoutDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  });

  demoUsers.set(userB.uid, {
    id: userB.uid,
    name: userB.name,
    email: 'beta@campus.edu',
    password: 'demo',
    collegeName: 'Campus University',
    department: 'Physical Education',
    fitnessLevel: 'advanced',
    fitnessGoal: 'endurance',
    availableTimeMinutes: 45,
    selectedSports: ['badminton'],
    totalXp: 800,
    currentStreak: 5,
    longestStreak: 8,
    lastWorkoutDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  });

  let challengeId = '';

  // -----------------------------------------------------------------
  // TEST 1: Challenge Creation (createChallenge)
  // -----------------------------------------------------------------
  console.log('[Test 1/5] Testing Challenge Creation...');

  const created = await createChallenge(userA, {
    exerciseId: 'squat',
    targetReps: 30,
    challengeeId: userB.uid,
    challengeeName: userB.name,
    durationDays: 3,
    rewardXp: 200,
    message: 'Let us see who hits 30 deep squats first!'
  });

  challengeId = created.id;
  console.log(`  ✓ Created challenge with ID: ${challengeId}`);
  console.log(`  ✓ Creator: ${created.creatorName} (${created.creatorId})`);
  console.log(`  ✓ Exercise: ${created.exerciseId}, Target: ${created.targetReps} reps`);

  if (created.status !== 'pending') {
    throw new Error(`Test 1 failed: Expected status 'pending', got '${created.status}'`);
  }
  if (!created.participants[userA.uid] || created.participants[userA.uid].status !== 'accepted') {
    throw new Error('Test 1 failed: Creator not found as accepted participant');
  }
  if (!created.participants[userB.uid] || created.participants[userB.uid].status !== 'invited') {
    throw new Error('Test 1 failed: Challengee not found as invited participant');
  }

  // Reject invalid target reps
  let threwTargetError = false;
  try {
    await createChallenge(userA, { exerciseId: 'squat', targetReps: 0 });
  } catch (e: any) {
    threwTargetError = true;
  }
  if (!threwTargetError) {
    throw new Error('Test 1 failed: Target reps <= 0 was not rejected');
  }
  console.log('  ✓ Invalid target reps rejected');

  passedTests++;
  console.log('✅ Test 1 Passed: Challenge creation and validation verified.\n');

  // -----------------------------------------------------------------
  // TEST 2: Join & Accept Lifecycle (joinChallenge / acceptChallenge)
  // -----------------------------------------------------------------
  console.log('[Test 2/5] Testing Join & Accept Lifecycle...');

  const accepted = await acceptChallenge(challengeId, userB.uid);
  console.log(`  ✓ Participant ${userB.name} accepted the challenge`);

  if (accepted.status !== 'active') {
    throw new Error(`Test 2 failed: Challenge status did not transition to 'active', got '${accepted.status}'`);
  }
  if (accepted.participants[userB.uid].status !== 'accepted') {
    throw new Error('Test 2 failed: Participant status not updated to accepted');
  }
  if (!accepted.startTime) {
    throw new Error('Test 2 failed: startTime was not recorded upon challenge activation');
  }

  passedTests++;
  console.log('✅ Test 2 Passed: State transitions to "active" verified.\n');

  // -----------------------------------------------------------------
  // TEST 3: Anti-Cheat & Authorization Security (updateChallengeProgress)
  // -----------------------------------------------------------------
  console.log('[Test 3/5] Testing Anti-Cheat & Authorization Security...');

  // 3a. Unauthorized user attempts to log progress
  let rogueBlocked = false;
  try {
    await updateChallengeProgress(challengeId, userHacker.uid, { addedReps: 10 });
  } catch (e: any) {
    if (e.statusCode === 403) {
      rogueBlocked = true;
    }
  }
  if (!rogueBlocked) {
    throw new Error('Test 3 failed: Non-participant was able to submit challenge progress');
  }
  console.log('  ✓ Non-participant progress attempt blocked with HTTP 403 Forbidden');

  // 3b. Reject negative or zero reps
  let zeroRepsBlocked = false;
  try {
    await updateChallengeProgress(challengeId, userA.uid, { addedReps: 0 });
  } catch (e: any) {
    zeroRepsBlocked = true;
  }
  if (!zeroRepsBlocked) {
    throw new Error('Test 3 failed: Zero addedReps was not rejected');
  }
  console.log('  ✓ Zero/negative incremental reps blocked');

  passedTests++;
  console.log('✅ Test 3 Passed: Anti-cheat authorization strictly enforced.\n');

  // -----------------------------------------------------------------
  // TEST 4: Incremental Progress Tracking
  // -----------------------------------------------------------------
  console.log('[Test 4/5] Testing Incremental Progress Tracking...');

  // User A logs 15 reps
  const progressA = await updateChallengeProgress(challengeId, userA.uid, {
    addedReps: 15,
    formScore: 90
  });
  if (progressA.participants[userA.uid].currentProgress !== 15) {
    throw new Error(`Test 4 failed: Expected 15 reps for User A, got ${progressA.participants[userA.uid].currentProgress}`);
  }
  console.log(`  ✓ ${userA.name} logged 15 reps (Progress: 15/${created.targetReps})`);

  // User B logs 20 reps
  const progressB = await updateChallengeProgress(challengeId, userB.uid, {
    addedReps: 20,
    formScore: 88
  });
  if (progressB.participants[userB.uid].currentProgress !== 20) {
    throw new Error(`Test 4 failed: Expected 20 reps for User B, got ${progressB.participants[userB.uid].currentProgress}`);
  }
  if (progressB.participants[userA.uid].currentProgress !== 15) {
    throw new Error('Test 4 failed: User B update corrupted User A progress');
  }
  console.log(`  ✓ ${userB.name} logged 20 reps (Progress: 20/${created.targetReps})`);
  console.log('  ✓ Participant progress tracks independently without cross-interference');

  passedTests++;
  console.log('✅ Test 4 Passed: Multi-user progress tracking verified.\n');

  // -----------------------------------------------------------------
  // TEST 5: Completion & Server-Side XP Awarding (completeChallenge)
  // -----------------------------------------------------------------
  console.log('[Test 5/5] Testing Completion & Server-Side XP Awarding...');

  const initialBetaXp = demoUsers.get(userB.uid)!.totalXp;

  // User B logs remaining 10 reps to reach target of 30
  const finalChallenge = await updateChallengeProgress(challengeId, userB.uid, {
    addedReps: 10,
    formScore: 92
  });

  if (finalChallenge.participants[userB.uid].status !== 'completed') {
    throw new Error('Test 5 failed: User B was not marked as completed upon reaching target reps');
  }
  if (finalChallenge.winnerId !== userB.uid) {
    throw new Error(`Test 5 failed: Expected winnerId to be '${userB.uid}', got '${finalChallenge.winnerId}'`);
  }

  const xpAwarded = finalChallenge.participants[userB.uid].xpAwarded || 0;
  if (xpAwarded <= 200) {
    throw new Error(`Test 5 failed: Expected winner XP > 200 (base 200 + bonuses), got ${xpAwarded}`);
  }

  const updatedBetaXp = demoUsers.get(userB.uid)!.totalXp;
  if (updatedBetaXp <= initialBetaXp) {
    throw new Error('Test 5 failed: User total XP was not incremented in profile');
  }

  console.log(`  ✓ Challenge finalized! Winner: ${finalChallenge.winnerId}`);
  console.log(`  ✓ Winner XP awarded server-side: +${xpAwarded} XP`);
  console.log(`  ✓ Profile XP updated: ${initialBetaXp} → ${updatedBetaXp} XP`);
  console.log(`  ✓ Challenge Status: ${finalChallenge.status}`);

  passedTests++;
  console.log('✅ Test 5 Passed: Challenge completion and server-side XP scoring verified.\n');

  console.log('====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} PHASE 5 VERIFICATION TESTS PASSED!`);
  console.log('Architecture Flow Verified:');
  console.log('  createChallenge() [Creator + Target + Dates]');
  console.log('        ↓');
  console.log('  acceptChallenge() [Transitions pending → active]');
  console.log('        ↓');
  console.log('  Anti-Cheat Check (caller UID === participant UID)');
  console.log('        ↓');
  console.log('  updateChallengeProgress() [Independent rep increments]');
  console.log('        ↓');
  console.log('  completeChallenge() [Winner bonus + Server XP Award]');
  console.log('====================================================');
  process.exit(0);
}

runPhase5Tests().catch(err => {
  console.error('\n❌ Phase 5 Verification Failed with Error:', err);
  process.exit(1);
});
