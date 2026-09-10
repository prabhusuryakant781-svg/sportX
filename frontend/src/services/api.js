/**
 * SportX API Client — connected to backend at /api/v1
 * Supports dynamic Firebase ID Token bearer authentication, automatic session refresh,
 * and comprehensive service methods for Workouts, AI Coach, Vision, Challenges, and Lobbies.
 */
import { auth } from './firebase.js';

const BASE = '/api/v1';

async function getToken() {
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

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getToken();
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
  resetPassword: (email) => request('POST', '/auth/reset-password', { email }),
  logout: () => request('POST', '/auth/logout'),

  // ── Users ──────────────────────────────────────────────────────────────────
  getProfile: () => request('GET', '/users/profile'),
  updateProfile: (body) => request('PUT', '/users/profile', body),
  getStats: () => request('GET', '/users/stats'),

  // ── Sports ─────────────────────────────────────────────────────────────────
  getSports: () => request('GET', '/sports'),
  selectSports: (sports) => request('POST', '/sports/select', { sports }),

  // ── Exercises ──────────────────────────────────────────────────────────────
  getExercises: () => request('GET', '/exercises'),
  getExercise: (id) => request('GET', `/exercises/${id}`),
  searchExercises: (body) => request('POST', '/exercises/search', body),

  // ── Workouts ───────────────────────────────────────────────────────────────
  getWorkouts: (params) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request('GET', `/workouts${q}`);
  },
  getTodayWorkout: () => request('GET', '/workouts/today'),
  getWorkout: (id) => request('GET', `/workouts/${id}`),
  createWorkout: (body) => request('POST', '/workouts', body),

  // ── Sessions ───────────────────────────────────────────────────────────────
  startSession: (body) => request('POST', '/sessions/start', body),
  completeSession: (sessionId, body) => request('POST', `/sessions/${sessionId}/complete`, body),
  finishSession: (sessionId, body) => request('POST', `/sessions/${sessionId}/complete`, body),
  cancelSession: (sessionId) => request('POST', `/sessions/${sessionId}/cancel`),
  getSession: (sessionId) => request('GET', `/sessions/${sessionId}`),
  getUserSessions: (limit = 20, status = '') => request('GET', `/sessions?limit=${limit}${status ? '&status=' + status : ''}`),

  // ── Activity & Progress ────────────────────────────────────────────────────
  getHistory: (period = '7d') => request('GET', `/activity/history?period=${period}`),
  getProgress: () => request('GET', '/progress'),
  getProgressSummary: () => request('GET', '/progress/summary'),

  // ── Gamification ───────────────────────────────────────────────────────────
  getBadges: () => request('GET', '/gamification/badges'),
  getGamificationStatus: () => request('GET', '/gamification/status'),

  // ── Leaderboard ────────────────────────────────────────────────────────────
  getGlobalLeaderboard: () => request('GET', '/leaderboard/global'),
  getCollegeLeaderboard: () => request('GET', '/leaderboard/college'),

  // ── AI Coach (Gemini) ──────────────────────────────────────────────────────
  askCoach: (body) => request('POST', '/ai/ask-coach', body),
  analyzeSession: (sessionId) => request('POST', '/ai/session-analysis', { sessionId }),
  generateWorkout: (body) => request('POST', '/ai/generate-workout', body),
  getAIProgress: () => request('GET', '/ai/progress'),
  getAIConsistency: () => request('GET', '/ai/consistency'),
  analyzeForm: (body) => request('POST', '/ai/analyze-form', body),
  getCoachingTip: (exerciseId) => request('GET', `/ai/coaching-tip?exerciseId=${exerciseId}`),

  // ── Computer Vision ────────────────────────────────────────────────────────
  submitVisionResult: (body) => request('POST', '/vision/results', body),
  recordVisionResult: (body) => request('POST', '/vision/results', body),
  getVisionResults: (limit = 10) => request('GET', `/vision/results?limit=${limit}`),
  getSessionVisionResult: (sessionId) => request('GET', `/vision/results/${sessionId}`),
  getVisionFeedback: (body) => request('POST', '/vision/feedback', body),

  // ── Challenges ─────────────────────────────────────────────────────────────
  getChallenges: () => request('GET', '/challenges'),
  createChallenge: (body) => request('POST', '/challenges', body),
  respondChallenge: (id, action) => request('PATCH', `/challenges/${id}/respond`, { action }),

  // ── Lobbies ────────────────────────────────────────────────────────────────
  createLobby: (body) => request('POST', '/lobbies', body),
  joinLobby: (id) => request('POST', `/lobbies/${id}/join`),
  getLobby: (id) => request('GET', `/lobbies/${id}`),
  startLobby: (id) => request('POST', `/lobbies/${id}/start`),

  // ── Notifications ──────────────────────────────────────────────────────────
  getNotifications: () => request('GET', '/notifications'),
  registerFCMToken: (fcmToken, deviceType) => request('POST', '/notifications/device-token', { fcmToken, deviceType }),

  // ── Bugs ───────────────────────────────────────────────────────────────────
  reportBug: (body) => request('POST', '/bugs', body),
};
