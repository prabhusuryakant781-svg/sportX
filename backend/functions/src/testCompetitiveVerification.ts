/**
 * SportX Canonical Test Suite — Step 5: Competitive Verification Lifecycle
 *
 * Tests all 12 Phases/Test specifications from Phase 16:
 * TEST 1: Valid competitive challenge completion (camera result accepted, RP/XP/streak awarded)
 * TEST 2: Insufficient reps (Required = 20, valid = 15; no false win reward)
 * TEST 3: Exercise mismatch (Challenge = squat, submitted = pushup; rejected)
 * TEST 4: Unauthorized user (User not in match; rejected)
 * TEST 5: Invalid match (Match does not exist; rejected)
 * TEST 6: Duplicate finalization (Idempotency: exactly 1 reward awarded, 2nd call = 0 extra)
 * TEST 7: Malformed VisionResult / Anti-cheat triggers (negative reps, valid > reps, form > 100, impossible cadence)
 * TEST 8: Match already completed (Idempotent return)
 * TEST 9: RP integration (Step 4 RP formula, tier bounds, Diamond maximum)
 * TEST 10: XP integration (Authoritative totalXp and xp persistence in users/{userId})
 * TEST 11: Streak integration (Idempotent same-day streak preservation)
 * TEST 12: Badge integration (Idempotent badge evaluation on qualifying activity)
 */

process.env.LOCAL_TEST = 'true';
process.env.NODE_ENV = 'test';

import {
  CompetitiveMatchmakingService,
  SEED_CHALLENGES,
  getChallengeExerciseId,
  getChallengeTargetReps,
} from './services/competitiveMatchmakingService';
import { CompetitiveRepository } from './repositories/competitiveRepository';
import { UserRepository } from './repositories/userRepository';
import {
  CompetitiveMatchDoc,
  CompetitiveVerificationPayload,
} from './types/competitive';

function assert(condition: boolean, message: string, detail?: any) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`, detail !== undefined ? detail : '');
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASSED: ${message}`);
}

