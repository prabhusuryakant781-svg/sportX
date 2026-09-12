/**
 * SportX Competitive Mode & Matchmaking Automated Tests
 * Tests all requirements:
 * 1. Challenge Seeding Idempotency (3 Demo Challenges)
 * 2. Sport Preference & Rank Tier Auto-Selection
 * 3. Random Fallback Selection (No Sport Preference)
 * 4. Rank Tier & Skill Compatibility Constraints
 * 5. 2-Player Queue & Instant Match Creation
 * 6. Production Safety Guard: Simulation Strictly Blocked in Production
 * 7. Server-Authoritative Scoring Calculation
 * 8. Match Telemetry & State Progression
 * 9. Match Finalization, Placements, XP & Rank Point Rewards
 * 10. Queue Cancellation & Ownership Guard
 */

import { CompetitiveRepository } from './repositories/competitiveRepository';
import { CompetitiveMatchmakingService, SEED_CHALLENGES } from './services/competitiveMatchmakingService';
import { CompetitiveRankTier } from './types/competitive';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    testsFailed++;
  }
}

export async function runCompetitiveTests(): Promise<{ passed: number; failed: number }> {
  console.log('================================================================');
  console.log('⚔️  SportX Competitive Matchmaking & Challenges Test Suite');
  console.log('================================================================\n');

  CompetitiveRepository.clearLocalCache();

  // ── 1. Idempotent Challenge Seeding ──────────────────────────────────────────
  console.log('[1/10] Testing Idempotent Challenge Seeding...');
  {
    for (const c of SEED_CHALLENGES) {
      await CompetitiveRepository.seedChallenge(c);
    }
    const all = await CompetitiveRepository.getAllChallenges();
    assert(all.length === 3, 'All 3 demo challenges seeded', `Got: ${all.length}`);

    // Seed again to prove idempotency
    for (const c of SEED_CHALLENGES) {
      await CompetitiveRepository.seedChallenge(c);
    }
    const allAfter = await CompetitiveRepository.getAllChallenges();
    assert(allAfter.length === 3, 'Seeding is idempotent with identical count', `Got: ${allAfter.length}`);

    // Verify Cricket Challenge specs
    const cricket = allAfter.find((c) => c.sportId === 'cricket');
    assert(cricket?.title === 'Rapid Catch Arena', 'Cricket: Title is Rapid Catch Arena');
    assert(cricket?.activityId === 'cricket_catches', 'Cricket: Activity is cricket_catches');
    assert(cricket?.durationSeconds === 90, 'Cricket: Duration is 90s');
    assert(cricket?.minRank === 'Bronze' && cricket?.maxRank === 'Gold', 'Cricket: Rank is Bronze to Gold');

    // Verify Football Challenge specs
    const football = allAfter.find((c) => c.sportId === 'football');
    assert(football?.title === 'Dribble Dash', 'Football: Title is Dribble Dash');
    assert(football?.activityId === 'football_dribble_agility', 'Football: Activity is football_dribble_agility');
    assert(football?.durationSeconds === 120, 'Football: Duration is 120s');
    assert(football?.minRank === 'Bronze' && football?.maxRank === 'Platinum', 'Football: Rank is Bronze to Platinum');

    // Verify Athletics Challenge specs
    const athletics = allAfter.find((c) => c.sportId === 'athletics');
    assert(athletics?.title === 'Shuttle Sprint Clash', 'Athletics: Title is Shuttle Sprint Clash');
    assert(athletics?.activityId === 'shuttle_run', 'Athletics: Activity is shuttle_run');
    assert(athletics?.durationSeconds === 180, 'Athletics: Duration is 180s');
    assert(athletics?.minRank === 'Silver' && athletics?.maxRank === 'Diamond', 'Athletics: Rank is Silver to Diamond');
  }

  // ── 2. Sport Preference Auto-Selection ───────────────────────────────────────
  console.log('\n[2/10] Testing Sport Preference Auto-Selection...');
  {
    const cricketChallenge = await CompetitiveMatchmakingService.selectEligibleChallenge('cricket', 'Bronze');
    assert(cricketChallenge.sportId === 'cricket', 'Auto-selects cricket challenge for cricket preference');

    const footballChallenge = await CompetitiveMatchmakingService.selectEligibleChallenge('football', 'Silver');
    assert(footballChallenge.sportId === 'football', 'Auto-selects football challenge for football preference');

    const athleticsChallenge = await CompetitiveMatchmakingService.selectEligibleChallenge('athletics', 'Gold');
    assert(athleticsChallenge.sportId === 'athletics', 'Auto-selects athletics challenge for athletics preference');
  }

  // ── 3. Random Fallback Selection (No Sport Preference) ───────────────────────
  console.log('\n[3/10] Testing Random Fallback Selection (No Sport Preference)...');
  {
    const randomPick1 = await CompetitiveMatchmakingService.selectEligibleChallenge(undefined, 'Bronze');
    assert(
      randomPick1 && ['cricket', 'football'].includes(randomPick1.sportId),
      'Randomly chooses eligible challenge for Bronze rank without preference',
      `Got: ${randomPick1.sportId}`
    );

    const randomPick2 = await CompetitiveMatchmakingService.selectEligibleChallenge('', 'Silver');
    assert(
      randomPick2 && ['cricket', 'football', 'athletics'].includes(randomPick2.sportId),
      'Randomly chooses eligible challenge for Silver rank with empty string preference'
    );
  }

  // ── 4. Rank Tier & Skill Compatibility Constraints ───────────────────────────
  console.log('\n[4/10] Testing Rank Tier & Skill Constraints...');
  {
    assert(
      CompetitiveMatchmakingService.isRankCompatible('Bronze', 'Bronze'),
      'Bronze is compatible with Bronze (0 tier gap)'
    );
    assert(
      CompetitiveMatchmakingService.isRankCompatible('Bronze', 'Silver'),
      'Bronze is compatible with Silver (1 tier gap)'
    );
    assert(
      !CompetitiveMatchmakingService.isRankCompatible('Bronze', 'Gold'),
      'Bronze is NOT compatible with Gold (2 tier gap)'
    );
    assert(
      !CompetitiveMatchmakingService.isRankCompatible('Bronze', 'Diamond'),
      'Bronze is NOT compatible with Diamond (4 tier gap)'
    );
    assert(
      CompetitiveMatchmakingService.isRankCompatible('Gold', 'Platinum'),
      'Gold is compatible with Platinum (1 tier gap)'
    );
  }

  // ── 5. 2-Player Queue & Instant Match Creation ───────────────────────────────
  console.log('\n[5/10] Testing 2-Player Queue & Instant Match Creation...');
  {
    // Athlete 1 joins queue
    const result1 = await CompetitiveMatchmakingService.joinQueue({
      userId: 'athlete_cricket_01',
      displayName: 'Virat',
      sportPreference: 'cricket',
    });

    assert(result1.ticket.status === 'QUEUED', 'First athlete placed in QUEUED status');
    assert(!result1.match, 'First athlete has no match yet (waiting in queue)');

    // Athlete 2 joins queue with same sport preference
    const result2 = await CompetitiveMatchmakingService.joinQueue({
      userId: 'athlete_cricket_02',
      displayName: 'Rohit',
      sportPreference: 'cricket',
    });

    assert(result2.ticket.status === 'MATCHED', 'Second athlete triggers MATCHED status');
    assert(!!result2.match, 'Second athlete receives instant match');
    assert(result2.match?.players.length === 2, 'Match has exactly 2 players initially');
    assert(result2.match?.targetPlayers === 2, 'Match configured with targetPlayers: 2 (extensible)');
    assert(result2.match?.status === 'COUNTDOWN', 'Match initializes in COUNTDOWN state');

    // Verify first athlete ticket was also updated to MATCHED
    const ticket1 = await CompetitiveRepository.getQueueTicket(result1.ticket.ticketId);
    assert(ticket1?.status === 'MATCHED', 'First athlete ticket updated to MATCHED');
    assert(ticket1?.matchedMatchId === result2.match?.matchId, 'Both tickets reference identical matchId');
  }

  // ── 6. Production Safety Guard: Simulation Blocked in Production ─────────────
  console.log('\n[6/10] Testing Production Safety Guard for Dev Simulation...');
  {
    const devTicket = await CompetitiveRepository.addQueueTicket({
      ticketId: 'ticket_dev_safety',
      userId: 'athlete_dev_user',
      displayName: 'LocalDevAthlete',
      rankTier: 'Silver',
      rankPoints: 500,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // In non-production (current test environment), simulate dev opponent succeeds
    const devMatch = await CompetitiveMatchmakingService.simulateDevOpponent(devTicket.ticketId);
    assert(devMatch.players.some((p) => p.isSimulated), 'Dev simulation creates opponent with isSimulated: true');
    assert(devMatch.players.some((p) => !p.isSimulated), 'Dev simulation retains real player');

    // Simulate production environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    let errorThrown = false;
    try {
      await CompetitiveMatchmakingService.simulateDevOpponent(devTicket.ticketId);
    } catch (err: any) {
      errorThrown = true;
      assert(
        err.message.includes('strictly disabled in production'),
        'Simulation explicitly rejected in production environment'
      );
    }
    assert(errorThrown, 'Production guard strictly blocks simulateDevOpponent');

    process.env.NODE_ENV = originalEnv;
  }

  // ── 7. Authoritative Scoring Calculation ──────────────────────────────────────
  console.log('\n[7/10] Testing Authoritative Scoring Formula...');
  {
    // Cricket: 15 catches * 90 formScore -> Math.round(15 * 0.90) = 14
    const scoreCricket = CompetitiveMatchmakingService.calculateVerifiedScore('cricket_rapid_catch', 15, 90);
    assert(scoreCricket === 14, 'Cricket score calculated: 15 catches * 90% = 14', `Got: ${scoreCricket}`);

    // Football: 20 reps * 85 controlScore -> Math.round(20 * 0.85) = 17
    const scoreFootball = CompetitiveMatchmakingService.calculateVerifiedScore('football_dribble_dash', 20, 85);
    assert(scoreFootball === 17, 'Football score calculated: 20 reps * 85% = 17', `Got: ${scoreFootball}`);

    // Athletics: 25 reps * 80 form/pace -> Math.round(25 * 0.80) = 20
    const scoreAthletics = CompetitiveMatchmakingService.calculateVerifiedScore('athletics_shuttle_sprint', 25, 80);
    assert(scoreAthletics === 20, 'Athletics score calculated: 25 reps * 80% = 20', `Got: ${scoreAthletics}`);

    // Boundary protection: negative reps clamped to 0
    const scoreNegative = CompetitiveMatchmakingService.calculateVerifiedScore('cricket_rapid_catch', -5, 100);
    assert(scoreNegative === 0, 'Negative reps clamped to 0 score');
  }

  // ── 8. Match Telemetry & State Progression ───────────────────────────────────
  console.log('\n[8/10] Testing Match Telemetry & State Progression...');
  {
    const match = await CompetitiveRepository.createMatch({
      matchId: 'match_telemetry_test',
      challengeId: 'football_dribble_dash',
      challenge: SEED_CHALLENGES[1],
      targetPlayers: 2,
      status: 'COUNTDOWN',
      players: [
        {
          userId: 'user_tel_1',
          displayName: 'Player One',
          rankTier: 'Silver',
          rankPoints: 500,
          isSimulated: false,
          ready: true,
          telemetry: { reps: 0, formScore: 85, verifiedScore: 0, lastUpdated: new Date().toISOString() },
          completed: false,
        },
        {
          userId: 'user_tel_2',
          displayName: 'Player Two',
          rankTier: 'Silver',
          rankPoints: 520,
          isSimulated: false,
          ready: true,
          telemetry: { reps: 0, formScore: 85, verifiedScore: 0, lastUpdated: new Date().toISOString() },
          completed: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updated = await CompetitiveMatchmakingService.updatePlayerTelemetry(
      match.matchId,
      'user_tel_1',
      12,
      92
    );

    assert(updated.status === 'IN_PROGRESS', 'Telemetry transitions match from COUNTDOWN to IN_PROGRESS');
    const p1 = updated.players.find((p) => p.userId === 'user_tel_1');
    assert(p1?.telemetry.reps === 12, 'Telemetry reps saved correctly');
    assert(p1?.telemetry.formScore === 92, 'Telemetry formScore saved correctly');
    assert(p1?.telemetry.verifiedScore === 11, 'Verified score updated authoritatively: 12 * 0.92 = 11');
  }

  // ── 9. Match Finalization, Placements, XP & Rank Point Rewards ───────────────
  console.log('\n[9/10] Testing Match Finalization & Placements...');
  {
    // Update player 2 telemetry to 8 reps @ 80% -> score 6
    await CompetitiveMatchmakingService.updatePlayerTelemetry('match_telemetry_test', 'user_tel_2', 8, 80);

    const finalized = await CompetitiveMatchmakingService.finalizeMatch('match_telemetry_test', 'user_tel_1');
    assert(finalized.status === 'COMPLETED', 'Match status is COMPLETED');
    assert(!!finalized.results, 'Match results object generated');
    assert(finalized.results?.winnerId === 'user_tel_1', 'Player 1 declared winner with higher score');
    assert(!finalized.results?.isDraw, 'isDraw is false');

    const winnerResult = finalized.results?.leaderboard.find((l) => l.userId === 'user_tel_1');
    assert(winnerResult?.placement === 1, 'Winner placed #1');
    assert(winnerResult?.xpEarned === 250, 'Winner awarded 1st place XP (250)');
    assert(winnerResult?.rankPointsChange === 45, 'Winner awarded 1st place RP (+45)');

    const loserResult = finalized.results?.leaderboard.find((l) => l.userId === 'user_tel_2');
    assert(loserResult?.placement === 2, 'Loser placed #2');
    assert(loserResult?.xpEarned === 125, 'Loser awarded 2nd place XP (125)');
    assert(loserResult?.rankPointsChange === 15, 'Loser awarded 2nd place RP (+15)');

    // Verify user competitive rank record was saved
    const p1Rank = await CompetitiveRepository.getUserRank('user_tel_1', 'football');
    assert(p1Rank.wins === 1, 'Winner wins counter incremented to 1');
    assert(p1Rank.totalMatches === 1, 'Winner total matches counter incremented to 1');

    // Test Draw Scenario
    const drawMatch = await CompetitiveRepository.createMatch({
      matchId: 'match_draw_test',
      challengeId: 'cricket_rapid_catch',
      challenge: SEED_CHALLENGES[0],
      targetPlayers: 2,
      status: 'IN_PROGRESS',
      players: [
        {
          userId: 'draw_p1',
          displayName: 'Draw P1',
          rankTier: 'Bronze',
          rankPoints: 100,
          isSimulated: false,
          ready: true,
          telemetry: { reps: 10, formScore: 100, verifiedScore: 10, lastUpdated: new Date().toISOString() },
          completed: false,
        },
        {
          userId: 'draw_p2',
          displayName: 'Draw P2',
          rankTier: 'Bronze',
          rankPoints: 100,
          isSimulated: false,
          ready: true,
          telemetry: { reps: 10, formScore: 100, verifiedScore: 10, lastUpdated: new Date().toISOString() },
          completed: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const finalizedDraw = await CompetitiveMatchmakingService.finalizeMatch('match_draw_test');
    assert(finalizedDraw.results?.isDraw === true, 'Equal verified scores result in isDraw === true');
    assert(finalizedDraw.results?.winnerId === null, 'winnerId is null on draw');
    assert(finalizedDraw.results?.leaderboard[0].xpEarned === 150, 'Draw awards draw XP (150)');
  }

  // ── 10. Queue Cancellation & Ownership Guard ─────────────────────────────────
  console.log('\n[10/10] Testing Queue Cancellation & Ownership Guard...');
  {
    const cancelTicket = await CompetitiveRepository.addQueueTicket({
      ticketId: 'ticket_to_cancel',
      userId: 'user_cancel_owner',
      displayName: 'CancelOwner',
      rankTier: 'Bronze',
      rankPoints: 100,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Unauthorized cancellation rejected
    let unauthorizedFailed = false;
    try {
      await CompetitiveRepository.cancelQueueTicket(cancelTicket.ticketId, 'attacker_user');
    } catch {
      unauthorizedFailed = true;
    }
    assert(unauthorizedFailed, 'Cross-user queue cancellation rejected');

    // Owner cancellation succeeds
    const cancelled = await CompetitiveRepository.cancelQueueTicket(cancelTicket.ticketId, 'user_cancel_owner');
    assert(cancelled, 'Owner queue cancellation succeeds');
    const checked = await CompetitiveRepository.getQueueTicket(cancelTicket.ticketId);
    assert(checked?.status === 'CANCELLED', 'Ticket status updated to CANCELLED');
  }

  console.log('\n================================================================');
  console.log(`📊 Competitive Test Summary: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('================================================================');

  if (testsFailed > 0) {
    console.error('❌ SOME COMPETITIVE TESTS FAILED');
  } else {
    console.log('🎉 ALL COMPETITIVE MATCHMAKING & CHALLENGE TESTS PASSED!');
  }

  return { passed: testsPassed, failed: testsFailed };
}

if (require.main === module) {
  runCompetitiveTests()
    .then((results) => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal error in competitive test suite:', err);
      process.exit(1);
    });
}
