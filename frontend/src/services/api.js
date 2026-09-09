/**
 * SportX API Client — connected to backend at /api/v1
 * All calls go through Vite proxy → http://localhost:3001
 */

const BASE = '/api/v1';

function getToken() {
  return localStorage.getItem('sportx_token') || '';
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // ── Auth ───────────────────────────────────────────────────────────────────
  signup: (body) => request('POST', '/auth/signup', body),
  login: (body) => request('POST', '/auth/login', body),

  // ── Users ──────────────────────────────────────────────────────────────────
  getProfile: () => request('GET', '/users/profile'),
  updateProfile: (body) => request('PUT', '/users/profile', body),

  // ── Sports ─────────────────────────────────────────────────────────────────
  getSports: () => request('GET', '/sports'),
  selectSports: (sports) => request('POST', '/sports/select', { sports }),

  // ── Exercises ──────────────────────────────────────────────────────────────
  getExercises: () => request('GET', '/exercises'),
  getExercise: (id) => request('GET', `/exercises/${id}`),

  // ── Workouts ───────────────────────────────────────────────────────────────
  getWorkouts: (params) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request('GET', `/workouts${q}`);
  },
  getTodayWorkout: () => request('GET', '/workouts/today'),
  getWorkout: (id) => request('GET', `/workouts/${id}`),

  // ── Sessions ───────────────────────────────────────────────────────────────
  startSession: (body) => request('POST', '/sessions/start', body),
  completeSession: (sessionId, body) => request('POST', `/sessions/${sessionId}/complete`, body),
  cancelSession: (sessionId) => request('POST', `/sessions/${sessionId}/cancel`),

  // ── Activity ───────────────────────────────────────────────────────────────
  getHistory: (period = '7d') => request('GET', `/activity/history?period=${period}`),

  // ── Gamification ───────────────────────────────────────────────────────────
  getBadges: () => request('GET', '/gamification/badges'),

  // ── Leaderboard ────────────────────────────────────────────────────────────
  getGlobalLeaderboard: () => request('GET', '/leaderboard/global'),
  getCollegeLeaderboard: () => request('GET', '/leaderboard/college'),

  // ── AI Coach ───────────────────────────────────────────────────────────────
  askCoach: (body) => request('POST', '/ai/ask-coach', body),
  analyzeForm: (body) => request('POST', '/ai/analyze-form', body),
  getCoachingTip: (exerciseId) => request('GET', `/ai/coaching-tip?exerciseId=${exerciseId}`),

  // ── Challenges ─────────────────────────────────────────────────────────────
  getChallenges: () => request('GET', '/challenges'),
  createChallenge: (body) => request('POST', '/challenges', body),
  respondChallenge: (id, action) => request('PATCH', `/challenges/${id}/respond`, { action }),

  // ── Lobbies ────────────────────────────────────────────────────────────────
  createLobby: (body) => request('POST', '/lobbies', body),
  joinLobby: (id) => request('POST', `/lobbies/${id}/join`),
  getLobby: (id) => request('GET', `/lobbies/${id}`),

  // ── Bugs ───────────────────────────────────────────────────────────────────
  reportBug: (body) => request('POST', '/bugs', body),
};