async function createMockCompetitiveMatch(params: {
  matchId: string;
  userId: string;
  challengeIndex?: number;
  initialPlayerRP?: number;
}): Promise<CompetitiveMatchDoc> {
  const challenge = SEED_CHALLENGES[params.challengeIndex ?? 0];
  const now = new Date().toISOString();

  const matchDoc: CompetitiveMatchDoc = {
    matchId: params.matchId,
    challengeId: challenge.challengeId,
    challenge,
    targetPlayers: 2,
    status: 'IN_PROGRESS',
    players: [
      {
        userId: params.userId,
        displayName: 'Verified Athlete',
        rankTier: 'Bronze',
        rankPoints: params.initialPlayerRP ?? 100,
        isSimulated: false,
        ready: true,
        completed: false,
        telemetry: { reps: 0, formScore: 85, verifiedScore: 0, lastUpdated: now },
      },
      {
        userId: `sim_bot_${Date.now()}`,
        displayName: '⚡ DevBot (Simulated)',
        rankTier: 'Bronze',
        rankPoints: 100,
        isSimulated: true,
        ready: true,
        completed: false,
        telemetry: { reps: 10, formScore: 80, verifiedScore: 8, lastUpdated: now },
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  await CompetitiveRepository.createMatch(matchDoc);
  return matchDoc;
}

async function runStep5TestSuite() {
  console.log('===============================================================');
  console.log('🧪 RUNNING SPORTX STEP 5: COMPETITIVE VERIFICATION TEST SUITE');
  console.log('===============================================================\n');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: Valid competitive challenge completion
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Valid Competitive Challenge Completion ---');
  const user1 = `user_step5_t1_${Date.now()}`;
  await UserRepository.create(user1, { name: 'Verified User 1' });
  const match1 = await createMockCompetitiveMatch({
    matchId: `match_t1_${Date.now()}`,
    userId: user1,
    initialPlayerRP: 100,
  });

  const validPayload: CompetitiveVerificationPayload = {
    sessionId: `sess_t1_${Date.now()}`,
    exerciseId: 'squat',
    reps: 20,
    validReps: 20,
    formScore: 92,
    durationSeconds: 45,
    confidence: 0.94,
    visionResult: { visionVersion: '2.0.0-mediapipe' },
  };

  const finalMatch1 = await CompetitiveMatchmakingService.verifyAndFinalizeMatch(
    match1.matchId,
    user1,
    validPayload
  );

  assert(finalMatch1.status === 'COMPLETED', 'Match status is COMPLETED');
  assert(finalMatch1.results !== undefined, 'Match contains results object');
  assert(finalMatch1.results?.winnerId === user1, 'Authenticated user is marked match winner');

  const p1Result = finalMatch1.results?.leaderboard.find((l) => l.userId === user1);
  assert(p1Result?.outcome === 'WIN', 'User placement outcome is WIN');
  assert(p1Result?.placement === 1, 'User placement is 1st place');
  assert((p1Result?.rankPointsChange || 0) > 0, 'RP gained is positive for WIN');
  assert(p1Result?.xpEarned === match1.challenge.rewards.firstPlace.xp, 'First place XP correctly awarded');

  const updatedUser1 = await UserRepository.getById(user1);
  assert((updatedUser1?.totalXp || 0) >= match1.challenge.rewards.firstPlace.xp, 'User totalXp persisted to profile');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: Insufficient reps (Target not met)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Insufficient Reps (Target Not Met) ---');
  const user2 = `user_step5_t2_${Date.now()}`;
  await UserRepository.create(user2, { name: 'Insufficient Reps User' });
  const match2 = await createMockCompetitiveMatch({
    matchId: `match_t2_${Date.now()}`,
    userId: user2,
    initialPlayerRP: 200,
  });

  // Target for cricket_rapid_catch is 20 squats; user only completed 15 valid reps
  const insufficientPayload: CompetitiveVerificationPayload = {
    sessionId: `sess_t2_${Date.now()}`,
    exerciseId: 'squat',
    reps: 15,
    validReps: 15,
    formScore: 90,
    durationSeconds: 40,
    confidence: 0.92,
  };

  const finalMatch2 = await CompetitiveMatchmakingService.verifyAndFinalizeMatch(
    match2.matchId,
    user2,
    insufficientPayload
  );

  const p2Result = finalMatch2.results?.leaderboard.find((l) => l.userId === user2);
  assert(p2Result?.outcome === 'LOSS', 'Insufficient reps results in LOSS outcome, not WIN');
  assert(p2Result?.placement === 2, 'User placed 2nd due to failing challenge target');
  assert(finalMatch2.results?.winnerId !== user2, 'User is NOT the winner when target reps not achieved');
  assert(
    p2Result?.xpEarned === match2.challenge.rewards.secondPlace.xp,
    'Awarded secondPlace loss XP instead of firstPlace XP'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: Exercise mismatch
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Exercise Mismatch Rejection ---');
  const user3 = `user_step5_t3_${Date.now()}`;
  await UserRepository.create(user3, { name: 'Mismatch User' });
  const match3 = await createMockCompetitiveMatch({
    matchId: `match_t3_${Date.now()}`,
    userId: user3,
  });

  let exerciseMismatchCaught = false;
  try {
    // Challenge requires squat; user sends pushup
    await CompetitiveMatchmakingService.verifyAndFinalizeMatch(match3.matchId, user3, {
      exerciseId: 'pushup',
      reps: 20,
      validReps: 20,
      formScore: 90,
      durationSeconds: 45,
    });
  } catch (err: any) {
    exerciseMismatchCaught = true;
    assert(err.message.includes('Exercise mismatch'), 'Error message identifies exercise mismatch');
  }
  assert(exerciseMismatchCaught, 'Server rejected exercise mismatch submission');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4: Unauthorized user
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Unauthorized User Rejection ---');
  const unauthorizedUser = `unauthorized_intruder_${Date.now()}`;
  let unauthorizedCaught = false;
  try {
    await CompetitiveMatchmakingService.verifyAndFinalizeMatch(match1.matchId, unauthorizedUser, {
      exerciseId: 'squat',
      reps: 20,
      validReps: 20,
    });
  } catch (err: any) {
    unauthorizedCaught = true;
    assert(err.message.includes('not a participant'), 'Error rejects non-participant user');
  }
  assert(unauthorizedCaught, 'Server rejected unauthorized user');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5: Invalid match
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: Non-Existent Match Rejection ---');
  let invalidMatchCaught = false;
  try {
    await CompetitiveMatchmakingService.verifyAndFinalizeMatch('non_existent_match_9999', user1);
  } catch (err: any) {
    invalidMatchCaught = true;
    assert(err.message.includes('Match not found'), 'Error identifies missing match');
  }
  assert(invalidMatchCaught, 'Server rejected non-existent match');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 6: Duplicate finalization / Idempotency
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 6: Idempotency (Duplicate Finalization) ---');
  const user6 = `user_step5_t6_${Date.now()}`;
  await UserRepository.create(user6, { name: 'Idempotent User' });
  const match6 = await createMockCompetitiveMatch({
    matchId: `match_t6_${Date.now()}`,
    userId: user6,
    initialPlayerRP: 100,
  });

  const run1 = await CompetitiveMatchmakingService.verifyAndFinalizeMatch(match6.matchId, user6, {
    exerciseId: 'squat',
    reps: 20,
    validReps: 20,
    formScore: 95,
    durationSeconds: 40,
  });

  const userAfterRun1 = await UserRepository.getById(user6);
  const xpAfterRun1 = userAfterRun1?.totalXp || 0;
  const rankAfterRun1 = await CompetitiveRepository.getUserRank(user6, match6.challenge.sportId);

  // Submit second finalization for same match
  const run2 = await CompetitiveMatchmakingService.verifyAndFinalizeMatch(match6.matchId, user6, {
    exerciseId: 'squat',
    reps: 20,
    validReps: 20,
    formScore: 95,
    durationSeconds: 40,
  });

  const userAfterRun2 = await UserRepository.getById(user6);
  const rankAfterRun2 = await CompetitiveRepository.getUserRank(user6, match6.challenge.sportId);

  assert(run2.matchId === run1.matchId, 'Second call returns same match document');
  assert(userAfterRun2?.totalXp === xpAfterRun1, 'User totalXp does NOT increase on duplicate call');
  assert(rankAfterRun2.rankPoints === rankAfterRun1.rankPoints, 'User RP does NOT increase on duplicate call');
  assert(rankAfterRun2.totalMatches === rankAfterRun1.totalMatches, 'totalMatches count does NOT increment twice');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 7: Malformed VisionResult & Anti-cheat sanity checks
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 7: Anti-Cheat & Malformed Vision Checks ---');
  const user7 = `user_step5_t7_${Date.now()}`;
  await UserRepository.create(user7, { name: 'Cheater Test User' });
  const match7 = await createMockCompetitiveMatch({
    matchId: `match_t7_${Date.now()}`,
    userId: user7,
  });

  // A. Negative reps
  let negRepsCaught = false;
  try {
    await CompetitiveMatchmakingService.verifyAndFinalizeMatch(match7.matchId, user7, {
      exerciseId: 'squat',
      reps: -5,
      validReps: -5,
    });
  } catch (e: any) {
    negRepsCaught = true;
    assert(e.message.includes('negative'), 'Caught negative reps');
  }
  assert(negRepsCaught, 'Negative reps rejected');

  // B. Valid reps > total reps
  let validExceedsCaught = false;
  try {
    await CompetitiveMatchmakingService.verifyAndFinalizeMatch(match7.matchId, user7, {
      exerciseId: 'squat',
      reps: 10,
      validReps: 15,
    });
  } catch (e: any) {
    validExceedsCaught = true;
    assert(e.message.includes('exceed'), 'Caught valid reps exceeding total reps');
  }
  assert(validExceedsCaught, 'validReps > reps rejected');

  // C. Form score out of range
  let formScoreCaught = false;
  try {
    await CompetitiveMatchmakingService.verifyAndFinalizeMatch(match7.matchId, user7, {
      exerciseId: 'squat',
      reps: 20,
      validReps: 20,
      formScore: 120,
    });
  } catch (e: any) {
    formScoreCaught = true;
    assert(e.message.includes('form score'), 'Caught form score > 100');
  }
  assert(formScoreCaught, 'formScore > 100 rejected');

  // D. Impossible cadence (e.g. 50 reps in 6 seconds = 8.33 reps/sec)
  let cadenceCaught = false;
  try {
    await CompetitiveMatchmakingService.verifyAndFinalizeMatch(match7.matchId, user7, {
      exerciseId: 'squat',
      reps: 50,
      validReps: 50,
      formScore: 90,
      durationSeconds: 6,
    });
  } catch (e: any) {
    cadenceCaught = true;
    assert(e.message.includes('cadence'), 'Caught impossible repetition cadence');
  }
  assert(cadenceCaught, 'Impossible cadence rejected');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 8: Match already completed guard
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 8: Match Already Completed Guard ---');
  assert(run1.status === 'COMPLETED', 'Original match was completed');
  const reRun = await CompetitiveMatchmakingService.verifyAndFinalizeMatch(run1.matchId, user6);
  assert(reRun.status === 'COMPLETED', 'Re-fetch of completed match returns COMPLETED');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 9: RP Integration (Step 4 Ranking Rules)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 9: RP Integration (Step 4 Ranking Rules) ---');
  // Verify win RP: base 40 + form bonus 5 (formScore >= 90) = 45 RP
  const winAdjustment = CompetitiveMatchmakingService.calculateRPAdjustment({
    outcome: 'WIN',
    currentRP: 100,
    currentTier: 'Bronze',
    challengeRankPointsReward: 40,
    formScore: 92,
  });
  assert(winAdjustment.rankPointsChange === 45, 'Win with form >= 90 gives +45 RP (+5 bonus)');
  assert(winAdjustment.newRP === 145, 'New RP is 145');

  // Verify loss RP in Bronze (protection): base -10, mitigated by 5 if form >= 85
  const lossAdjustment = CompetitiveMatchmakingService.calculateRPAdjustment({
    outcome: 'LOSS',
    currentRP: 100,
    currentTier: 'Bronze',
    formScore: 88,
  });
  assert(lossAdjustment.rankPointsChange === -5, 'Bronze loss with form >= 85 is mitigated to -5 RP');

  // Clamping at 0
  const zeroClampAdjustment = CompetitiveMatchmakingService.calculateRPAdjustment({
    outcome: 'LOSS',
    currentRP: 2,
    currentTier: 'Bronze',
    formScore: 50,
  });
  assert(zeroClampAdjustment.newRP === 0, 'RP never drops below 0');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 10: Authoritative XP Integration
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 10: Authoritative XP Integration ---');
  const user10 = `user_step5_t10_${Date.now()}`;
  await UserRepository.create(user10, { name: 'XP Test Athlete' });
  const match10 = await createMockCompetitiveMatch({
    matchId: `match_t10_${Date.now()}`,
    userId: user10,
    challengeIndex: 1, // Football challenge: 250 XP for 1st place
  });

  const finalMatch10 = await CompetitiveMatchmakingService.verifyAndFinalizeMatch(
    match10.matchId,
    user10,
    {
      exerciseId: 'jumping_jacks',
      reps: 30,
      validReps: 30,
      formScore: 88,
      durationSeconds: 50,
    }
  );

  const u10Doc = await UserRepository.getById(user10);
  assert(u10Doc?.totalXp === 250, 'Authoritative totalXp accurately incremented by 250 XP');
  assert(u10Doc?.xp === 250, 'Authoritative xp field synchronized');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 11: Streak Integration
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 11: Streak Integration ---');
  // Two competitive completions on the same day should only count as one daily streak increment
  const user11 = `user_step5_t11_${Date.now()}`;
  await UserRepository.create(user11, { name: 'Streak Athlete' });

  const streakMatchA = await createMockCompetitiveMatch({
    matchId: `match_t11a_${Date.now()}`,
    userId: user11,
  });
  await CompetitiveMatchmakingService.verifyAndFinalizeMatch(streakMatchA.matchId, user11, {
    exerciseId: 'squat',
    reps: 20,
    validReps: 20,
    formScore: 90,
    durationSeconds: 40,
  });

  const u11AfterFirst = await UserRepository.getById(user11);
  const streakAfterFirst = u11AfterFirst?.currentStreak || 0;

  const streakMatchB = await createMockCompetitiveMatch({
    matchId: `match_t11b_${Date.now()}`,
    userId: user11,
  });
  await CompetitiveMatchmakingService.verifyAndFinalizeMatch(streakMatchB.matchId, user11, {
    exerciseId: 'squat',
    reps: 20,
    validReps: 20,
    formScore: 90,
    durationSeconds: 40,
  });

  const u11AfterSecond = await UserRepository.getById(user11);
  assert(
    u11AfterSecond?.currentStreak === streakAfterFirst,
    'Same-day competitive matches do NOT increment streak twice'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 12: Badge Integration
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 12: Badge Integration ---');
  const user12 = `user_step5_t12_${Date.now()}`;
  // User has 850 XP prior to match (challenge award of 200 XP will push them over 1,000 XP threshold)
  await UserRepository.create(user12, { name: 'Badge Athlete', totalXp: 850, xp: 850 });
  const match12 = await createMockCompetitiveMatch({
    matchId: `match_t12_${Date.now()}`,
    userId: user12,
  });

  await CompetitiveMatchmakingService.verifyAndFinalizeMatch(match12.matchId, user12, {
    exerciseId: 'squat',
    reps: 20,
    validReps: 20,
    formScore: 95,
    durationSeconds: 45,
  });

  const u12Doc = await UserRepository.getById(user12);
  assert(Array.isArray(u12Doc?.badges), 'User badges array exists');
  // 850 XP + 200 XP = 1050 XP unlocks 'xp_1000' ("Rising Athlete")
  assert(
    (u12Doc?.badges?.length || 0) >= 1,
    'Qualifying competitive match successfully unlocked initial milestone badge(s)'
  );
  assert(
    Boolean(u12Doc?.badges?.includes('xp_1000')),
    'Badge list contains newly earned milestone badge (xp_1000)'
  );

  // Idempotency: verify duplicate match completion does not duplicate badges
  const badgeCount = u12Doc?.badges?.length || 0;
  await CompetitiveMatchmakingService.verifyAndFinalizeMatch(match12.matchId, user12, {
    exerciseId: 'squat',
    reps: 20,
    validReps: 20,
  });
  const u12DocReRun = await UserRepository.getById(user12);
  assert(u12DocReRun?.badges?.length === badgeCount, 'Badge count remains unchanged on second submission');

  console.log('\n===============================================================');
  console.log('🎉 ALL 12 STEP 5 VERIFICATION LIFECYCLE TESTS PASSED PERFECTLY!');
  console.log('===============================================================\n');
}

runStep5TestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
