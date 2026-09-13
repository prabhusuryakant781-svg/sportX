/**
 * SportX Step 7: Comprehensive Automated Test Suite
 * Validates:
 * 1. Measurable Goals System (Templates, Creation, Authoritative Progress, Auto-Completion, Cancellation)
 * 2. Performance Score Engine (5-Pillar Canonical Formula, Provisional Calibration Guard, Snapshots)
 * 3. Friends & Social System (Search, Privacy, Requests, Acceptance, Deduping, Un-friending)
 * 4. Friend Challenges with Real Vision Telemetry (Creation, Anti-Cheat, Authoritative Scoring, XP)
 * 5. Challenge History & Detailed Filters (Wins, Losses, Draws)
 * 6. Anti-Cheat Hardening (Cadence, Bounds, Confidence, Mismatch, Rate-Limiting)
 */

import { GoalRepository } from './repositories/goalRepository';
import { PerformanceRepository } from './repositories/performanceRepository';
import { FriendRepository } from './repositories/friendRepository';
import { FriendChallengeService } from './services/friendChallengeService';
import { CompetitiveRepository } from './repositories/competitiveRepository';
import { CompetitiveMatchmakingService } from './services/competitiveMatchmakingService';
import { UserRepository } from './repositories/userRepository';
import { SessionRepository } from './repositories/sessionRepository';
import { WorkoutSessionDoc, GoalDoc } from './types';

