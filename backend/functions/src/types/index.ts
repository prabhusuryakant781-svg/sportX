/**
 * SportX TypeScript Domain Types & Interfaces
 * Production-ready Firestore Models & Payloads
 */
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export type UserRole = 'user' | 'coach' | 'admin';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type SessionStatus = 'in-progress' | 'paused' | 'completed' | 'abandoned';

// ── 1. User Model (users/{userId}) ───────────────────────────────────────────
export interface UserPreferences {
  workoutDays: string[];
  reminderTime?: string;
  soundEnabled: boolean;
  hapticFeedback: boolean;
  theme?: 'dark' | 'light' | 'system';
}

export interface UserDoc {
  userId: string;
  name: string;
  email: string;
  profileImage: string;
  age: number | null;
  height: number | null; // in cm
  weight: number | null; // in kg
  fitnessLevel: FitnessLevel;
  goals: string[];
  selectedSports: string[];
  experience: string;
  preferences: UserPreferences;
  availableWorkoutTime: number; // in minutes (default 30)
  availableEquipment: string[];
  workoutDaysPerWeek: number;
  targetCalories: number;
  notificationsEnabled: boolean;
  fcmTokens: string[];
  role: UserRole;
  
  // Stats & Progress (Server-side managed)
  totalWorkouts: number;
  totalMinutes: number;
  totalCalories: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null; // YYYY-MM-DD
  xp: number;
  XP?: number; // Alias for XP
  level: number;
  badges: string[];

  // College / Social info
  collegeName?: string;
  department?: string;

  createdAt: string | Timestamp | FieldValue;
  updatedAt: string | Timestamp | FieldValue;
}

// ── 2. Sports Model (sports/{sportId}) ───────────────────────────────────────
export interface SportDoc {
  sportId: string;
  name: string;
  category: string; // 'Racquet', 'Team Sport', 'Athletics', etc.
  iconUrl: string;
  description: string;
  popular: boolean;
  difficultyLevels: FitnessLevel[];
  exercisesCount: number;
  caloriePerHour?: number;
  isActive: boolean;
  createdAt: string | Timestamp | FieldValue;
}

// ── 3. Exercise Model (exercises/{exerciseId}) ───────────────────────────────
export interface ExerciseFormRules {
  keyAngles?: Record<string, { min?: number; max?: number; optimal?: number }>;
  postureRules?: string[];
  repConditions?: {
    inflectionPoint?: string;
    thresholdAngle?: number;
    completionAngle?: number;
  };
  cadenceSecondsMin?: number;
  minAngle?: number;
  maxAngle?: number;
  minKneeAngle?: number;
  maxKneeAngle?: number;
  minElbowAngle?: number;
  maxElbowAngle?: number;
}

export interface ExerciseDoc {
  exerciseId: string;
  name: string;
  sportId: string;
  targetMuscles: string[];
  secondaryMuscles: string[];
  equipmentNeeded: string[];
  difficulty: FitnessLevel;
  instructions: string[];
  commonErrors?: string[];
  description?: string;
  formRules: ExerciseFormRules;
  calorieFactor: number; // multiplier per rep/minute
  baseRepXP: number;     // base XP earned per valid rep
  aiSupported: boolean;
  category?: string;
  videoUrl: string;
  animationUrl: string;
  thumbnail: string;
  isActive: boolean;
  createdAt: string | Timestamp | FieldValue;
  updatedAt?: string | Timestamp | FieldValue;
}

// ── 4. Workout Plan Model (workouts/{workoutId}) ─────────────────────────────
export interface WorkoutExerciseItem {
  exerciseId: string;
  name?: string;
  targetReps?: number;
  targetSets?: number;
  targetHoldSeconds?: number;
  restInterval?: number; // seconds
  order: number;
  aiSupported?: boolean;
}

export interface WorkoutPlanDoc {
  workoutId: string;
  title: string;
  description: string;
  creatorId: string; // 'system' or userId
  sport: string;
  difficulty: FitnessLevel;
  targetGoal: string; // 'fitness', 'strength', 'endurance', etc.
  estimatedDuration: number; // in minutes
  estimatedCalories: number;
  exercises: WorkoutExerciseItem[];
  tags: string[];
  isCustom: boolean;
  isPublic: boolean;
  likesCount: number;
  createdAt: string | Timestamp | FieldValue;
  updatedAt?: string | Timestamp | FieldValue;
}

// ── 5. Workout Session Model (workoutSessions/{sessionId}) ───────────────────
export interface ExerciseSetLog {
  setNumber: number;
  reps: number;
  holdSeconds?: number;
  formAccuracy: number; // 0-100
  feedbackMessages: string[];
}

export interface ExerciseSessionLog {
  exerciseId: string;
  exerciseName?: string;
  sets: ExerciseSetLog[];
  totalReps: number;
  averageFormScore: number;
}

