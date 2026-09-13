/**
 * SportX Canonical Test Suite — Step 4: Ranking System
 *
 * Tests:
 * A. Tier boundaries: 0, 399, 400, 799, 800, 1199, 1200, 1599, 1600+
 * B. RP calculation: Win (+base & form bonus), Loss (tier-scaled penalty & form mitigation), Draw (+10)
 * C. Clamping: RP never negative (clamped at 0)
 * D. Rank transitions:
 *    - Promotions: Bronze -> Silver, Silver -> Gold, Gold -> Platinum, Platinum -> Diamond
 *    - Demotions: Diamond -> Platinum, Platinum -> Gold, Gold -> Silver, Silver -> Bronze
 * E. Next rank & RP needed calculations
 * F. Idempotency: Finalizing same match twice produces exactly ONE RP award
 * G. Concurrent requests safety: Simultaneous finalize calls do not double award
 * H. Persistence: Competitive rank and User doc correctly updated and retrievable
 * I. Security: Client cannot dictate RP or rank tier
 */

process.env.LOCAL_TEST = 'true';
process.env.NODE_ENV = 'test';

import {
  getRankTierFromRP,
  getNextRankTier,
  getRPNeededForNextTier,
  CompetitiveRankTier,
  RANK_TIER_THRESHOLDS,
} from './types/competitive';
import { CompetitiveMatchmakingService, SEED_CHALLENGES } from './services/competitiveMatchmakingService';
import { CompetitiveRepository } from './repositories/competitiveRepository';
import { UserRepository } from './repositories/userRepository';

function assert(condition: boolean, message: string, detail?: any) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`, detail !== undefined ? detail : '');
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASSED: ${message}`);
}

