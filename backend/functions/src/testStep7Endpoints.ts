/**
 * SportX Step 7: Real HTTP Endpoints Integration & Verification Script
 * Boots Express app on port 3099 and verifies all Step 7 HTTP routes end-to-end.
 */
process.env.NODE_ENV = 'test';
import { app } from './index';
import http from 'http';
import { UserRepository } from './repositories/userRepository';

const PORT = 3099;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✅ ${msg}`);
}

async function request(path: string, options: { method?: string; body?: any; headers?: Record<string, string> } = {}) {
  const url = `http://127.0.0.1:${PORT}/api/v1${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runEndpointsTest() {
  console.log('================================================================');
  console.log('🌐 RUNNING SPORTX STEP 7: REAL HTTP ENDPOINTS VERIFICATION');
  console.log('================================================================');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`Server listening on port ${PORT}\n`);

  try {
    // 1. Seed test users
    console.log('--- 1. Initializing Test Athletes ---');
    const userA = 'test_user_athlete1';
    const userB = 'test_user_athlete2';
    await UserRepository.create(userA, {
      userId: userA,
      name: 'Rohan Sharma',
      email: 'athlete1@sportx.app',
      totalWorkouts: 2,
      totalXp: 500,
      currentStreak: 3,
      longestStreak: 5,
      collegeName: 'IIT Bombay',
      department: 'Computer Science',
    });
    await UserRepository.create(userB, {
      userId: userB,
      name: 'Arjun Rival',
      email: 'athlete2@sportx.app',
      totalWorkouts: 0,
      totalXp: 0,
      currentStreak: 0,
      longestStreak: 0,
      collegeName: 'IIT Delhi',
      department: 'Mechanical',
    });
    const authHeader = { Authorization: `Bearer ${userA}` };
    assert(true, 'Test athletes seeded and bearer auth prepared');

    // 2. Goals Templates
    console.log('\n--- 2. Goals Templates Endpoint ---');
    const templatesRes = await request('/goals/templates', { headers: authHeader });
    assert(templatesRes.status === 200, 'GET /goals/templates returns 200');
    assert(Array.isArray(templatesRes.data?.data), 'Templates list is an array');
    assert(templatesRes.data.data.length >= 10, `Found ${templatesRes.data.data.length} templates (>= 10)`);

    // 3. Goals Creation & Retrieval
    console.log('\n--- 3. Goals Creation & Retrieval Endpoint ---');
    const createGoalRes = await request('/goals', {
      method: 'POST',
      headers: authHeader,
      body: {
        title: 'Complete 30 Push-ups',
        category: 'strength',
        type: 'exercise_reps',
        target: 30,
        unit: 'reps',
        exerciseId: 'pushup',
        targetDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      },
    });
    assert(createGoalRes.status === 201, 'POST /goals returns 201 Created');
    const createdGoal = createGoalRes.data?.data;
    assert(createdGoal?.goalId !== undefined, 'Returned created goal with goalId');
    assert(createdGoal?.current === 0, 'Initial progress is 0');

    // Reject target <= 0
    const invalidGoalRes = await request('/goals', {
      method: 'POST',
      headers: authHeader,
      body: {
        title: 'Impossible Goal',
        category: 'fitness',
        type: 'workout_count',
        target: 0,
        unit: 'workouts',
        targetDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
    });
    assert(invalidGoalRes.status === 400, 'POST /goals with target <= 0 rejected with HTTP 400');

    // Get goals
    const getGoalsRes = await request('/goals', { headers: authHeader });
    assert(getGoalsRes.status === 200, 'GET /goals returns 200');
    assert(Array.isArray(getGoalsRes.data?.data), 'Goals list returned');
    assert(getGoalsRes.data.data.some((g: any) => g.goalId === createdGoal.goalId), 'Created goal found in list');

    // 4. Performance Score Endpoint
    console.log('\n--- 4. Performance Score Endpoint ---');
    const perfRes = await request('/performance/score', { headers: authHeader });
    assert(perfRes.status === 200, 'GET /performance/score returns 200');
    const perf = perfRes.data?.data;
    assert(typeof perf?.overallScore === 'number', `Overall score is number: ${perf?.overallScore}`);
    assert(perf?.breakdown !== undefined, 'Breakdown object returned');
    assert(typeof perf?.breakdown?.form === 'number', `Form pillar is number: ${perf?.breakdown?.form}`);
    assert(typeof perf?.provisional === 'boolean', `Provisional flag is boolean: ${perf?.provisional}`);

    // 5. Friends Endpoints
    console.log('\n--- 5. Friends & Social Endpoints ---');
    const searchRes = await request('/friends/search?q=Arjun', { headers: authHeader });
    assert(searchRes.status === 200, 'GET /friends/search returns 200');
    assert(Array.isArray(searchRes.data?.data), 'Search results is array');

    const friendsListRes = await request('/friends', { headers: authHeader });
    assert(friendsListRes.status === 200, 'GET /friends returns 200');
    assert(Array.isArray(friendsListRes.data?.data), 'Friends list is array');

    const requestsRes = await request('/friends/requests', { headers: authHeader });
    assert(requestsRes.status === 200, 'GET /friends/requests returns 200');
    assert(Array.isArray(requestsRes.data?.data), 'Friend requests list is array');

    // 6. Competitive & Friend Challenges History
    console.log('\n--- 6. Challenge History Endpoints ---');
    const historyRes = await request('/competitive/history', { headers: authHeader });
    assert(historyRes.status === 200, 'GET /competitive/history returns 200');
    assert(Array.isArray(historyRes.data?.data), 'History list is array');

    const winHistoryRes = await request('/competitive/history?outcome=win', { headers: authHeader });
    assert(winHistoryRes.status === 200, 'GET /competitive/history?outcome=win returns 200');

    // 7. Anti-Cheat Protections on Finalize
    console.log('\n--- 7. Anti-Cheat Endpoint Enforcements ---');
    // Missing matchId
    const badMatchRes = await request('/competitive/finalize', {
      method: 'POST',
      headers: authHeader,
      body: {
        matchId: 'non_existent_match',
        telemetry: {
          exerciseId: 'squat',
          reps: 10,
          formScore: 90,
          confidence: 0.9,
          duration: 30,
        },
      },
    });
    assert(badMatchRes.status === 400 || badMatchRes.status === 404, 'Invalid match rejected with HTTP 400/404');

    console.log('\n================================================================');
    console.log('🎉 ALL STEP 7 HTTP ENDPOINTS VERIFIED AND RESPONDING CORRECTLY!');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runEndpointsTest().catch((err) => {
  console.error('Fatal Endpoint Test Error:', err);
  process.exit(1);
});