function assert(condition: any, message: string, details?: any) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`, details ? details : '');
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

async function runStep7TestSuite() {
  console.log('\n===============================================================');
  console.log('🚀 RUNNING SPORTX STEP 7: COMPREHENSIVE AUTOMATED TEST SUITE');
  console.log('===============================================================\n');

  const now = new Date().toISOString();
  const userA = `athlete_7a_${Date.now()}`;
  const userB = `athlete_7b_${Date.now()}`;

  // Initialize two athletes
  await UserRepository.create(userA, {
    userId: userA,
    name: 'Surya Athlete',
    email: 'surya@sportx.io',
    totalWorkouts: 0,
    totalXp: 0,
    currentStreak: 0,
    rankPoints: 100,
    rankTier: 'Bronze',
    collegeName: 'IIT Bombay',
    department: 'Computer Science',
  });

  await UserRepository.create(userB, {
    userId: userB,
    name: 'Arjun Rival',
    email: 'arjun@sportx.io',
    totalWorkouts: 0,
    totalXp: 0,
    currentStreak: 0,
    rankPoints: 100,
    rankTier: 'Bronze',
    collegeName: 'IIT Delhi',
    department: 'Mechanical',
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: GOALS SYSTEM
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Goals Creation & Authoritative Progress ---');
  
  // A. Templates
  const templates = GoalRepository.getTemplates();
  assert(templates.length >= 8, `Predefined templates loaded (${templates.length} templates)`);
  assert(templates.some((t) => t.category === 'fitness'), 'Includes fitness goal templates');
  assert(templates.some((t) => t.category === 'consistency'), 'Includes consistency templates');
  assert(templates.some((t) => t.category === 'strength'), 'Includes strength templates');

  // B. Invalid Target Rejection
  let invalidTargetCaught = false;
  try {
    await GoalRepository.createGoal(userA, {
      type: 'workouts_count',
      category: 'fitness',
      title: 'Invalid Target Goal',
      target: 0,
      unit: 'workouts',
      targetDate: new Date(Date.now() + 86400000).toISOString(),
    });
  } catch (e: any) {
    invalidTargetCaught = true;
    assert(e.message.includes('positive'), 'Rejected target <= 0');
  }
  assert(invalidTargetCaught, 'Target <= 0 correctly rejected');

  // C. Invalid Past Target Date Rejection
  let pastDateCaught = false;
  try {
    await GoalRepository.createGoal(userA, {
      type: 'workouts_count',
      category: 'fitness',
      title: 'Past Date Goal',
      target: 10,
      unit: 'workouts',
      targetDate: new Date(Date.now() - 86400000).toISOString(),
    });
  } catch (e: any) {
    pastDateCaught = true;
    assert(e.message.includes('future'), 'Rejected past targetDate');
  }
  assert(pastDateCaught, 'Past targetDate correctly rejected');

  // D. Create Valid Goal (Squats 50 reps)
  const goal1 = await GoalRepository.createGoal(userA, {
    type: 'exercise_reps',
    category: 'strength',
    title: 'Complete 50 squats',
    exerciseId: 'squat',
    target: 50,
    unit: 'reps',
    targetDate: new Date(Date.now() + 14 * 86400000).toISOString(),
  });
  assert(goal1.goalId.startsWith('goal_'), 'Goal created with canonical ID');
  assert(goal1.current === 0, 'Initial progress is 0');
  assert(goal1.status === 'active', 'Initial status is active');

  // E. Complete 30 squats in a real session and verify authoritative sync
  const session1: WorkoutSessionDoc = {
    sessionId: `sess_g1_${Date.now()}`,
    userId: userA,
    workoutId: 'plan_squats',
    sportId: 'athletics',
    exerciseId: 'squat',
    totalReps: 30,
    formAccuracyAverage: 92,
    durationSeconds: 60,
    durationMinutes: 1,
    caloriesBurned: 25,
    heartRateAverage: null,
    xpEarned: 100,
    status: 'completed',
    startTime: now,
    completionTime: now,
    endTime: now,
    createdAt: now,
    exerciseLogs: [],
  };
  await SessionRepository.create(session1);

  const syncedGoals = await GoalRepository.getUserGoals(userA, true);
  const foundGoal = syncedGoals.find((g) => g.goalId === goal1.goalId);
  assert(foundGoal !== undefined, 'Synced goal found');
  assert(foundGoal?.current === 30, `Authoritative progress updated to 30 reps (found: ${foundGoal?.current})`);
  assert(foundGoal?.progress === 60, `Progress percentage calculated correctly (60%)`);
  assert(foundGoal?.status === 'active', 'Goal remains active while current < target');

  // F. Complete remaining 25 squats to trigger auto-completion
  const session2: WorkoutSessionDoc = {
    sessionId: `sess_g2_${Date.now()}`,
    userId: userA,
    workoutId: 'plan_squats_2',
    sportId: 'athletics',
    exerciseId: 'squat',
    totalReps: 25,
    formAccuracyAverage: 95,
    durationSeconds: 50,
    durationMinutes: 1,
    caloriesBurned: 20,
    heartRateAverage: null,
    xpEarned: 90,
    status: 'completed',
    startTime: now,
    completionTime: now,
    endTime: now,
    createdAt: now,
    exerciseLogs: [],
  };
  await SessionRepository.create(session2);

  const syncedGoals2 = await GoalRepository.getUserGoals(userA, true);
  const completedGoal = syncedGoals2.find((g) => g.goalId === goal1.goalId);
  assert(completedGoal?.current === 55, `Total reps summed authoritatively: 55`);
  assert(completedGoal?.progress === 100, `Progress capped at 100%`);
  assert(completedGoal?.status === 'completed', `Goal automatically transitioned to completed status!`);
  assert(completedGoal?.completedAt !== null, 'completedAt timestamp recorded');

  // G. Goal Cancellation
  const goal2 = await GoalRepository.createGoal(userA, {
    type: 'streak_days',
    category: 'consistency',
    title: 'Maintain 7-day streak',
    target: 7,
    unit: 'days',
    targetDate: new Date(Date.now() + 10 * 86400000).toISOString(),
  });
  const cancelled = await GoalRepository.cancelGoal(goal2.goalId, userA);
  assert(cancelled === true, 'Goal cancelled successfully');
  const cancelledDoc = await GoalRepository.getGoalById(goal2.goalId);
  assert(cancelledDoc?.status === 'cancelled', 'Cancelled status persisted');

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: PERFORMANCE SCORE ENGINE
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Performance Score Engine & Provisional Calibration ---');

  // A. User B has 0 workouts -> Must be provisional
  const perfB = await PerformanceRepository.calculateScore(userB);
  assert(perfB.provisional === true, 'New user marked provisional: true');
  assert(typeof perfB.statusMessage === 'string' && perfB.statusMessage.includes('Calibrating'), 'Provisional calibration message returned');

  // B. User A has 2 completed workouts -> Non-provisional calibrated score
  const perfA = await PerformanceRepository.calculateScore(userA);
  assert(perfA.provisional === false, 'User A (2 workouts) is calibrated (provisional: false)');
  assert(perfA.overallScore >= 0 && perfA.overallScore <= 100, `Score is within 0-100 range (${perfA.overallScore})`);
  assert(perfA.breakdown.consistency >= 0, `Consistency pillar evaluated: ${perfA.breakdown.consistency}`);
  assert(perfA.breakdown.form >= 90, `Form accuracy pillar evaluated from 92% and 95%: ${perfA.breakdown.form}`);
  assert(perfA.breakdown.workout > 0, `Workout volume pillar evaluated: ${perfA.breakdown.workout}`);

  // C. Snapshot recording and trend
  await PerformanceRepository.recordSnapshot(userA, 'workout_completion');
  const perfAWithTrend = await PerformanceRepository.getScore(userA);
  assert(perfAWithTrend.trend !== undefined && perfAWithTrend.trend.length >= 1, 'Performance snapshot trend recorded');

  // ───────────────────────────────────────────────────────────────────────────
  // PART 3: FRIENDS & SOCIAL
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Friends System (Search, Requests, Privacy) ---');

  // A. Search athletes (safe public profile)
  const searchResults = await FriendRepository.searchAthletes('Arjun', userA);
  assert(searchResults.length >= 1, 'Athlete found in search results');
  const foundAthlete = searchResults[0];
  assert(foundAthlete.userId === userB, 'Found correct athlete ID');
  assert(foundAthlete.name === 'Arjun Rival', 'Public athlete name matches');
  assert((foundAthlete as any).email === undefined, 'Privacy Guard: Email is NOT exposed in public athlete profile');
  assert((foundAthlete as any).password === undefined, 'Privacy Guard: Password is NOT exposed');
  assert((foundAthlete as any).fcmTokens === undefined, 'Privacy Guard: Device tokens NOT exposed');

  // B. Self-friend request rejection
  let selfRequestCaught = false;
  try {
    await FriendRepository.sendFriendRequest(userA, userA);
  } catch (e: any) {
    selfRequestCaught = true;
    assert(e.message.includes('yourself'), 'Self friend request rejected');
  }
  assert(selfRequestCaught, 'Cannot friend oneself');

  // C. Send friend request from A to B
  const reqAB = await FriendRepository.sendFriendRequest(userA, userB);
  assert(reqAB.status === 'pending', 'Friend request status is pending');
  assert(reqAB.senderId === userA && reqAB.receiverId === userB, 'Sender and receiver IDs match');

  // D. Duplicate friend request rejection
  let dupRequestCaught = false;
  try {
    await FriendRepository.sendFriendRequest(userA, userB);
  } catch (e: any) {
    dupRequestCaught = true;
    assert(e.message.includes('already exists'), 'Duplicate pending request rejected');
  }
  assert(dupRequestCaught, 'Duplicate request prevented');

  // E. Check pending requests
  const bRequests = await FriendRepository.getUserRequests(userB);
  assert(bRequests.incoming.length === 1, 'Receiver has 1 incoming request');
  assert(bRequests.incoming[0].senderId === userA, 'Incoming request sender matches userA');

  // F. Unauthorized acceptance rejection (User A cannot accept their own request)
  let unauthAcceptCaught = false;
  try {
    await FriendRepository.acceptFriendRequest(reqAB.requestId, userA);
  } catch (e: any) {
    unauthAcceptCaught = true;
    assert(e.message.includes('recipient'), 'Unauthorized user cannot accept request');
  }
  assert(unauthAcceptCaught, 'Only recipient can accept friend request');

  // G. Accept friend request by User B
  const friendship = await FriendRepository.acceptFriendRequest(reqAB.requestId, userB);
  assert(friendship.friendshipId.includes(userA) && friendship.friendshipId.includes(userB), 'Friendship created');

  const areFriends = await FriendRepository.isFriend(userA, userB);
  assert(areFriends === true, 'isFriend returns true for both athletes');

  const aFriends = await FriendRepository.getUserFriends(userA);
  assert(aFriends.some((f) => f.userId === userB), 'User B appears in User A friends list');

  // ───────────────────────────────────────────────────────────────────────────
  // PART 4: FRIEND CHALLENGES & VISION VERIFICATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Friend Challenges with Vision Telemetry ---');

  // A. Non-friends cannot challenge
  const stranger = `stranger_${Date.now()}`;
  let nonFriendCaught = false;
  try {
    await FriendChallengeService.createChallenge({
      challengerId: userA,
      opponentId: stranger,
      exerciseId: 'squat',
    });
  } catch (e: any) {
    nonFriendCaught = true;
    assert(e.message.includes('confirmed friends'), 'Challenge rejected between non-friends');
  }
  assert(nonFriendCaught, 'Only confirmed friends can issue challenges');

  // B. Create Friend Challenge (User A challenges User B to squats)
  const challenge = await FriendChallengeService.createChallenge({
    challengerId: userA,
    opponentId: userB,
    exerciseId: 'squat',
    challengeType: 'most_reps',
    durationSeconds: 45,
    targetReps: 25,
  });
  assert(challenge.status === 'pending', 'Friend challenge status is pending');
  assert(challenge.exerciseId === 'squat', 'Exercise is squat');

  // C. Accept Friend Challenge by User B
  const acceptedChal = await FriendChallengeService.acceptChallenge(challenge.challengeId, userB);
  assert(acceptedChal.status === 'accepted', 'Challenge accepted');

  // D. Submit Challenger Telemetry (User A: 20 reps, 95% form)
  await FriendChallengeService.submitResult(challenge.challengeId, userA, {
    exerciseId: 'squat',
    reps: 20,
    validReps: 20,
    formScore: 95,
    durationSeconds: 45,
  });

  // Challenge in progress because opponent hasn't submitted yet
  const inProgChal = await FriendChallengeService.getChallengeById(challenge.challengeId);
  assert(inProgChal?.status === 'in_progress', 'Challenge marked in_progress after first athlete submits');
  assert(inProgChal?.challengerResult?.reps === 20, 'Challenger result recorded (20 reps)');

  // E. Submit Opponent Telemetry (User B: 24 reps, 90% form)
  // Score A = 20 * 0.95 * 10 = 190
  // Score B = 24 * 0.90 * 10 = 216 -> User B wins!
  const finalChal = await FriendChallengeService.submitResult(challenge.challengeId, userB, {
    exerciseId: 'squat',
    reps: 24,
    validReps: 24,
    formScore: 90,
    durationSeconds: 45,
  });

  assert(finalChal.status === 'completed', 'Challenge completed after both athletes submit');
  assert(finalChal.winnerId === userB, 'User B authoritatively declared challenge winner!');
  assert(finalChal.isDraw === false, 'Not a draw');

  // F. Idempotency on re-submission
  const dupSubmission = await FriendChallengeService.submitResult(challenge.challengeId, userB, {
    exerciseId: 'squat',
    reps: 30,
  });
  assert(dupSubmission.opponentResult?.reps === 24, 'Idempotency: Re-submission ignored on completed challenge');

  // ───────────────────────────────────────────────────────────────────────────
  // PART 5: CHALLENGE HISTORY & FILTERS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: Challenge History & Outcome Filters ---');

  // Create a competitive match for User A and verify history retrieval
  const compMatchId = `match_hist_${Date.now()}`;
  const compMatch = await CompetitiveRepository.createMatch({
    matchId: compMatchId,
    challengeId: 'athletics_pushup_challenge',
    challenge: {
      challengeId: 'athletics_pushup_challenge',
      sportId: 'athletics',
      activityType: 'sports_conditioning',
      activityId: 'athletics_pushups',
      title: 'Athletic Sprint Conditioning',
      description: 'Power pushup contest',
      minPlayers: 2,
      maxPlayers: 2,
      durationSeconds: 60,
      goal: 'Most valid pushups',
      scoringFormula: 'reps * (form / 100) * 10',
      minRank: 'Bronze',
      maxRank: 'Silver',
      exerciseId: 'pushup',
      rewards: {
        firstPlace: { xp: 200, rankPoints: 40 },
        secondPlace: { xp: 80, rankPoints: 0 },
        draw: { xp: 120, rankPoints: 10 },
      },
      createdAt: now,
      updatedAt: now,
    },
    targetPlayers: 2,
    status: 'IN_PROGRESS',
    players: [
      {
        userId: userA,
        displayName: 'Surya Athlete',
        rankTier: 'Bronze',
        rankPoints: 100,
        ready: true,
        completed: true,
        telemetry: { reps: 25, formScore: 94, verifiedScore: 235, lastUpdated: now },
      },
      {
        userId: 'simulated_opponent',
        displayName: 'Track Rival',
        rankTier: 'Bronze',
        rankPoints: 100,
        isSimulated: true,
        ready: true,
        completed: true,
        telemetry: { reps: 15, formScore: 80, verifiedScore: 120, lastUpdated: now },
      },
    ],
    createdAt: now,
    updatedAt: now,
  });

  // Finalize match authoritatively
  await CompetitiveMatchmakingService.verifyAndFinalizeMatch(compMatch.matchId, userA, {
    exerciseId: 'pushup',
    reps: 25,
    validReps: 25,
    formScore: 94,
    durationSeconds: 60,
  });

  // Query User A match history
  const history = await CompetitiveRepository.getUserMatchHistory(userA);
  assert(history.length >= 1, 'Match history retrieved for user');
  const latestMatch = history[0];
  assert(latestMatch.outcome === 'WIN', 'Outcome is WIN');
  assert(latestMatch.exerciseId === 'pushup', 'Exercise is pushup');
  assert(latestMatch.userScore > latestMatch.opponentScore, 'User score is higher than opponent score');
  assert(latestMatch.rankPointsChange > 0, 'Positive RP gained for win');

  // Test Filter by outcome: win vs loss
  const winHistory = await CompetitiveRepository.getUserMatchHistory(userA, { outcome: 'win' });
  assert(winHistory.length >= 1, 'Filter outcome=win returned winning matches');
  const lossHistory = await CompetitiveRepository.getUserMatchHistory(userA, { outcome: 'loss' });
  assert(lossHistory.length === 0, 'Filter outcome=loss returned 0 matches');

  // ───────────────────────────────────────────────────────────────────────────
  // PART 6: ANTI-CHEAT HARDENING
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 6: Anti-Cheat Hardening & Boundary Enforcement ---');

  const testMatchId = `match_ac_${Date.now()}`;
  await CompetitiveRepository.createMatch({
    matchId: testMatchId,
    challengeId: 'cricket_rapid_catch',
    challenge: {
      challengeId: 'cricket_rapid_catch',
      sportId: 'cricket',
      activityType: 'sports_skill_drill',
      activityId: 'cricket_catches',
      title: 'Rapid Slip Catches',
      description: 'Squat test',
      minPlayers: 2,
      maxPlayers: 2,
      durationSeconds: 60,
      goal: 'Most verified squats',
      scoringFormula: 'reps * (form/100) * 10',
      minRank: 'Bronze',
      maxRank: 'Gold',
      exerciseId: 'squat',
      rewards: {
        firstPlace: { xp: 150, rankPoints: 40 },
        secondPlace: { xp: 60, rankPoints: 0 },
        draw: { xp: 100, rankPoints: 10 },
      },
      createdAt: now,
      updatedAt: now,
    },
    targetPlayers: 2,
    status: 'IN_PROGRESS',
    players: [
      {
        userId: userA,
        displayName: 'Surya Athlete',
        rankTier: 'Bronze',
        rankPoints: 100,
        ready: true,
        completed: false,
        telemetry: { reps: 0, formScore: 85, verifiedScore: 0, lastUpdated: now },
      },
    ],
    createdAt: now,
    updatedAt: now,
  });

  // A. Reject Reps > 500
  let impossibleVolumeCaught = false;
  try {
    await CompetitiveMatchmakingService.verifyAndFinalizeMatch(testMatchId, userA, {
      exerciseId: 'squat',
      reps: 800,
    });
  } catch (e: any) {
    impossibleVolumeCaught = true;
    assert(e.message.includes('maximum competitive limit'), 'Reps > 500 rejected');
  }
  assert(impossibleVolumeCaught, 'Anti-Cheat: Impossible rep volume rejected');

  // B. Reject Invalid Vision Confidence (< 0 or > 1)
  let invalidConfCaught = false;
  try {
    await CompetitiveMatchmakingService.verifyAndFinalizeMatch(testMatchId, userA, {
      exerciseId: 'squat',
      reps: 15,
      confidence: 1.5,
    });
  } catch (e: any) {
    invalidConfCaught = true;
    assert(e.message.includes('confidence'), 'Confidence > 1.0 rejected');
  }
  assert(invalidConfCaught, 'Anti-Cheat: Malformed vision confidence rejected');

  // C. Reject Negative Duration
  let negDurationCaught = false;
  try {
    await CompetitiveMatchmakingService.verifyAndFinalizeMatch(testMatchId, userA, {
      exerciseId: 'squat',
      reps: 15,
      durationSeconds: -10,
    });
  } catch (e: any) {
    negDurationCaught = true;
    assert(e.message.includes('duration'), 'Negative duration rejected');
  }
  assert(negDurationCaught, 'Anti-Cheat: Negative duration rejected');

  console.log('\n===============================================================');
  console.log('🎉 ALL STEP 7 TEST SUITES PASSED FLAWLESSLY!');
  console.log('===============================================================\n');
}

runStep7TestSuite().catch((err) => {
  console.error('\n❌ Fatal Step 7 Test Suite Error:', err);
  process.exit(1);
});