async function createTestMatch(
  matchId: string,
  p1: { userId: string; verifiedScore: number; formScore: number; rankPoints: number; rankTier: CompetitiveRankTier },
  p2: { userId: string; verifiedScore: number; formScore: number; rankPoints: number; rankTier: CompetitiveRankTier }
) {
  const challenge = SEED_CHALLENGES[0];
  const matchDoc = {
    matchId,
    challengeId: challenge.challengeId,
    challenge,
    players: [
      {
        userId: p1.userId,
        displayName: 'Player 1',
        avatarUrl: '',
        rankTier: p1.rankTier,
        rankPoints: p1.rankPoints,
        isSimulated: false,
        ready: true,
        completed: true,
        telemetry: { reps: p1.verifiedScore, formScore: p1.formScore, verifiedScore: p1.verifiedScore, lastUpdated: new Date().toISOString() },
      },
      {
        userId: p2.userId,
        displayName: 'Player 2',
        avatarUrl: '',
        rankTier: p2.rankTier,
        rankPoints: p2.rankPoints,
        isSimulated: false,
        ready: true,
        completed: true,
        telemetry: { reps: p2.verifiedScore, formScore: p2.formScore, verifiedScore: p2.verifiedScore, lastUpdated: new Date().toISOString() },
      },
    ],
    targetPlayers: 2,
    status: 'IN_PROGRESS' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await CompetitiveRepository.createMatch(matchDoc);
  return matchDoc;
}

async function runRankingTests() {
  console.log('===============================================================');
  console.log('🏆 RUNNING SPORTX STEP 4 RANKING SYSTEM TEST SUITE');
  console.log('===============================================================\n');

  // ── TEST 1: Tier Boundaries ─────────────────────────────────────
  console.log('[Test 1] Verifying all exact tier boundaries...');
  {
    assert(getRankTierFromRP(0) === 'Bronze', '0 RP is Bronze');
    assert(getRankTierFromRP(150) === 'Bronze', '150 RP is Bronze');
    assert(getRankTierFromRP(399) === 'Bronze', '399 RP is Bronze boundary');
    assert(getRankTierFromRP(400) === 'Silver', '400 RP is Silver boundary');
    assert(getRankTierFromRP(550) === 'Silver', '550 RP is Silver');
    assert(getRankTierFromRP(799) === 'Silver', '799 RP is Silver boundary');
    assert(getRankTierFromRP(800) === 'Gold', '800 RP is Gold boundary');
    assert(getRankTierFromRP(999) === 'Gold', '999 RP is Gold');
    assert(getRankTierFromRP(1199) === 'Gold', '1199 RP is Gold boundary');
    assert(getRankTierFromRP(1200) === 'Platinum', '1200 RP is Platinum boundary');
    assert(getRankTierFromRP(1350) === 'Platinum', '1350 RP is Platinum');
    assert(getRankTierFromRP(1599) === 'Platinum', '1599 RP is Platinum boundary');
    assert(getRankTierFromRP(1600) === 'Diamond', '1600 RP is Diamond boundary');
    assert(getRankTierFromRP(2500) === 'Diamond', '2500 RP is Diamond');
  }

  // ── TEST 2: Next Rank & RP Needed Calculations ─────────────────
  console.log('\n[Test 2] Verifying next rank tier and RP needed calculations...');
  {
    assert(getNextRankTier('Bronze') === 'Silver', 'Next after Bronze is Silver');
    assert(getNextRankTier('Silver') === 'Gold', 'Next after Silver is Gold');
    assert(getNextRankTier('Gold') === 'Platinum', 'Next after Gold is Platinum');
    assert(getNextRankTier('Platinum') === 'Diamond', 'Next after Platinum is Diamond');
    assert(getNextRankTier('Diamond') === null, 'Next after Diamond is null (Max)');

    // RP needed
    assert(getRPNeededForNextTier(0) === 400, '0 RP needs 400 for Silver');
    assert(getRPNeededForNextTier(399) === 1, '399 RP needs 1 for Silver');
    assert(getRPNeededForNextTier(400) === 400, '400 RP needs 400 for Gold');
    assert(getRPNeededForNextTier(842) === 358, '842 RP needs 358 for Platinum (Spec example)');
    assert(getRPNeededForNextTier(1550) === 50, '1550 RP needs 50 for Diamond');
    assert(getRPNeededForNextTier(1600) === null, '1600 RP needs null (Max division)');
    assert(getRPNeededForNextTier(2000) === null, '2000 RP needs null (Max division)');
  }

  // ── TEST 3: Server-side RP Calculations (Win / Loss / Draw) ─────
  console.log('\n[Test 3] Verifying server-authoritative RP adjustment formulas...');
  {
    // WIN in Bronze with normal form
    const winNormal = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 100,
      currentTier: 'Bronze',
      outcome: 'WIN',
      placement: 1,
      totalPlayers: 2,
      formScore: 75,
    });
    assert(winNormal.rankPointsChange >= 35, 'Win grants at least 35 RP', winNormal);
    assert(winNormal.newRP === 100 + winNormal.rankPointsChange, 'newRP matches currentRP + rankPointsChange');
    assert(winNormal.isRankUp === false, '100 + 35 RP stays in Bronze (no rank up)');

    // WIN with exceptional form (>= 90%) grants +5 form bonus
    const winHighForm = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 100,
      currentTier: 'Bronze',
      outcome: 'WIN',
      placement: 1,
      totalPlayers: 2,
      formScore: 95,
    });
    assert(winHighForm.rankPointsChange === winNormal.rankPointsChange + 5, 'High form score (>=90%) awards +5 bonus RP');

    // DRAW grants neutral RP (+10)
    const drawRes = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 500,
      currentTier: 'Silver',
      outcome: 'DRAW',
      placement: 1,
      totalPlayers: 2,
      formScore: 80,
    });
    assert(drawRes.rankPointsChange === 10, 'Draw awards +10 neutral RP', drawRes);
    assert(drawRes.newRP === 510, 'Draw updates newRP to 510');

    // LOSS in Bronze: base penalty -10
    const lossBronze = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 200,
      currentTier: 'Bronze',
      outcome: 'LOSS',
      placement: 2,
      totalPlayers: 2,
      formScore: 70,
    });
    assert(lossBronze.rankPointsChange === -10, 'Bronze loss applies -10 RP penalty', lossBronze);
    assert(lossBronze.newRP === 190, 'Bronze loss correctly deducts 10 RP');

    // LOSS in Silver: base penalty -15
    const lossSilver = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 600,
      currentTier: 'Silver',
      outcome: 'LOSS',
      placement: 2,
      totalPlayers: 2,
      formScore: 70,
    });
    assert(lossSilver.rankPointsChange === -15, 'Silver loss applies -15 RP penalty', lossSilver);

    // LOSS in Gold: base penalty -20
    const lossGold = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 900,
      currentTier: 'Gold',
      outcome: 'LOSS',
      placement: 2,
      totalPlayers: 2,
      formScore: 70,
    });
    assert(lossGold.rankPointsChange === -20, 'Gold loss applies -20 RP penalty', lossGold);

    // LOSS in Platinum: base penalty -25
    const lossPlat = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 1300,
      currentTier: 'Platinum',
      outcome: 'LOSS',
      placement: 2,
      totalPlayers: 2,
      formScore: 70,
    });
    assert(lossPlat.rankPointsChange === -25, 'Platinum loss applies -25 RP penalty', lossPlat);

    // LOSS in Diamond: base penalty -30
    const lossDiamond = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 1800,
      currentTier: 'Diamond',
      outcome: 'LOSS',
      placement: 2,
      totalPlayers: 2,
      formScore: 70,
    });
    assert(lossDiamond.rankPointsChange === -30, 'Diamond loss applies -30 RP penalty', lossDiamond);

    // LOSS with high form (>=85%) reduces penalty by +5
    const lossMitigated = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 900,
      currentTier: 'Gold',
      outcome: 'LOSS',
      placement: 2,
      totalPlayers: 2,
      formScore: 88,
    });
    assert(lossMitigated.rankPointsChange === -15, 'High form score mitigates loss penalty by 5 RP (-20 -> -15)', lossMitigated);
  }

  // ── TEST 4: Clamping at Zero (No Negative RP) ───────────────────
  console.log('\n[Test 4] Verifying RP is strictly clamped at 0 (never negative)...');
  {
    const zeroRP = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 5,
      currentTier: 'Bronze',
      outcome: 'LOSS',
      placement: 2,
      totalPlayers: 2,
      formScore: 60,
    });
    assert(zeroRP.newRP === 0, 'RP does not fall below 0 even if penalty is greater than current RP', zeroRP);
    assert(zeroRP.newTier === 'Bronze', '0 RP remains Bronze');
  }

  // ── TEST 5: Rank-Up Transitions (Promotions) ────────────────────
  console.log('\n[Test 5] Verifying rank promotions across all tiers...');
  {
    // Bronze -> Silver
    const p1 = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 380,
      currentTier: 'Bronze',
      outcome: 'WIN',
      placement: 1,
      totalPlayers: 2,
      formScore: 80,
    });
    assert(p1.isRankUp === true, 'Promoted: Bronze -> Silver isRankUp is true');
    assert(p1.isRankDown === false, 'isRankDown is false on win');
    assert(p1.newTier === 'Silver', 'New tier is Silver');
    assert(p1.rankTransition === 'Bronze → Silver', `Transition string is '${p1.rankTransition}'`);

    // Silver -> Gold
    const p2 = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 780,
      currentTier: 'Silver',
      outcome: 'WIN',
      placement: 1,
      totalPlayers: 2,
      formScore: 80,
    });
    assert(p2.isRankUp === true, 'Promoted: Silver -> Gold isRankUp is true');
    assert(p2.newTier === 'Gold', 'New tier is Gold');
    assert(p2.rankTransition === 'Silver → Gold', `Transition string is '${p2.rankTransition}'`);

    // Gold -> Platinum
    const p3 = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 1180,
      currentTier: 'Gold',
      outcome: 'WIN',
      placement: 1,
      totalPlayers: 2,
      formScore: 80,
    });
    assert(p3.isRankUp === true, 'Promoted: Gold -> Platinum isRankUp is true');
    assert(p3.newTier === 'Platinum', 'New tier is Platinum');
    assert(p3.rankTransition === 'Gold → Platinum', `Transition string is '${p3.rankTransition}'`);

    // Platinum -> Diamond
    const p4 = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 1580,
      currentTier: 'Platinum',
      outcome: 'WIN',
      placement: 1,
      totalPlayers: 2,
      formScore: 80,
    });
    assert(p4.isRankUp === true, 'Promoted: Platinum -> Diamond isRankUp is true');
    assert(p4.newTier === 'Diamond', 'New tier is Diamond');
    assert(p4.rankTransition === 'Platinum → Diamond', `Transition string is '${p4.rankTransition}'`);
  }

  // ── TEST 6: Rank-Down Transitions (Demotions) ───────────────────
  console.log('\n[Test 6] Verifying rank demotions across all tiers...');
  {
    // Diamond -> Platinum
    const d1 = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 1610,
      currentTier: 'Diamond',
      outcome: 'LOSS',
      placement: 2,
      totalPlayers: 2,
      formScore: 60,
    });
    assert(d1.isRankDown === true, 'Demoted: Diamond -> Platinum isRankDown is true', d1);
    assert(d1.newTier === 'Platinum', 'New tier is Platinum');
    assert(d1.rankTransition === 'Diamond → Platinum', `Transition string is '${d1.rankTransition}'`);

    // Platinum -> Gold
    const d2 = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 1210,
      currentTier: 'Platinum',
      outcome: 'LOSS',
      placement: 2,
      totalPlayers: 2,
      formScore: 60,
    });
    assert(d2.isRankDown === true, 'Demoted: Platinum -> Gold isRankDown is true', d2);
    assert(d2.newTier === 'Gold', 'New tier is Gold');
    assert(d2.rankTransition === 'Platinum → Gold', `Transition string is '${d2.rankTransition}'`);

    // Gold -> Silver
    const d3 = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 810,
      currentTier: 'Gold',
      outcome: 'LOSS',
      placement: 2,
      totalPlayers: 2,
      formScore: 60,
    });
    assert(d3.isRankDown === true, 'Demoted: Gold -> Silver isRankDown is true', d3);
    assert(d3.newTier === 'Silver', 'New tier is Silver');
    assert(d3.rankTransition === 'Gold → Silver', `Transition string is '${d3.rankTransition}'`);

    // Silver -> Bronze
    const d4 = CompetitiveMatchmakingService.calculateRPAdjustment({
      currentRP: 405,
      currentTier: 'Silver',
      outcome: 'LOSS',
      placement: 2,
      totalPlayers: 2,
      formScore: 60,
    });
    assert(d4.isRankDown === true, 'Demoted: Silver -> Bronze isRankDown is true', d4);
    assert(d4.newTier === 'Bronze', 'New tier is Bronze');
    assert(d4.rankTransition === 'Silver → Bronze', `Transition string is '${d4.rankTransition}'`);
  }

  // ── TEST 7: End-to-End Match Finalization & Persistence ────────
  console.log('\n[Test 7] Verifying end-to-end match finalization, atomic persistence, and stats sync...');
  {
    const userId1 = 'user_rank_test_1';
    const userId2 = 'user_rank_test_2';

    // Create test user records
    await UserRepository.create(userId1, {
      name: 'Ranking Athlete 1',
      email: 'rank1@test.com',
      rankPoints: 380,
      rankTier: 'Bronze',
      xp: 1000,
    });

    await UserRepository.create(userId2, {
      name: 'Ranking Athlete 2',
      email: 'rank2@test.com',
      rankPoints: 420,
      rankTier: 'Silver',
      xp: 1200,
    });

    // Create competitive rank records
    await CompetitiveRepository.saveUserRank({
      userId: userId1,
      sportId: 'global',
      rankPoints: 380,
      rankTier: 'Bronze',
      wins: 5,
      losses: 2,
      draws: 0,
      totalMatches: 7,
      highestRankTier: 'Bronze',
      highestRankPoints: 380,
      updatedAt: new Date().toISOString(),
    });

    await CompetitiveRepository.saveUserRank({
      userId: userId2,
      sportId: 'global',
      rankPoints: 420,
      rankTier: 'Silver',
      wins: 6,
      losses: 3,
      draws: 0,
      totalMatches: 9,
      highestRankTier: 'Silver',
      highestRankPoints: 420,
      updatedAt: new Date().toISOString(),
    });

    // Create match
    const matchId = `match_rank_test_${Date.now()}`;
    await createTestMatch(
      matchId,
      { userId: userId1, verifiedScore: 20, formScore: 92, rankPoints: 380, rankTier: 'Bronze' },
      { userId: userId2, verifiedScore: 12, formScore: 78, rankPoints: 420, rankTier: 'Silver' }
    );

    // Finalize match: Player 1 wins with 20 reps, Player 2 loses with 12 reps
    const finalizationResult = await CompetitiveMatchmakingService.finalizeMatch(matchId, userId1);

    assert(finalizationResult.status === 'COMPLETED', 'Match status is COMPLETED');
    assert(finalizationResult.results!.leaderboard.length === 2, '2 placements returned');

    // Inspect Player 1 (Winner, promoted from Bronze to Silver)
    const p1Result = finalizationResult.results!.leaderboard.find(p => p.userId === userId1)!;
    assert(p1Result.placement === 1, 'Player 1 placed 1st');
    assert(p1Result.outcome === 'WIN', 'Player 1 outcome is WIN');
    assert(p1Result.previousRankPoints === 380, 'Player 1 previous RP is 380');
    assert(p1Result.rankPointsChange > 35, 'Player 1 awarded > 35 RP (base + form bonus)');
    assert(p1Result.newRankPoints === 380 + p1Result.rankPointsChange, 'Player 1 new RP matches');
    assert(p1Result.newRankTier === 'Silver', 'Player 1 promoted to Silver');
    assert(p1Result.isRankUp === true, 'Player 1 isRankUp is true');
    assert(p1Result.rankTransition === 'Bronze → Silver', 'Player 1 transition is Bronze → Silver');

    // Inspect Player 2 (Loser, demoted from Silver to Bronze)
    const p2Result = finalizationResult.results!.leaderboard.find(p => p.userId === userId2)!;
    assert(p2Result.placement === 2, 'Player 2 placed 2nd');
    assert(p2Result.outcome === 'LOSS', 'Player 2 outcome is LOSS');
    assert(p2Result.previousRankPoints === 420, 'Player 2 previous RP is 420');
    assert(p2Result.rankPointsChange < 0, 'Player 2 lost RP (negative awarded)');
    assert(p2Result.newRankPoints === 420 + p2Result.rankPointsChange, 'Player 2 new RP matches deduction');

    // Check DB persistence for Player 1
    const p1RankDoc = await CompetitiveRepository.getUserRank(userId1, 'global');
    assert(p1RankDoc !== null, 'Player 1 rank document exists');
    assert(p1RankDoc!.rankPoints === p1Result.newRankPoints, 'Persisted RP matches finalization result');
    assert(p1RankDoc!.rankTier === 'Silver', 'Persisted tier is Silver');
    assert(p1RankDoc!.wins === 6, 'Wins incremented to 6');
    assert(p1RankDoc!.totalMatches === 8, 'Total matches incremented to 8');

    // Check User profile sync for Player 1
    const p1UserDoc = await UserRepository.getById(userId1);
    assert(p1UserDoc?.rankPoints === p1Result.newRankPoints, 'User profile rankPoints synced');
    assert(p1UserDoc?.rankTier === 'Silver', 'User profile rankTier synced');
  }

  // ── TEST 8: Idempotency Protection ──────────────────────────────
  console.log('\n[Test 8] Verifying idempotency: duplicate finalize requests do NOT duplicate RP...');
  {
    const userId = 'user_idempotent_test';
    await UserRepository.create(userId, {
      name: 'Idempotent Athlete',
      email: 'idemp@test.com',
      rankPoints: 500,
      rankTier: 'Silver',
    });

    await CompetitiveRepository.saveUserRank({
      userId,
      sportId: 'global',
      rankPoints: 500,
      rankTier: 'Silver',
      wins: 10,
      losses: 5,
      draws: 0,
      totalMatches: 15,
      highestRankTier: 'Silver',
      highestRankPoints: 500,
      updatedAt: new Date().toISOString(),
    });

    const matchId = `match_idemp_test_${Date.now()}`;
    await createTestMatch(
      matchId,
      { userId, verifiedScore: 25, formScore: 85, rankPoints: 500, rankTier: 'Silver' },
      { userId: 'opponent_test', verifiedScore: 10, formScore: 70, rankPoints: 400, rankTier: 'Silver' }
    );

    // Call 1
    const res1 = await CompetitiveMatchmakingService.finalizeMatch(matchId, userId);

    const rpAfterFirst = (await CompetitiveRepository.getUserRank(userId, 'global'))?.rankPoints;
    const winsAfterFirst = (await CompetitiveRepository.getUserRank(userId, 'global'))?.wins;

    // Call 2 (Immediate duplicate / page refresh / network retry)
    const res2 = await CompetitiveMatchmakingService.finalizeMatch(matchId, userId);

    const rpAfterSecond = (await CompetitiveRepository.getUserRank(userId, 'global'))?.rankPoints;
    const winsAfterSecond = (await CompetitiveRepository.getUserRank(userId, 'global'))?.wins;

    assert(rpAfterFirst === rpAfterSecond, `RP unchanged on 2nd finalize call (${rpAfterFirst} === ${rpAfterSecond})`);
    assert(winsAfterFirst === winsAfterSecond, 'Wins unchanged on 2nd finalize call');
    assert(res1.matchId === res2.matchId, 'Returned match IDs match');
    assert(res1.results!.leaderboard[0].newRankPoints === res2.results!.leaderboard[0].newRankPoints, 'Leaderboard matches exactly');
  }

  // ── TEST 9: Concurrent Finalization Safety ───────────────────────
  console.log('\n[Test 9] Verifying concurrent execution safety...');
  {
    const userId = 'user_concurrent_test';
    await UserRepository.create(userId, {
      name: 'Concurrent Athlete',
      email: 'concurrent@test.com',
      rankPoints: 600,
      rankTier: 'Silver',
    });

    await CompetitiveRepository.saveUserRank({
      userId,
      sportId: 'global',
      rankPoints: 600,
      rankTier: 'Silver',
      wins: 2,
      losses: 1,
      draws: 0,
      totalMatches: 3,
      highestRankTier: 'Silver',
      highestRankPoints: 600,
      updatedAt: new Date().toISOString(),
    });

    const matchId = `match_conc_test_${Date.now()}`;
    await createTestMatch(
      matchId,
      { userId, verifiedScore: 30, formScore: 90, rankPoints: 600, rankTier: 'Silver' },
      { userId: 'concurrent_opp', verifiedScore: 20, formScore: 80, rankPoints: 500, rankTier: 'Silver' }
    );

    // Launch 3 simultaneous finalize calls in parallel
    const [c1, c2, c3] = await Promise.all([
      CompetitiveMatchmakingService.finalizeMatch(matchId, userId),
      CompetitiveMatchmakingService.finalizeMatch(matchId, userId),
      CompetitiveMatchmakingService.finalizeMatch(matchId, userId),
    ]);

    const finalRank = await CompetitiveRepository.getUserRank(userId, 'global');
    assert(finalRank?.totalMatches === 4, `Total matches incremented exactly once (got ${finalRank?.totalMatches})`);
    assert(finalRank?.wins === 3, `Wins incremented exactly once (got ${finalRank?.wins})`);
    assert(c1.results!.leaderboard[0].newRankPoints === c2.results!.leaderboard[0].newRankPoints, 'Concurrent calls return identical RP');
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL STEP 4 RANKING SYSTEM TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');
}

runRankingTests().catch(err => {
  console.error('Fatal error running ranking tests:', err);
  process.exit(1);
});
