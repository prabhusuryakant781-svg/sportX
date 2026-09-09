/**
 * SportX — Lobby Module (Phase 5 Foundation)
 * Defines multiplayer workout lobby contracts and handlers.
 */

export interface LobbyParticipant {
  userId: string;
  displayName: string;
  joinedAt: string;
  currentReps: number;
  formScore: number;
  isReady: boolean;
}

export interface LobbyRoom {
  id: string;
  roomCode: string;
  hostId: string;
  exerciseId: string;
  targetReps: number;
  status: 'waiting' | 'in_progress' | 'completed';
  participants: Record<string, LobbyParticipant>;
  createdAt: string;
}
