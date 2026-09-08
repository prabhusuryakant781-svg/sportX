// SportX Frontend API Client
// Connects to Backend FastAPI endpoints according to the API Contract

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = {
  // Auth
  signup: async (userData) => {},
  login: async (credentials) => {},

  // Profile & Preferences
  getProfile: async () => {},
  updateProfile: async (profileData) => {},

  // Workouts
  getWorkouts: async (params) => {},
  startWorkout: async (workoutId) => {},
  completeWorkout: async (sessionPayload) => {},

  // Progress & Gamification
  getProgress: async () => {},
  getLeaderboard: async (scope) => {},

  // Challenges
  getChallenges: async () => {},
  joinChallenge: async (challengeId) => {}
};
