// ── Shared TypeScript Interfaces for SportX ────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  avatarUrl?: string;
  collegeName: string;
  department: string;
  fitnessLevel?: 'beginner' | 'intermediate' | 'pro' | 'advanced' | string;
  fitnessGoal: string;
  availableTimeMinutes: number;
  selectedSports: string[];
  totalXp: number;
  xp?: number;
  level?: number;
  currentStreak: number;
  longestStreak: number;
  bestStreak?: number;
  rankPoints?: number;
  rankTier?: string;
  equippedTitle?: string;
  featuredBadges?: string[];
  lastWorkoutDate: string | null;
  lastActivityDate?: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  exerciseId: string;
  totalReps: number;
  averageFormScore: number;
  durationSeconds: number;
  caloriesBurned: number;
  xpAwarded: number;
  completedAt: string;
}

export interface Exercise {
  id?: string;
  exerciseId?: string;
  name: string;
  icon?: string;
  category?: string;
  description?: string;
  targetMuscles?: string[];
  difficulty?: string;
  aiSupported?: boolean;
  instructions?: string[];
}

export interface WorkoutPlan {
  id?: string;
  workoutId?: string;
  planId?: string;
  title: string;
  difficulty: string;
  estimatedDurationMinutes?: number;
  estimatedDuration?: number;
  exercises: WorkoutExercise[];
  recommendationReason?: string;
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  college: string;
  totalXp: number;
  currentStreak: number;
  rankPoints?: number;
  rankTier?: string;
  equippedTitle?: string;
  featuredBadge?: string;
  isCurrentUser?: boolean;
}

export interface LobbyPlayer {
  userId: string;
  username: string;
  avatar: string;
  college: string;
  isReady: boolean;
  isHost: boolean;
  currentReps: number;
  formScore: number;
  currentStreak: number;
  isFinished: boolean;
}

export interface LobbySettings {
  exerciseId: string;
  durationSeconds: number;
  targetReps: number;
  mode: string;
}

export type MatchState = 'LOBBY' | 'COUNTDOWN' | 'LIVE' | 'PODIUM';

export interface ManualActivity {
  id: string;
  userId: string;
  sportId: string;
  sportName: string;
  durationMinutes: number;
  notes: string;
  xpAwarded: number;
  loggedAt: string;
}

export interface Sport {
  id: string;
  name: string;
  icon: string;
  category: string;
}

export interface BugReport {
  category: string;
  exerciseId?: string;
  description: string;
  deviceInfo?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (userData: Partial<User> & { password: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<User>;
}

// ── Step 7: Goals ────────────────────────────────────────────────────────────
export type GoalCategory = 'fitness' | 'consistency' | 'strength' | 'sport' | 'competitive' | 'form';
export type GoalType =
  | 'workout_count'
  | 'streak_days'
  | 'total_reps'
  | 'exercise_reps'
  | 'average_form'
  | 'sport_sessions'
  | 'competitive_wins'
  | 'reach_rank'
  | 'gain_rp'
  | 'high_form_sessions';

export interface Goal {
  goalId: string;
  userId: string;
  type: GoalType;
  category: GoalCategory;
  title: string;
  description?: string;
  target: number;
  current: number;
  unit: string;
  sportId?: string;
  exerciseId?: string;
  targetRank?: string;
  startDate: string;
  targetDate: string;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  progress: number; // 0-100
  createdAt: string;
  completedAt?: string | null;
}

export interface GoalTemplate {
  id: string;
  category: GoalCategory;
  title: string;
  type: GoalType;
  target: number;
  unit: string;
  daysDuration: number;
  exerciseId?: string;
  sportId?: string;
  description: string;
}

// ── Step 7: Performance Score ────────────────────────────────────────────────
export interface PerformanceBreakdown {
  consistency: number;  // 20%
  form: number;         // 25%
  workout: number;      // 25%
  competition: number;  // 20%
  improvement: number;  // 10%
}

export interface PerformanceScore {
  userId: string;
  overallScore: number;
  breakdown: PerformanceBreakdown;
  provisional: boolean;
  statusMessage?: string;
  trend?: Array<{ date: string; score: number }>;
  lastCalculatedAt: string;
}

// ── Step 7: Friends & Social ─────────────────────────────────────────────────
export interface PublicAthlete {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
  collegeName?: string;
  sports: string[];
  rankTier: string;
  rankPoints: number;
  level: number;
  isFriend?: boolean;
  hasPendingRequest?: boolean;
}

export interface FriendRequest {
  requestId: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderAvatar?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Friendship {
  friendshipId: string;
  friendId: string;
  friendName: string;
  friendAvatar?: string;
  friendRankTier?: string;
  friendPoints?: number;
  createdAt: string;
}

// ── Step 7: Friend Challenges ────────────────────────────────────────────────
export interface FriendChallenge {
  challengeId: string;
  challengerId: string;
  opponentId: string;
  challengerName: string;
  opponentName: string;
  exerciseId: string;
  challengeType: 'most_reps' | 'target_reps' | 'best_form';
  targetReps: number;
  durationSeconds: number;
  status: 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  winnerId?: string | null;
  isDraw?: boolean;
  challengerReps?: number;
  opponentReps?: number;
  challengerForm?: number;
  opponentForm?: number;
  createdAt: string;
  completedAt?: string | null;
}

// ── Step 7: Challenge History ────────────────────────────────────────────────
export interface ChallengeHistoryEntry {
  matchId: string;
  type: 'ranked' | 'friend';
  exerciseId: string;
  opponentId: string;
  opponentName: string;
  opponentAvatar?: string;
  outcome: 'WIN' | 'LOSS' | 'DRAW';
  myScore: number;
  opponentScore: number;
  myFormScore: number;
  xpEarned: number;
  rpChange: number;
  completedAt: string;
  status: string;
}
