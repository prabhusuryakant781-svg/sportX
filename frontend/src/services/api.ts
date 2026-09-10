/**
 * SportX API Client — connected to backend at /api/v1
 * All calls go through Vite proxy → http://localhost:3001
 */

const BASE = '/api/v1';

function getToken(): string {
  return localStorage.getItem('sportx_token') || '';
}

async function request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  // ── Auth ───────────────────────────────────────────────────────────────────
  signup: (body: { name: string; email: string; password: string; collegeName?: string; department?: string }) =>
    request('POST', '/auth/signup', body),
  login: (body: { email: string; password: string }) =>
    request('POST', '/auth/login', body),
  loginWithGoogle: (body: { idToken: string }) =>
    request('POST', '/auth/google', body),

  // ── Users ──────────────────────────────────────────────────────────────────
  getProfile: () => request('GET', '/users/profile'),
  updateProfile: (body: Record<string, unknown>) => request('PUT', '/users/profile', body),

  // ── Sports ─────────────────────────────────────────────────────────────────
  getSports: () => request('GET', '/sports'),
  selectSports: (sports: string[]) => request('POST', '/sports/select', { sports }),

  // ── Exercises ──────────────────────────────────────────────────────────────
  getExercises: () => request('GET', '/exercises'),
  getExercise: (id: string) => request('GET', `/exercises/${id}`),

  // ── Workouts ───────────────────────────────────────────────────────────────
  getWorkouts: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request('GET', `/workouts${q}`);
  },
  getTodayWorkout: () => request('GET', '/workouts/today'),
  getWorkout: (id: string) => request('GET', `/workouts/${id}`),

  // ── Sessions ───────────────────────────────────────────────────────────────
  startSession: (body: { exerciseId: string; planId?: string }) =>
    request('POST', '/sessions/start', body),
  completeSession: (sessionId: string, body: Record<string, unknown>) =>
    request('POST', `/sessions/${sessionId}/complete`, body),
  cancelSession: (sessionId: string) =>
    request('POST', `/sessions/${sessionId}/cancel`),

  // ── Activity ───────────────────────────────────────────────────────────────
  getHistory: (period = '7d') => request('GET', `/activity/history?period=${period}`),
  logManualActivity: (body: { sportId: string; durationMinutes: number; notes?: string }) =>
    request('POST', '/activity/manual', body),

  // ── Gamification ───────────────────────────────────────────────────────────
  getBadges: () => request('GET', '/gamification/badges'),

  // ── Leaderboard ────────────────────────────────────────────────────────────
  getGlobalLeaderboard: () => request('GET', '/leaderboard/global'),
  getCollegeLeaderboard: () => request('GET', '/leaderboard/college'),

  // ── AI Coach ───────────────────────────────────────────────────────────────
  askCoach: (body: { message: string; context?: string }) =>
    request('POST', '/ai/ask-coach', body),
  analyzeForm: (body: Record<string, unknown>) =>
    request('POST', '/ai/analyze-form', body),
  getCoachingTip: (exerciseId: string) =>
    request('GET', `/ai/coaching-tip?exerciseId=${exerciseId}`),

  // ── Challenges ─────────────────────────────────────────────────────────────
  getChallenges: () => request('GET', '/challenges'),
  createChallenge: (body: Record<string, unknown>) => request('POST', '/challenges', body),
  respondChallenge: (id: string, action: string) =>
    request('PATCH', `/challenges/${id}/respond`, { action }),

  // ── Lobbies ────────────────────────────────────────────────────────────────
  createLobby: (body: Record<string, unknown>) => request('POST', '/lobbies', body),
  joinLobby: (id: string) => request('POST', `/lobbies/${id}/join`),
  getLobby: (id: string) => request('GET', `/lobbies/${id}`),

  // ── Bugs ───────────────────────────────────────────────────────────────────
  reportBug: (body: { category: string; exerciseId?: string; description: string; deviceInfo?: string }) =>
    request('POST', '/bugs', body),
};
