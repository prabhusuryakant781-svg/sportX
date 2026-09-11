/**
 * SportX Core Backend Data Models & Types (Person 1)
 */

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserFitnessProfile {
  fitnessLevel: FitnessLevel;
  goals: string[];
  experience: string;
  preferences: Record<string, unknown>;
  availableWorkoutTime: number; // in minutes
  selectedSports: string[];
}

export interface UserDoc extends UserFitnessProfile {
  userId: string;
  name: string;
  email: string;
  profileImage?: string;
  age?: number;
  height?: number; // cm
  weight?: number; // kg
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null; // ISO Date string 'YYYY-MM-DD'
  totalWorkouts: number;
  totalMinutes: number;
  totalCalories: number;
  collegeName?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SportDoc {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseDoc {
  id: string;
  name: string;
  category: string;
  difficulty: FitnessLevel;
  targetMuscles: string[];
  equipment: string;
  instructions: string[];
  commonErrors: string[];
  formRules: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExerciseItem {
  exerciseId: string;
  sets: number;
  reps: number;
  duration?: number; // seconds
  restSeconds: number;
  order: number;
}

export interface WorkoutPlanDoc {
  id: string;
  name: string;
  description: string;
  goal: string;
  difficulty: FitnessLevel;
  duration: number; // total estimated minutes
  exercises: WorkoutExerciseItem[];
  createdBy: string;
  assignedUserId?: string; // If personalized/assigned to specific user
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = 'started' | 'paused' | 'resumed' | 'completed' | 'cancelled';

export interface WorkoutSessionDoc {
  id: string;
  userId: string;
  workoutPlanId?: string;
  exerciseId?: string;
  status: SessionStatus;
  startTime: string;
  pauseTime?: string | null;
  resumeTime?: string | null;
  completionTime?: string | null;
  duration: number; // elapsed seconds
  totalExercises: number;
  completedExercises: number;
  resultSummary?: {
    totalReps: number;
    averageFormScore: number;
    caloriesBurned: number;
    xpEarned: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogDoc {
  id: string;
  userId: string;
  sessionId: string;
  exerciseId: string;
  reps: number;
  duration: number; // seconds
  formScore: number; // 0 - 100
  errors: string[]; // e.g. ['knees_inward', 'shallow_depth']
  calories: number;
  timestamp: string;
}

export type BadgeRequirementType = 'workouts' | 'streak' | 'form_accuracy' | 'reps' | 'xp';

export interface BadgeDoc {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirementType: BadgeRequirementType;
  requirementValue: number;
  xpReward: number;
  category: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserBadgeDoc {
  id: string;
  userId: string;
  badgeId: string;
  unlockedAt: string;
  badgeDetails?: BadgeDoc;
}

export interface XPTransactionDoc {
  id: string;
  userId: string;
  sessionId?: string;
  amount: number;
  reason: 'workout_completed' | 'exercise_completed' | 'goal_milestone' | 'daily_consistency' | 'badge_reward';
  createdAt: string;
}

export interface ProgressSummaryDoc {
  userId: string;
  totalReps: number;
  totalCalories: number;
  totalWorkouts: number;
  totalMinutes: number;
  personalRecords: Record<string, number>;
  formScoreTrends: Array<{ date: string; score: number }>;
  weeklyProgress: {
    targetDays: number;
    completedDays: number;
    percentage: number;
  };
  monthlyProgress: {
    targetWorkouts: number;
    completedWorkouts: number;
    percentage: number;
  };
  goalPercentage: number;
  updatedAt: string;
}
