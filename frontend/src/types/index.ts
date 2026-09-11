// ── Shared TypeScript Interfaces for SportX ────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  collegeName: string;
  department: string;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  fitnessGoal: string;
  availableTimeMinutes: number;
  selectedSports: string[];
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
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
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  targetMuscles: string[];
  difficulty: string;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  difficulty: string;
  estimatedDurationMinutes: number;
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
