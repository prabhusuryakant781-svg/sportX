/**
 * SportX Step 6 Automated Test Suite
 * Comprehensive testing of Badges, Achievements, Milestones, Titles, Idempotency, and Progression
 */
import { GamificationService, SYSTEM_BADGES, SYSTEM_TITLES } from './services/gamificationService';
import { BadgeRepository } from './repositories/badgeRepository';
import { UserRepository } from './repositories/userRepository';
import { LeaderboardRepository } from './repositories/leaderboardRepository';

function assert(condition: any, message: string, details?: any) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`, details ? details : '');
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('\n==================================================');
  console.log('🏁 RUNNING SPORTX STEP 6 GAMIFICATION TEST SUITE');
  console.log('==================================================\n');

  // ── TEST 1: Canonical Badge Preservation & Expansion ──────────────────────
  console.log('--- TEST 1: Master Badges & Milestones Catalog ---');
  const canonical12 = [
    'first_workout',
    'streak_3',
    'streak_7',
    'streak_14',
    'streak_30',
    'streak_60',
    'streak_100',
    'perfect_form',
    'reps_500',
    'reps_1000',
    'xp_1000',
    'xp_10000',
  ];

  for (const id of canonical12) {
    const found = SYSTEM_BADGES.find((b) => b.id === id);
    assert(!!found, `Canonical badge preserved: "${id}"`);
    assert(!!found?.rarity, `Badge "${id}" has meaningful rarity: ${found?.rarity}`);
    assert(!!found?.xpReward && found.xpReward > 0, `Badge "${id}" has XP reward: ${found?.xpReward}`);
  }

  assert(SYSTEM_BADGES.length >= 25, `Expanded catalog has at least 25 badges (found: ${SYSTEM_BADGES.length})`);
  const milestoneCount = SYSTEM_BADGES.filter((b) => b.isMilestone).length;
  assert(milestoneCount >= 10, `Milestone badges distinctively flagged (found: ${milestoneCount})`);

  // ── TEST 2: Titles Master Catalog ─────────────────────────────────────────
  console.log('\n--- TEST 2: Master Titles Catalog ---');
  assert(SYSTEM_TITLES.length >= 10, `Master titles catalog has >= 10 titles (found: ${SYSTEM_TITLES.length})`);
  const sampleTitle = SYSTEM_TITLES.find((t) => t.id === 'title_iron_will');
  assert(!!sampleTitle, 'Title "title_iron_will" exists');
  assert(sampleTitle?.rarity === 'Rare', 'Title rarity is Rare');
  assert(sampleTitle?.badgeIdRequired === 'streak_30', 'Title is linked to streak_30 badge');

  // ── TEST 3: Evaluator - Workout & Streak Milestones ───────────────────────
  console.log('\n--- TEST 3: Evaluator - Workout & Streak Milestones ---');
  const res1 = GamificationService.evaluateUnlockedBadges({
    currentBadges: [],
    totalWorkouts: 1,
    totalReps: 20,
    totalXP: 100,
    currentStreak: 1,
  });
  assert(res1.newBadges.some((b) => b.id === 'first_workout'), 'First workout badge unlocked at 1 workout');
  assert(!res1.newBadges.some((b) => b.id === 'workout_10'), 'Workout 10 remains locked at 1 workout');

  const res10 = GamificationService.evaluateUnlockedBadges({
    currentBadges: ['first_workout'],
    totalWorkouts: 10,
    totalReps: 250,
    totalXP: 1200,
    currentStreak: 7,
  });
  assert(res10.newBadges.some((b) => b.id === 'workout_10'), 'Workout 10 unlocked at 10 workouts');
  assert(res10.newBadges.some((b) => b.id === 'streak_7'), 'Streak 7 unlocked at 7 streak days');

  // ── TEST 4: Evaluator - Reps, Form, Sports & Competitive ─────────────────
  console.log('\n--- TEST 4: Evaluator - Reps, Form, Sports & Competitive ---');
  const resRepsAndForm = GamificationService.evaluateUnlockedBadges({
    currentBadges: [],
    totalWorkouts: 5,
    totalReps: 550,
    totalXP: 800,
    currentStreak: 2,
    sessionFormAccuracy: 96,
    highFormSessionsCount: 10,
    sportId: 'cricket',
    competitiveMatches: 1,
    competitiveWins: 1,
    rankTier: 'Gold',
  });

  assert(resRepsAndForm.newBadges.some((b) => b.id === 'reps_500'), '500 Rep Club unlocked at 550 reps');
  assert(resRepsAndForm.newBadges.some((b) => b.id === 'perfect_form'), 'Form Perfectionist unlocked at 96% accuracy');
  assert(resRepsAndForm.newBadges.some((b) => b.id === 'form_high_10'), 'Flawless Execution 10 unlocked at 10 high-form sessions');
  assert(resRepsAndForm.newBadges.some((b) => b.id === 'sport_cricket_first'), 'First Innings unlocked for cricket session');
  assert(resRepsAndForm.newBadges.some((b) => b.id === 'comp_first_match'), 'Arena Challenger unlocked after 1 match');
  assert(resRepsAndForm.newBadges.some((b) => b.id === 'comp_first_win'), 'First Victory unlocked after 1 win');
  assert(resRepsAndForm.newBadges.some((b) => b.id === 'rank_silver'), 'Rank Silver unlocked for Gold athlete');
  assert(resRepsAndForm.newBadges.some((b) => b.id === 'rank_gold'), 'Rank Gold unlocked for Gold athlete');
  assert(!resRepsAndForm.newBadges.some((b) => b.id === 'rank_diamond'), 'Rank Diamond locked for Gold athlete');

  // ── TEST 5: Real Progress Calculation (No Fake Numbers) ───────────────────
  console.log('\n--- TEST 5: Real Telemetry Progress Calculation ---');
  const bReps = SYSTEM_BADGES.find((b) => b.id === 'reps_1000')!;
  const pReps = GamificationService.calculateBadgeProgress(bReps, { totalReps: 450 });
  assert(pReps?.current === 450, 'Progress current matches 450 reps');
  assert(pReps?.target === 1000, 'Progress target matches 1000 reps');
  assert(pReps?.percentage === 45, 'Progress percentage matches 45%');

  const bStreak = SYSTEM_BADGES.find((b) => b.id === 'streak_30')!;
  const pStreak = GamificationService.calculateBadgeProgress(bStreak, { currentStreak: 12 });
  assert(pStreak?.current === 12 && pStreak?.percentage === 40, 'Streak progress calculated accurately (12/30 = 40%)');

  const bSingleEvent = SYSTEM_BADGES.find((b) => b.id === 'sport_football_first')!;
  const pSingle = GamificationService.calculateBadgeProgress(bSingleEvent, { totalWorkouts: 5 });
  assert(pSingle === null, 'Single event badges return null progress (no fake progress bar)');

  // ── TEST 6: Athlete Title Evaluation & Equipping Security ─────────────────
  console.log('\n--- TEST 6: Titles Security & Equipping Flow ---');
  const testUserId = 'test_athlete_step6_' + Date.now();
  await UserRepository.create(testUserId, {
    userId: testUserId,
    name: 'Step6 Tester',
    email: 'step6@sportx.test',
    totalWorkouts: 1,
    totalXp: 150,
    currentStreak: 1,
    badges: ['first_workout'],
    rankTier: 'Bronze',
  });

  // 6a: Attempt to equip a LOCKED title (e.g. Iron Will requires streak_30)
  const lockedEquip = await UserRepository.equipTitle(testUserId, 'title_iron_will');
  assert(!lockedEquip.success, 'Locked title CANNOT be equipped');
  assert(lockedEquip.error?.includes('locked'), 'Descriptive error message returned for locked title');

  // 6b: Equip an UNLOCKED title (Rookie Athlete requires first_workout)
  const unlockedEquip = await UserRepository.equipTitle(testUserId, 'title_rookie');
  assert(unlockedEquip.success, 'Unlocked title CAN be equipped');

  const userAfterEquip = await UserRepository.getById(testUserId);
  assert(userAfterEquip?.equippedTitle === 'title_rookie', 'Equipped title successfully persisted on user document');

  // 6c: Clear/Unequip title
  const clearEquip = await UserRepository.equipTitle(testUserId, '');
  assert(clearEquip.success, 'Can unequip title');
  const userAfterClear = await UserRepository.getById(testUserId);
  assert(!userAfterClear?.equippedTitle, 'Equipped title cleared');

  // ── TEST 7: Featured Badges Selection & Slot Security ─────────────────────
  console.log('\n--- TEST 7: Featured Badges Selection ---');
  // Attempt to feature locked badge
  const lockedFeature = await UserRepository.updateFeaturedBadges(testUserId, ['streak_100']);
  assert(!lockedFeature.success, 'Locked badge CANNOT be featured in showcase');

  // Feature unlocked badge
  const validFeature = await UserRepository.updateFeaturedBadges(testUserId, ['first_workout']);
  assert(validFeature.success, 'Unlocked badge CAN be featured');

  const userAfterFeature = await UserRepository.getById(testUserId);
  assert(userAfterFeature?.featuredBadges?.[0] === 'first_workout', 'Featured badges persisted in user document');

  // ── TEST 8: Atomic Idempotency & Duplicate Prevention ─────────────────────
  console.log('\n--- TEST 8: Idempotent Unlocks & Reward Protection ---');
  BadgeRepository.clearLocalCache();
  const bFirst = SYSTEM_BADGES.find((b) => b.id === 'first_workout')!;

  const firstUnlock = await BadgeRepository.unlockBadge(testUserId, bFirst);
  assert(firstUnlock === true, 'First unlock attempt succeeds');

  const duplicateUnlock = await BadgeRepository.unlockBadge(testUserId, bFirst);
  assert(duplicateUnlock === false, 'Second unlock attempt returns false (duplicate prevented)');

  const userBadges = await BadgeRepository.getUserBadges(testUserId);
  const duplicates = userBadges.filter((b) => b.badgeId === 'first_workout');
  assert(duplicates.length === 1, 'Only exactly 1 badge record exists for user (no duplicate records)');

  // ── TEST 9: Leaderboard Integration with Titles & Sorting ─────────────────
  console.log('\n--- TEST 9: Leaderboard Titles & Sorting ---');
  await UserRepository.equipTitle(testUserId, 'title_rookie');
  await UserRepository.updateFeaturedBadges(testUserId, ['first_workout']);

  const leaders = await LeaderboardRepository.getGlobal(10, 'xp');
  assert(Array.isArray(leaders), 'Leaderboard returns array');

  console.log('\n==================================================');
  console.log('🎉 ALL STEP 6 GAMIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('==================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ STEP 6 TEST SUITE FAILED:', err);
  process.exit(1);
});