export interface WorkoutSessionDoc {
  sessionId: string;
  userId: string;
  workoutId: string;
  sportId: string;
  startTime: string | Timestamp | FieldValue;
  pauseTimes?: string[];
  resumeTimes?: string[];
  completionTime?: string | Timestamp | FieldValue | null;
  endTime: string | Timestamp | FieldValue | null;
  durationMinutes: number;
  durationSeconds?: number;
  totalReps: number;
  formAccuracyAverage: number; // 0-100
  caloriesBurned: number;
  heartRateAverage: number | null;
  exerciseLogs: ExerciseSessionLog[];
  sessionResults?: any;
  xpEarned: number;
  status: SessionStatus;
  createdAt: string | Timestamp | FieldValue;
  processedByTrigger?: boolean;
}

// ── 6. Activity Logs (activityLogs/{logId}) ──────────────────────────────────
export interface ActivityLogDoc {
  logId: string;
  userId: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  reps: number;
  durationSeconds: number;
  formScore: number;
  detectedErrors: string[];
  calories: number;
  timestamp: string | Timestamp | FieldValue;
}

// ── 7. Streak Model (streaks/{userId}) ───────────────────────────────────────
export interface StreakDayRecord {
  date: string; // YYYY-MM-DD
  sessionCount: number;
  xpEarned: number;
}

export interface StreakDoc {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
  history?: StreakDayRecord[];
  updatedAt: string | Timestamp | FieldValue;
}

// ── 8. XP Transaction Model (xpTransactions/{txId}) ─────────────────────────
export type XPTransactionReason =
  | 'workout_completion'
  | 'exercise_completion'
  | 'streak_milestone'
  | 'badge_unlock'
  | 'challenge_win'
  | 'admin_adjustment';

export interface XPTransactionDoc {
  txId: string;
  userId: string;
  amount: number;
  reason: XPTransactionReason;
  relatedSessionId?: string;
  relatedBadgeId?: string;
  balanceAfter: number;
  createdAt: string | Timestamp | FieldValue;
}

// ── 9. Badges & Milestones (badges/{badgeId} & userBadges/{id}) ─────────────
export interface BadgeDoc {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'workout' | 'streak' | 'xp' | 'form' | 'special';
  xpThreshold?: number;
  streakRequired?: number;
  workoutsRequired?: number;
  repsRequired?: number;
  formAccuracyRequired?: number;
  xpReward?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface UserBadgeDoc {
  id: string; // `${userId}_${badgeId}`
  userId: string;
  badgeId: string;
  badgeName: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt: string | Timestamp | FieldValue;
}

// ── 10. Device Tokens (deviceTokens/{tokenId}) ──────────────────────────────
export interface DeviceTokenDoc {
  token: string;
  userId: string;
  platform: 'ios' | 'android' | 'web';
  lastSeen: string | Timestamp | FieldValue;
}

// ── 11. Notifications (notifications/{notificationId}) ──────────────────────
export interface NotificationDoc {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  type: 'workout_reminder' | 'streak_reminder' | 'workout_completion' | 'badge_unlocked' | 'milestone';
  read: boolean;
  data?: Record<string, any>;
  createdAt: string | Timestamp | FieldValue;
}

// ── 12. Progress Tracking (progress/{userId}) ───────────────────────────────
export interface ProgressDoc {
  userId: string;
  weeklyProgress: {
    targetDays: number;
    daysCompleted: number;
    completionPercentage: number;
  };
  monthlyProgress: {
    targetWorkouts: number;
    workoutsCompleted: number;
    completionPercentage: number;
  };
  goalCompletionPercentage: number;
  totalReps: number;
  workoutFrequencyPerWeek: number;
  totalWorkoutDurationMinutes: number;
  totalCalories: number;
  personalRecords: Record<string, number>; // e.g. { 'squat_max_reps': 45 }
  formScoreTrends: Array<{ date: string; score: number }>;
  updatedAt: string | Timestamp | FieldValue;
}

// ── 13. Analytics Models ─────────────────────────────────────────────────────
export interface MuscleGroupBreakdown {
  [muscleGroup: string]: number; // count of reps or sessions targeting this muscle
}

export interface UserStatsDoc {
  userId: string;
  workoutsCompleted: number;
  totalDuration: number; // minutes
  totalCalories: number;
  totalReps: number;
  averageFormAccuracy: number;
  muscleGroupBreakdown: MuscleGroupBreakdown;
  updatedAt: string | Timestamp | FieldValue;
}

export interface PeriodAnalyticsDoc {
  periodId: string; // 'YYYY-MM-DD' or 'YYYY-Wxx' or 'YYYY-MM'
  userId: string;
  workoutsCompleted: number;
  totalDuration: number;
  totalCalories: number;
  totalReps: number;
  averageFormAccuracy: number;
  activeDays: number;
  updatedAt: string | Timestamp | FieldValue;
}

// ── 14. Leaderboard Models ───────────────────────────────────────────────────
export interface LeaderboardEntryDoc {
  userId: string;
  name: string;
  profileImage?: string;
  collegeName?: string;
  department?: string;
  totalXp: number;
  currentStreak: number;
  level: number;
  rank?: number;
  lastUpdated: string | Timestamp | FieldValue;
}
