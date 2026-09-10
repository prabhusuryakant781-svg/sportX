/**
 * SportX Challenges — Data Contracts & Types (Phase 5)
 * Defines peer challenge entities, participant progress, and state transitions.
 */

export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'expired' | 'declined' | 'cancelled';
export type ParticipantStatus = 'invited' | 'accepted' | 'declined' | 'completed';

export interface ParticipantProgress {
  userId: string;
  userName: string;
  status: ParticipantStatus;
  currentProgress: number; // reps completed
  formScoreAvg?: number;
  completedAt?: string;
  xpAwarded?: number;
  lastActiveAt?: string;
}

export interface Challenge {
  id: string;
  creatorId: string;
  creatorName: string;
  exerciseId: string;
  targetReps: number;
  status: ChallengeStatus;
  participants: Record<string, ParticipantProgress>;
  startTime?: string;
  endTime?: string;
  winnerId?: string;
  rewardXp: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChallengePayload {
  exerciseId: string;
  targetReps: number;
  challengeeId?: string;
  challengeeName?: string;
  durationDays?: number;
  message?: string;
  rewardXp?: number;
}

export interface UpdateProgressPayload {
  addedReps: number;
  formScore?: number;
}

// In-memory demo store for challenges (offline / test environments)
export const challengesStore: Map<string, Challenge> = new Map([
  [
    'ch_demo_001',
    {
      id: 'ch_demo_001',
      creatorId: 'demo_student_01',
      creatorName: 'Aarav Sharma',
      exerciseId: 'pushup',
      targetReps: 50,
      status: 'pending',
      rewardXp: 200,
      message: 'I challenge you to 50 pushups!',
      participants: {
        demo_student_01: {
          userId: 'demo_student_01',
          userName: 'Aarav Sharma',
          status: 'accepted',
          currentProgress: 0,
          lastActiveAt: new Date().toISOString()
        },
        u4: {
          userId: 'u4',
          userName: 'Rohan Verma',
          status: 'invited',
          currentProgress: 0
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      endTime: new Date(Date.now() + 3 * 86400000).toISOString()
    }
  ]
]);
