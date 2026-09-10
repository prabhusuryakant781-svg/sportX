import { useState, useRef, useCallback } from 'react';
import type { LobbyPlayer, LobbySettings, MatchState } from '../types';

/**
 * Custom React Hook for Real-Time Competitive Lobby & Live Duel Mode
 * Syncs match countdown, telemetry, player ready state, and live leaderboards.
 */
export function useLobbySocket(initialRoomCode: string | null = null, currentUser?: { id: string; name: string } | null) {
  const [roomCode, setRoomCode] = useState<string | null>(initialRoomCode);
  const [matchState, setMatchState] = useState<MatchState>('LOBBY');
  const [countdown, setCountdown] = useState(3);
  const [lobbySettings, setLobbySettings] = useState<LobbySettings>({
    exerciseId: 'squat',
    durationSeconds: 60,
    targetReps: 25,
    mode: '60s Blitz',
  });

  const [players, setPlayers] = useState<LobbyPlayer[]>([
    {
      userId: currentUser?.id || 'demo_student_01',
      username: currentUser?.name || 'You',
      avatar: '🏋️‍♂️',
      college: 'Your College',
      isReady: true,
      isHost: true,
      currentReps: 0,
      formScore: 100,
      currentStreak: 0,
      isFinished: false,
    },
    {
      userId: 'u4',
      username: 'Rohan Verma',
      avatar: '⚡',
      college: 'BITS Pilani',
      isReady: true,
      isHost: false,
      currentReps: 0,
      formScore: 92,
      currentStreak: 0,
      isFinished: false,
    },
    {
      userId: 'u5',
      username: 'Anika Singh',
      avatar: '🔥',
      college: 'DTU Delhi',
      isReady: true,
      isHost: false,
      currentReps: 0,
      formScore: 96,
      currentStreak: 0,
      isFinished: false,
    },
  ]);

  const matchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const opponentSimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createRoom = (settings?: Partial<LobbySettings>): string => {
    const code = generateRoomCode();
    setRoomCode(code);
    if (settings) setLobbySettings(s => ({ ...s, ...settings }));
    setMatchState('LOBBY');
    return code;
  };

  const joinRoom = (code: string) => {
    setRoomCode(code.toUpperCase().trim());
    setMatchState('LOBBY');
  };

  const toggleReady = () => {
    setPlayers(prev => prev.map(p => (p.isHost ? { ...p, isReady: !p.isReady } : p)));
  };

  const startMatch = () => {
    setMatchState('COUNTDOWN');
    setCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setMatchState('LIVE');
        _startLiveOpponentSimulation();
      }
    }, 1000);
  };

  const _startLiveOpponentSimulation = () => {
    opponentSimRef.current = setInterval(() => {
      setPlayers(prev =>
        prev
          .map(p => {
            if (p.isHost || p.isFinished) return p;
            const repAdd = Math.random() > 0.4 ? 1 : 0;
            const newReps = p.currentReps + repAdd;
            const isDone = newReps >= lobbySettings.targetReps;
            return {
              ...p,
              currentReps: newReps,
              formScore: Math.max(75, Math.min(100, p.formScore + (Math.random() > 0.5 ? 1 : -1))),
              isFinished: isDone,
            };
          })
          .sort((a, b) => b.currentReps * (b.formScore / 100) - a.currentReps * (a.formScore / 100))
      );
    }, 1600);
  };

  const updateLocalTelemetry = useCallback(
    (telemetry: { currentReps: number; formScore: number; currentStreak?: number }) => {
      setPlayers(prev => {
        const updated = prev.map(p => {
          if (p.isHost) {
            return {
              ...p,
              currentReps: telemetry.currentReps,
              formScore: telemetry.formScore,
              currentStreak: telemetry.currentStreak || 0,
              isFinished: telemetry.currentReps >= lobbySettings.targetReps,
            };
          }
          return p;
        });
        return updated.sort((a, b) => b.currentReps * (b.formScore / 100) - a.currentReps * (a.formScore / 100));
      });
    },
    [lobbySettings.targetReps]
  );

  const finishMatch = useCallback(() => {
    if (opponentSimRef.current) clearInterval(opponentSimRef.current);
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    setMatchState('PODIUM');
  }, []);

  return {
    roomCode,
    matchState,
    countdown,
    lobbySettings,
    players,
    createRoom,
    joinRoom,
    toggleReady,
    startMatch,
    updateLocalTelemetry,
    finishMatch,
    setLobbySettings,
  };
}
