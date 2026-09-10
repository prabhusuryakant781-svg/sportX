/**
 * SportX Demo Data Store
 * In-memory database for local demo & testing.
 * No Firebase credentials required.
 */

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string; // plaintext for demo only
  collegeName: string;
  department: string;
  fitnessLevel: string;
  fitnessGoal: string;
  availableTimeMinutes: number;
  selectedSports: string[];
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
  createdAt: string;
}

export interface DemoSession {
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

export interface DemoBugReport {
  id: string;
  userId: string;
  category: string;
  exerciseId: string;
  description: string;
  createdAt: string;
}

// ── Seed Users ──────────────────────────────────────────────────────────────
export const users: Map<string, DemoUser> = new Map([
  [
    'demo_student_01',
    {
      id: 'demo_student_01',
      name: 'Aarav Sharma',
      email: 'aarav@campus.edu',
      password: 'demo123',
      collegeName: 'Campus University',
      department: 'Computer Science',
      fitnessLevel: 'beginner',
      fitnessGoal: 'fitness',
      availableTimeMinutes: 20,
      selectedSports: ['badminton', 'football'],
      totalXp: 450,
      currentStreak: 4,
      longestStreak: 6,
      lastWorkoutDate: new Date().toISOString().split('T')[0],
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ],
]);

// ── Tokens map (userId -> token) ─────────────────────────────────────────────
export const tokens: Map<string, string> = new Map();

// ── Sessions ─────────────────────────────────────────────────────────────────
export const sessions: DemoSession[] = [
  {
    id: 'sess_001',
    userId: 'demo_student_01',
    exerciseId: 'squat',
    totalReps: 24,
    averageFormScore: 92,
    durationSeconds: 180,
    caloriesBurned: 25,
    xpAwarded: 390,
    completedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'sess_002',
    userId: 'demo_student_01',
    exerciseId: 'pushup',
    totalReps: 15,
    averageFormScore: 84,
    durationSeconds: 120,
    caloriesBurned: 18,
    xpAwarded: 300,
    completedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const lobbies: Map<string, any> = new Map();

// ── Vision Results (Phase 3) ──────────────────────────────────────────────────
export interface DemoVisionResult {
  id: string;
  userId: string;
  sessionId: string;
  exerciseId: string;
  reps: number;
  formScore: number;
  confidence: number;
  errors: { code: string; severity: 'low' | 'medium' | 'high'; description?: string }[];
  timestamp: string;
  validatedAt: string;
}

export const demoVisionResults: DemoVisionResult[] = [
  {
    id: 'vis_001',
    userId: 'demo_student_01',
    sessionId: 'sess_001',
    exerciseId: 'squat',
    reps: 24,
    formScore: 92,
    confidence: 0.94,
    errors: [],
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    validatedAt: new Date(Date.now() - 86400000).toISOString(),
  }
];

// ── Bug Reports ───────────────────────────────────────────────────────────────
export const bugReports: DemoBugReport[] = [];

// ── Workout Plans (Phase 4) ───────────────────────────────────────────────────
export const demoWorkoutPlans: any[] = [];

// ── Token Helpers ─────────────────────────────────────────────────────────────
export function generateToken(userId: string): string {
  const token = `demo_token_${userId}_${Date.now()}`;
  tokens.set(token, userId);
  return token;
}

export function getUserIdFromToken(token: string): string | undefined {
  // Accept both demo tokens and the special "Bearer demo" pattern
  if (token === 'demo') return 'demo_student_01';
  return tokens.get(token);
}

export function nextId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}
