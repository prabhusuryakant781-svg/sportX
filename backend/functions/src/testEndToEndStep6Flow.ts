/**
 * End-to-End Runtime Verification of SportX Step 6 Flow
 * Traces the complete lifecycle from workout completion to milestone, badge, title unlock, equipping, and leaderboard.
 */
import { WorkoutCompletionService } from './services/workoutCompletionService';
import { SessionRepository } from './repositories/sessionRepository';
import { UserRepository } from './repositories/userRepository';
import { BadgeRepository } from './repositories/badgeRepository';
import { GamificationService, SYSTEM_BADGES, SYSTEM_TITLES } from './services/gamificationService';
import { LeaderboardRepository } from './repositories/leaderboardRepository';
import { WorkoutSessionDoc } from './types';

function assert(condition: any, message: string, details?: any) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`, details ? details : '');
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runEndToEnd() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING END-TO-END STEP 6 RUNTIME ACCEPTANCE FLOW');
  console.log('======================================================\n');

  const athleteId = 'athlete_e2e_' + Date.now();
  const sessionId = 'session_e2e_' + Date.now();
  const now = new Date().toISOString();

  // 1. Initialize Athlete Account
  console.log('[Step 1] Initializing Athlete Account...');
  await UserRepository.create(athleteId, {
    userId: athleteId,
    name: 'Champion Athlete',
    email: 'champion@sportx.io',
    totalWorkouts: 0,
    totalXp: 0,
    currentStreak: 0,
    rankPoints: 850, // Gold division
    rankTier: 'Gold',
    badges: [],
  });

  const initialUser = await UserRepository.getById(athleteId);
  assert(initialUser !== null, 'Athlete created');
  assert((initialUser?.totalXp ?? 0) === 0, 'Initial XP is 0');
  assert((initialUser?.badges?.length ?? 0) === 0, 'Initial badges is 0');

  // 2. Start and Complete a Real Verified Workout Session
  console.log('\n[Step 2] Logging Verified Workout Session (Squats, 25 Reps, 96% Form, Cricket)...');
  const sessionDoc: WorkoutSessionDoc = {
    sessionId,
    userId: athleteId,
    workoutId: 'plan_power_squat',
    sportId: 'cricket',
    exerciseId: 'squat',
    startTime: now,
    completionTime: null,
    endTime: null,
    status: 'in-progress',
    totalReps: 0,
    formAccuracyAverage: 0,
    durationMinutes: 0,
    caloriesBurned: 0,
    heartRateAverage: null,
    exerciseLogs: [],
    xpEarned: 0,
    createdAt: now,
  };
  await SessionRepository.create(sessionDoc);

  const completionResult = await WorkoutCompletionService.completeSession({
    sessionId,
    userId: athleteId,
    exerciseId: 'squat',
    totalReps: 25,
    averageFormScore: 96,
    durationSeconds: 180,
    sportId: 'cricket',
  });

  assert(completionResult.success, 'Workout session completed authoritatively');
  assert(completionResult.data?.xpEarned && completionResult.data.xpEarned > 0, `XP Earned: ${completionResult.data?.xpEarned}`);
  assert(completionResult.data?.currentStreak === 1, 'Current streak incremented to 1');

  // 3. Verify Server-Authoritative Badge & Milestone Unlocks
  console.log('\n[Step 3] Checking Unlocked Milestones & Badges...');
  const userAfterWorkout = await UserRepository.getById(athleteId);
  assert(userAfterWorkout?.badges?.includes('first_workout'), 'First Step milestone unlocked!');
  assert(userAfterWorkout?.badges?.includes('perfect_form'), 'Form Perfectionist badge unlocked (96% form)!');
  assert(userAfterWorkout?.badges?.includes('sport_cricket_first'), 'First Innings sport badge unlocked (cricket)!');

  // 4. Idempotency Check: Repeat completion call
  console.log('\n[Step 4] Verifying Idempotency on duplicate completion...');
  const duplicateResult = await WorkoutCompletionService.completeSession({
    sessionId,
    userId: athleteId,
    exerciseId: 'squat',
    totalReps: 25,
    averageFormScore: 96,
    durationSeconds: 180,
    sportId: 'cricket',
  });
  assert(duplicateResult.success && duplicateResult.idempotent, 'Duplicate call marked idempotent');
  const userAfterDup = await UserRepository.getById(athleteId);
  assert(userAfterDup?.totalXp === userAfterWorkout?.totalXp, 'XP was NOT re-awarded on duplicate call');

  // 5. Titles System: Evaluate & Equip Earned Title
  console.log('\n[Step 5] Evaluating Unlocked Titles...');
  const unlockedTitles = GamificationService.evaluateUnlockedTitles(userAfterWorkout?.badges || [], {
    totalXp: userAfterWorkout?.totalXp,
    rankTier: userAfterWorkout?.rankTier,
    currentStreak: userAfterWorkout?.currentStreak,
    totalWorkouts: userAfterWorkout?.totalWorkouts,
    totalReps: 25,
  });

  assert(unlockedTitles.includes('title_rookie'), 'Rookie Athlete title unlocked');
  assert(unlockedTitles.includes('title_form_perfectionist'), 'Form Perfectionist title unlocked');
  assert(unlockedTitles.includes('title_gold_athlete'), 'Gold Athlete title unlocked (for Gold tier)');

  console.log('\n[Step 6] Equipping Earned Title (Form Perfectionist)...');
  const equipRes = await UserRepository.equipTitle(athleteId, 'title_form_perfectionist');
  assert(equipRes.success, 'Equipped title successfully');

  const userAfterTitle = await UserRepository.getById(athleteId);
  assert(userAfterTitle?.equippedTitle === 'title_form_perfectionist', 'Equipped title persisted on profile');

  // 6. Featured Badges Showcase
  console.log('\n[Step 7] Updating Featured Achievements Showcase (3 badges)...');
  const showcaseBadges = ['first_workout', 'perfect_form', 'sport_cricket_first'];
  const showcaseRes = await UserRepository.updateFeaturedBadges(athleteId, showcaseBadges);
  assert(showcaseRes.success, 'Featured badges showcase saved');

  const userAfterShowcase = await UserRepository.getById(athleteId);
  assert(userAfterShowcase?.featuredBadges?.length === 3, '3 featured badges showcase active');
  assert(userAfterShowcase?.featuredBadges?.[0] === 'first_workout', 'First featured badge matches');

  // 7. Leaderboard Entry Verification
  console.log('\n[Step 8] Verifying Leaderboard Integration...');
  const globalLeaders = await LeaderboardRepository.getGlobal(10, 'xp');
  assert(Array.isArray(globalLeaders), 'Leaderboard returned array');

  console.log('\n======================================================');
  console.log('🎉 END-TO-END STEP 6 ACCEPTANCE FLOW FULLY VERIFIED!');
  console.log('======================================================\n');
}

runEndToEnd().catch((err) => {
  console.error('\n❌ END-TO-END FLOW FAILED:', err);
  process.exit(1);
});
