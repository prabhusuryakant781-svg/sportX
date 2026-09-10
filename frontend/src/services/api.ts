/**
 * SportX API Client — connected to backend at /api/v1
 * Supports dynamic Firebase ID Token bearer authentication, automatic session refresh,
 * and comprehensive service methods for Workouts, AI Coach, Vision, Challenges, and Lobbies.
 */
import { auth } from './firebase.js';

const BASE = '/api/v1';

async function getToken(): Promise<string> {
  if (auth && auth.currentUser) {
    try {
      const freshToken = await auth.currentUser.getIdToken();
      if (freshToken) {
        localStorage.setItem('sportx_token', freshToken);
        return freshToken;
      }
    } catch (_) {}
  }
  return localStorage.getItem('sportx_token') || '';
}

async function request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await getToken();
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
  resetPassword: (email: string) =>
    request('POST', '/auth/reset-password', { email }),
  logout: () =>
    request('POST', '/auth/logout'),

  // ── Users ──────────────────────────────────────────────────────────────────
  getProfile: () => request('GET', '/users/profile'),
  updateProfile: (body: Record<string, unknown>) => request('PUT', '/users/profile', body),
  getStats: () => request('GET', '/users/stats'),

  // ── Sports ─────────────────────────────────────────────────────────────────
  getSports: () => request('GET', '/sports'),
  selectSports: (sports: string[]) => request('POST', '/sports/select', { sports }),

  // ── Exercises ──────────────────────────────────────────────────────────────
  getExercises: () => request('GET', '/exercises'),
  getExercise: (id: string) => request('GET', `/exercises/${id}`),
  searchExercises: (body: Record<string, unknown>) => request('POST', '/exercises/search', body),

  // ── Workouts ───────────────────────────────────────────────────────────────
  getWorkouts: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request('GET', `/workouts${q}`);
  },
  getTodayWorkout: () => request('GET', '/workouts/today'),
  getWorkout: (id: string) => request('GET', `/workouts/${id}`),
  createWorkout: (body: Record<string, unknown>) => request('POST', '/workouts', body),

  // ── Sessions ───────────────────────────────────────────────────────────────
  startSession: (body: { exerciseId: string; planId?: string }) =>
    request('POST', '/sessions/start', body),
  completeSession: (sessionId: string, body: Record<string, unknown>) =>
    request('POST', `/sessions/${sessionId}/complete`, body),
  finishSession: (sessionId: string, body: Record<string, unknown>) =>
    request('POST', `/sessions/${sessionId}/complete`, body),
  cancelSession: (sessionId: string) =>
    request('POST', `/sessions/${sessionId}/cancel`),
  getSession: (sessionId: string) => request('GET', `/sessions/${sessionId}`),
  getUserSessions: (limit = 20, status = '') =>
    request('GET', `/sessions?limit=${limit}${status ? '&status=' + status : ''}`),

  // ── Activity & Progress ────────────────────────────────────────────────────
  getHistory: (period = '7d') => request('GET', `/activity/history?period=${period}`),
  logManualActivity: (body: { sportId: string; durationMinutes: number; notes?: string }) =>
    request('POST', '/activity/manual', body),
  getProgress: () => request('GET', '/progress'),
  getProgressSummary: () => request('GET', '/progress/summary'),

  // ── Gamification ───────────────────────────────────────────────────────────
  getBadges: () => request('GET', '/gamification/badges'),
  getGamificationStatus: () => request('GET', '/gamification/status'),

  // ── Leaderboard ────────────────────────────────────────────────────────────
  getGlobalLeaderboard: () => request('GET', '/leaderboard/global'),
  getCollegeLeaderboard: () => request('GET', '/leaderboard/college'),

  // ── AI Coach (Gemini) ──────────────────────────────────────────────────────
  askCoach: (body: { message: string; context?: string }) =>
    request('POST', '/ai/ask-coach', body),
  analyzeSession: (sessionId: string) =>
    request('POST', '/ai/session-analysis', { sessionId }),
  generateWorkout: (body: Record<string, unknown>) =>
    request('POST', '/ai/generate-workout', body),
  getAIProgress: () => request('GET', '/ai/progress'),
  getAIConsistency: () => request('GET', '/ai/consistency'),
  analyzeForm: (body: Record<string, unknown>) =>
    request('POST', '/ai/analyze-form', body),
  getCoachingTip: (exerciseId: string) =>
    request('GET', `/ai/coaching-tip?exerciseId=${exerciseId}`),

  // ── Computer Vision ────────────────────────────────────────────────────────
  submitVisionResult: (body: Record<string, unknown>) => request('POST', '/vision/results', body),
  recordVisionResult: (body: Record<string, unknown>) => request('POST', '/vision/results', body),
  getVisionResults: (limit = 10) => request('GET', `/vision/results?limit=${limit}`),
  getSessionVisionResult: (sessionId: string) => request('GET', `/vision/results/${sessionId}`),
  getVisionFeedback: (body: Record<string, unknown>) => request('POST', '/vision/feedback', body),

  // ── Challenges ─────────────────────────────────────────────────────────────
  getChallenges: () => request('GET', '/challenges'),
  createChallenge: (body: Record<string, unknown>) => request('POST', '/challenges', body),
  respondChallenge: (id: string, action: string) =>
    request('PATCH', `/challenges/${id}/respond`, { action }),

  // ── Lobbies ────────────────────────────────────────────────────────────────
  createLobby: (body: Record<string, unknown>) => request('POST', '/lobbies', body),
  joinLobby: (id: string) => request('POST', `/lobbies/${id}/join`),
  getLobby: (id: string) => request('GET', `/lobbies/${id}`),
  startLobby: (id: string) => request('POST', `/lobbies/${id}/start`),

  // ── Notifications ──────────────────────────────────────────────────────────
  getNotifications: () => request('GET', '/notifications'),
  registerFCMToken: (fcmToken: string, deviceType: string) =>
    request('POST', '/notifications/device-token', { fcmToken, deviceType }),

  // ── Bugs ───────────────────────────────────────────────────────────────────
  reportBug: (body: { category: string; exerciseId?: string; description: string; deviceInfo?: string }) =>
    request('POST', '/bugs', body),
};
