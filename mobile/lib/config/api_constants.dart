/**
 * SportX Mobile — API & Network Constants
 * Connects to the unified backend on Firebase Cloud Functions / Vercel Gateway.
 */
class ApiConstants {
  // Production Cloud Functions / Vercel API Base URL
  static const String baseUrl = String.fromEnvironment(
    'SPORTX_API_URL',
    defaultValue: 'https://sportx-ab5f.web.app/api/v1',
  );

  // Local development fallback
  static const String localBaseUrl = 'http://10.0.2.2:3001/api/v1'; // Android emulator localhost

  // Endpoints
  static const String authSignup = '/auth/signup';
  static const String authLogin = '/auth/login';
  static const String userProfile = '/users/profile';
  static const String sports = '/sports';
  static const String exercises = '/exercises';
  static const String workouts = '/workouts';
  static const String workoutsToday = '/workouts/today';
  static const String sessions = '/sessions';
  static const String sessionsStart = '/sessions/start';
  static const String sessionsComplete = '/sessions'; // /sessions/{id}/complete
  static const String progress = '/progress';
  static const String aiAskCoach = '/ai/ask-coach';
  static const String aiSessionAnalysis = '/ai/session-analysis';
  static const String aiGenerateWorkout = '/ai/generate-workout';
  static const String aiProgress = '/ai/progress';
  static const String visionResults = '/vision/results';
  static const String visionFeedback = '/vision/feedback';
  static const String challenges = '/challenges';
  static const String lobbies = '/lobbies';
  static const String leaderboardGlobal = '/leaderboard/global';
  static const String leaderboardCollege = '/leaderboard/college';
  static const String notifications = '/notifications';
  static const String deviceToken = '/notifications/device-token';
}
