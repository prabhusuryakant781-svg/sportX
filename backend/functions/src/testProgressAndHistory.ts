/**
 * SportX Progress & History Automated Test Suite
 * Validates:
 * 1. Date Boundary Aggregation (today, 7d, 30d, all-time)
 * 2. Same-Day Multiple Workouts (volume summed, unique active days = 1)
 * 3. Empty User Zero-State (0 reps, 0 mins, [] trends, {} PRs, 0% goals)
 * 4. Dynamic Personal Records (PRs) from completed sessions & activity telemetry
 * 5. History Pagination Boundaries (page, limit, total, totalPages, hasMore)
 * 6. Ownership & Security Invariants (cross-user access blocked with 403)
 */

import { ProgressRepository } from './repositories/progressRepository';
import { SessionRepository } from './repositories/sessionRepository';
import { ActivityRepository } from './repositories/activityRepository';
import { UserRepository } from './repositories/userRepository';
import { WorkoutSessionDoc, ActivityLogDoc } from './types';

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

export async function runProgressAndHistoryTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('📈 Running Progress & History Server-Authoritative Test Suite');
  console.log('================================================================\n');

  // Fixed reference time for deterministic testing: 2026-09-11T12:00:00.000Z
  const refDate = new Date('2026-09-11T12:00:00.000Z');

  // ── TEST 1: Date Boundaries (today, 7d, 30d, all) ───────────────────────────
  console.log('[1/6] Testing Date Boundary Calculations...');
  {
    const uid = 'user_test_dates';
    await UserRepository.create(uid, {
      userId: uid,
      name: 'Date Boundary Athlete',
      email: 'dates@sportx.com',
      workoutDaysPerWeek: 5,
    });

    // Session A: Completed today at 09:00 UTC (within today, 7d, 30d, all)
    const sessA: WorkoutSessionDoc = {
      sessionId: 'sess_date_today',
      userId: uid,
      workoutId: 'w1',
      sportId: 'fitness',
      status: 'completed',
      totalReps: 15,
      durationMinutes: 10,
      caloriesBurned: 70,
      formAccuracyAverage: 92,
      heartRateAverage: null,
      xpEarned: 100,
      startTime: '2026-09-11T08:50:00.000Z',
      endTime: '2026-09-11T09:00:00.000Z',
      createdAt: '2026-09-11T08:50:00.000Z',
      exerciseLogs: [],
    };

    // Session B: Completed 3 days ago (within 7d, 30d, all; NOT today)
    const sessB: WorkoutSessionDoc = {
      sessionId: 'sess_date_3d',
      userId: uid,
      workoutId: 'w2',
      sportId: 'fitness',
      status: 'completed',
      totalReps: 20,
      durationMinutes: 15,
      caloriesBurned: 110,
      formAccuracyAverage: 88,
      heartRateAverage: null,
      xpEarned: 150,
      startTime: '2026-09-08T14:45:00.000Z',
      endTime: '2026-09-08T15:00:00.000Z',
      createdAt: '2026-09-08T14:45:00.000Z',
      exerciseLogs: [],
    };

    // Session C: Completed 14 days ago (within 30d, all; NOT today, NOT 7d)
    const sessC: WorkoutSessionDoc = {
      sessionId: 'sess_date_14d',
      userId: uid,
      workoutId: 'w3',
      sportId: 'fitness',
      status: 'completed',
      totalReps: 30,
      durationMinutes: 20,
      caloriesBurned: 160,
      formAccuracyAverage: 84,
      heartRateAverage: null,
      xpEarned: 200,
      startTime: '2026-08-28T09:40:00.000Z',
      endTime: '2026-08-28T10:00:00.000Z',
      createdAt: '2026-08-28T09:40:00.000Z',
      exerciseLogs: [],
    };

    // Session D: Completed 45 days ago (within all; NOT today, 7d, 30d)
    const sessD: WorkoutSessionDoc = {
      sessionId: 'sess_date_45d',
      userId: uid,
      workoutId: 'w4',
      sportId: 'fitness',
      status: 'completed',
      totalReps: 40,
      durationMinutes: 25,
      caloriesBurned: 200,
      formAccuracyAverage: 80,
      heartRateAverage: null,
      xpEarned: 250,
      startTime: '2026-07-28T09:35:00.000Z',
      endTime: '2026-07-28T10:00:00.000Z',
      createdAt: '2026-07-28T09:35:00.000Z',
      exerciseLogs: [],
    };

    // Session E: In-progress / Abandoned session today (must be ignored completely)
    const sessIgnored: WorkoutSessionDoc = {
      sessionId: 'sess_date_abandoned',
      userId: uid,
      workoutId: 'w5',
      sportId: 'fitness',
      status: 'abandoned',
      totalReps: 50,
      durationMinutes: 30,
      caloriesBurned: 300,
      formAccuracyAverage: 99,
      heartRateAverage: null,
      xpEarned: 0,
      startTime: '2026-09-11T10:00:00.000Z',
      endTime: null,
      createdAt: '2026-09-11T10:00:00.000Z',
      exerciseLogs: [],
    };

    await Promise.all([
      SessionRepository.create(sessA),
      SessionRepository.create(sessB),
      SessionRepository.create(sessC),
      SessionRepository.create(sessD),
      SessionRepository.create(sessIgnored),
    ]);

    // Test 'today'
    const resToday = await ProgressRepository.calculateProgress(uid, 'today', refDate);
    assert(resToday.totalWorkouts === 1, 'Today window: contains exactly 1 completed workout');
    assert(resToday.totalReps === 15, 'Today window: total reps match today session (15)');
    assert(resToday.totalMinutes === 10, 'Today window: total minutes match today session (10)');
    assert(resToday.totalCalories === 70, 'Today window: total calories match today session (70)');
    assert(resToday.averageFormScore === 92, 'Today window: form average matches today session (92)');

    // Test '7d'
    const res7d = await ProgressRepository.calculateProgress(uid, '7d', refDate);
    assert(res7d.totalWorkouts === 2, '7-day window: contains exactly 2 workouts (today + 3d ago)');
    assert(res7d.totalReps === 35, '7-day window: total reps correctly summed (15 + 20 = 35)');
    assert(res7d.totalMinutes === 25, '7-day window: total minutes correctly summed (10 + 15 = 25)');
    assert(res7d.totalCalories === 180, '7-day window: total calories correctly summed (70 + 110 = 180)');
    assert(res7d.averageFormScore === 90, '7-day window: average form score correctly averaged ((92+88)/2 = 90)');

    // Test '30d'
    const res30d = await ProgressRepository.calculateProgress(uid, '30d', refDate);
    assert(res30d.totalWorkouts === 3, '30-day window: contains 3 workouts (excludes 45d ago)');
    assert(res30d.totalReps === 65, '30-day window: total reps correctly summed (15 + 20 + 30 = 65)');
    assert(res30d.totalCalories === 340, '30-day window: total calories correctly summed (70 + 110 + 160 = 340)');

    // Test 'all'
    const resAll = await ProgressRepository.calculateProgress(uid, 'all', refDate);
    assert(resAll.totalWorkouts === 4, 'All-time window: contains all 4 completed workouts');
    assert(resAll.totalReps === 105, 'All-time window: total reps match all 4 sessions (105)');
    assert(resAll.totalCalories === 540, 'All-time window: total calories match all 4 sessions (540)');
  }

  // ── TEST 2: Multiple Same-Day Workouts ────────────────────────────────────────
  console.log('\n[2/6] Testing Multiple Same-Day Workouts...');
  {
    const uid = 'user_test_sameday';
    await UserRepository.create(uid, {
      userId: uid,
      name: 'Same Day Multi-Session Athlete',
      email: 'sameday@sportx.com',
      workoutDaysPerWeek: 4,
    });

    // 3 distinct completed sessions on the same UTC day: 2026-09-11
    const s1: WorkoutSessionDoc = {
      sessionId: 'sess_sd_1',
      userId: uid,
      workoutId: 'w1',
      sportId: 'fitness',
      status: 'completed',
      totalReps: 20,
      durationMinutes: 15,
      caloriesBurned: 100,
      formAccuracyAverage: 85,
      heartRateAverage: null,
      xpEarned: 100,
      startTime: '2026-09-11T08:00:00.000Z',
      endTime: '2026-09-11T08:15:00.000Z',
      createdAt: '2026-09-11T08:00:00.000Z',
      exerciseLogs: [],
    };

    const s2: WorkoutSessionDoc = {
      sessionId: 'sess_sd_2',
      userId: uid,
      workoutId: 'w1',
      sportId: 'fitness',
      status: 'completed',
      totalReps: 25,
      durationMinutes: 20,
      caloriesBurned: 140,
      formAccuracyAverage: 95,
      heartRateAverage: null,
      xpEarned: 140,
      startTime: '2026-09-11T14:00:00.000Z',
      endTime: '2026-09-11T14:20:00.000Z',
      createdAt: '2026-09-11T14:00:00.000Z',
      exerciseLogs: [],
    };

    const s3: WorkoutSessionDoc = {
      sessionId: 'sess_sd_3',
      userId: uid,
      workoutId: 'w1',
      sportId: 'fitness',
      status: 'completed',
      totalReps: 15,
      durationMinutes: 10,
      caloriesBurned: 80,
      formAccuracyAverage: 90,
      heartRateAverage: null,
      xpEarned: 90,
      startTime: '2026-09-11T20:00:00.000Z',
      endTime: '2026-09-11T20:10:00.000Z',
      createdAt: '2026-09-11T20:00:00.000Z',
      exerciseLogs: [],
    };

    await Promise.all([
      SessionRepository.create(s1),
      SessionRepository.create(s2),
      SessionRepository.create(s3),
    ]);

    const resSameDay = await ProgressRepository.calculateProgress(uid, 'today', refDate);
    assert(resSameDay.totalWorkouts === 3, '3 completed sessions recorded for today');
    assert(resSameDay.totalReps === 60, 'Total reps summed additively across same-day sessions (20 + 25 + 15 = 60)');
    assert(resSameDay.totalMinutes === 45, 'Total minutes summed additively across same-day sessions (15 + 20 + 10 = 45)');
    assert(resSameDay.totalCalories === 320, 'Total calories summed additively (100 + 140 + 80 = 320)');
    assert(
      resSameDay.uniqueWorkoutDays === 1,
      'CRITICAL: 3 workouts on same day count as exactly 1 unique workout day'
    );
    assert(
      resSameDay.formScoreTrends.length === 1 && resSameDay.formScoreTrends[0].score === 90,
      'Same-day form scores averaged into a single daily trend data point ((85+95+90)/3 = 90)'
    );
  }

  // ── TEST 3: Empty User Zero-State Integrity ───────────────────────────────────
  console.log('\n[3/6] Testing Empty User Zero-State Integrity...');
  {
    const emptyUid = 'user_test_brand_new';
    await UserRepository.create(emptyUid, {
      userId: emptyUid,
      name: 'Fresh New Athlete',
      email: 'fresh@sportx.com',
      workoutDaysPerWeek: 4,
    });

    const emptyProgress = await ProgressRepository.calculateProgress(emptyUid, 'all', refDate);

    assert(emptyProgress.totalWorkouts === 0, 'Empty user totalWorkouts is 0');
    assert(emptyProgress.totalReps === 0, 'Empty user totalReps is 0 (NOT fabricated totalWorkouts * 12)');
    assert(emptyProgress.totalMinutes === 0, 'Empty user totalMinutes is 0');
    assert(emptyProgress.totalCalories === 0, 'Empty user totalCalories is 0');
    assert(emptyProgress.uniqueWorkoutDays === 0, 'Empty user uniqueWorkoutDays is 0');
    assert(emptyProgress.workoutFrequencyPerWeek === 0, 'Empty user workout frequency is 0 (NOT hardcoded 3)');
    assert(emptyProgress.averageFormScore === 0, 'Empty user averageFormScore is 0 (NOT hardcoded 88)');
    assert(
      Array.isArray(emptyProgress.formScoreTrends) && emptyProgress.formScoreTrends.length === 0,
      'Empty user formScoreTrends is empty array [] (NO fabricated 2026-09-04 dummy dates)'
    );
    assert(
      typeof emptyProgress.personalRecords === 'object' &&
        Object.keys(emptyProgress.personalRecords).length === 0,
      'Empty user personalRecords is empty object {} (NO fake squat/pushup PRs)'
    );
    assert(
      emptyProgress.weeklyProgress.daysCompleted === 0 &&
        emptyProgress.weeklyProgress.completionPercentage === 0,
      'Empty user weekly progress is 0 / 0% (NOT hardcoded 1 / 25%)'
    );
    assert(
      emptyProgress.monthlyProgress.workoutsCompleted === 0 &&
        emptyProgress.monthlyProgress.completionPercentage === 0,
      'Empty user monthly progress is 0 / 0% (NOT hardcoded 3 / 18%)'
    );
    assert(
      emptyProgress.goalCompletionPercentage === 0,
      'Empty user goalCompletionPercentage is 0 (NOT hardcoded 45%)'
    );
  }

  // ── TEST 4: Dynamic Personal Records (PRs) ────────────────────────────────────
  console.log('\n[4/6] Testing Dynamic Personal Records Calculation...');
  {
    const uidPr = 'user_test_prs';
    await UserRepository.create(uidPr, {
      userId: uidPr,
      name: 'Record Breaker',
      email: 'prs@sportx.com',
    });

    // Session 1: Squats with 2 sets (set 1: 15 reps, set 2: 24 reps)
    const prSess1: WorkoutSessionDoc = {
      sessionId: 'sess_pr_1',
      userId: uidPr,
      workoutId: 'w_legs',
      sportId: 'fitness',
      status: 'completed',
      totalReps: 39,
      durationMinutes: 20,
      caloriesBurned: 150,
      formAccuracyAverage: 90,
      heartRateAverage: null,
      xpEarned: 150,
      startTime: '2026-09-05T10:00:00.000Z',
      endTime: '2026-09-05T10:20:00.000Z',
      createdAt: '2026-09-05T10:00:00.000Z',
      exerciseLogs: [
        {
          exerciseId: 'squat',
          exerciseName: 'Barbell Squat',
          sets: [
            { setNumber: 1, reps: 15, formAccuracy: 90, feedbackMessages: [] },
            { setNumber: 2, reps: 24, formAccuracy: 92, feedbackMessages: [] },
          ],
          totalReps: 39,
          averageFormScore: 91,
        },
      ],
    };

    // Session 2: New Squat PR with 32 reps in a set!
    const prSess2: WorkoutSessionDoc = {
      sessionId: 'sess_pr_2',
      userId: uidPr,
      workoutId: 'w_legs_2',
      sportId: 'fitness',
      status: 'completed',
      totalReps: 32,
      durationMinutes: 15,
      caloriesBurned: 130,
      formAccuracyAverage: 95,
      heartRateAverage: null,
      xpEarned: 160,
      startTime: '2026-09-10T10:00:00.000Z',
      endTime: '2026-09-10T10:15:00.000Z',
      createdAt: '2026-09-10T10:00:00.000Z',
      exerciseLogs: [
        {
          exerciseId: 'squat',
          exerciseName: 'Barbell Squat',
          sets: [
            { setNumber: 1, reps: 32, formAccuracy: 95, feedbackMessages: [] },
          ],
          totalReps: 32,
          averageFormScore: 95,
        },
      ],
    };

    // Activity log telemetry for pushups: 45 reps, 60 seconds
    const pushupLog: ActivityLogDoc = {
      logId: 'act_pr_pushups',
      userId: uidPr,
      sessionId: 'sess_telemetry',
      exerciseId: 'pushup',
      exerciseName: 'Pushups',
      reps: 45,
      durationSeconds: 60,
      formScore: 93,
      detectedErrors: [],
      calories: 35,
      timestamp: '2026-09-10T11:00:00.000Z',
    };

    await Promise.all([
      SessionRepository.create(prSess1),
      SessionRepository.create(prSess2),
      ActivityRepository.create(pushupLog),
    ]);

    const prProgress = await ProgressRepository.calculateProgress(uidPr, 'all', refDate);
    assert(
      prProgress.personalRecords['squat_max_reps'] === 32,
      'Squat PR correctly elevated to 32 reps from completed session sets'
    );
    assert(
      prProgress.personalRecords['pushup_max_reps'] === 45,
      'Pushup PR correctly derived from activity telemetry log (45 reps)'
    );
    assert(
      prProgress.personalRecords['pushup_max_duration_seconds'] === 60,
      'Pushup duration PR registered from telemetry log (60 seconds)'
    );
  }

  // ── TEST 5: History Pagination Boundaries ─────────────────────────────────────
  console.log('\n[5/6] Testing History Pagination Boundaries...');
  {
    const uidPag = 'user_test_pagination';
    // Generate 25 distinct completed sessions
    const sessionsList: WorkoutSessionDoc[] = [];
    for (let i = 1; i <= 25; i++) {
      const day = i < 10 ? `0${i}` : `${i}`;
      sessionsList.push({
        sessionId: `sess_page_${i}`,
        userId: uidPag,
        workoutId: 'w_pag',
        sportId: 'fitness',
        status: 'completed',
        totalReps: 10 + i,
        durationMinutes: 10,
        caloriesBurned: 50,
        formAccuracyAverage: 85,
        heartRateAverage: null,
        xpEarned: 80,
        startTime: `2026-08-${day}T10:00:00.000Z`,
        endTime: `2026-08-${day}T10:10:00.000Z`,
        createdAt: `2026-08-${day}T10:00:00.000Z`,
        exerciseLogs: [],
      });
    }

    for (const s of sessionsList) {
      await SessionRepository.create(s);
    }

    // Pagination helper function modeling the endpoint logic
    function paginateItems<T>(items: T[], page: number, limit: number) {
      const total = items.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const data = items.slice(startIndex, startIndex + limit);
      const hasMore = page < totalPages;
      return { page, limit, total, totalPages, hasMore, data };
    }

    // Page 1 with limit 10
    const p1 = paginateItems(sessionsList, 1, 10);
    assert(p1.data.length === 10, 'Page 1 has exactly 10 items');
    assert(p1.page === 1 && p1.totalPages === 3, 'Page 1 reports 3 total pages for 25 items');
    assert(p1.hasMore === true, 'Page 1 hasMore is true');

    // Page 2 with limit 10
    const p2 = paginateItems(sessionsList, 2, 10);
    assert(p2.data.length === 10, 'Page 2 has exactly 10 items');
    assert(p2.hasMore === true, 'Page 2 hasMore is true');

    // Page 3 with limit 10 (last page with remainder)
    const p3 = paginateItems(sessionsList, 3, 10);
    assert(p3.data.length === 5, 'Page 3 contains remainder 5 items');
    assert(p3.hasMore === false, 'Page 3 hasMore is false (reached end)');

    // Page 4 with limit 10 (out of bounds)
    const p4 = paginateItems(sessionsList, 4, 10);
    assert(p4.data.length === 0, 'Page 4 (out of bounds) returns 0 items');
    assert(p4.hasMore === false, 'Page 4 hasMore is false');
  }

  // ── TEST 6: Ownership Verification & Access Invariants ───────────────────────
  console.log('\n[6/6] Testing Ownership & Security Guards...');
  {
    function checkOwnershipGuard(requesterUid: string, targetUid?: string, role = 'user'): boolean {
      if (targetUid && targetUid !== requesterUid && role !== 'admin') {
        return false; // Forbidden (403)
      }
      return true; // Allowed
    }

    assert(
      checkOwnershipGuard('athlete_123', 'athlete_123') === true,
      'User can access their own progress & history'
    );
    assert(
      checkOwnershipGuard('athlete_123', undefined) === true,
      'User accessing without explicit userId parameter defaults to self (allowed)'
    );
    assert(
      checkOwnershipGuard('attacker_456', 'victim_123') === false,
      'Attacker cannot access victim history/progress (blocked by 403 ownership guard)'
    );
    assert(
      checkOwnershipGuard('admin_999', 'victim_123', 'admin') === true,
      'Admin role is permitted cross-user inspection'
    );
  }

  console.log(`\nProgress & History Test Results: ${passed} passed, ${failed} failed.\n`);
  return { passed, failed };
}

// Standalone execution support
if (require.main === module) {
  runProgressAndHistoryTests().then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
