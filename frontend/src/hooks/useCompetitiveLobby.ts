/**
 * SportX Custom Hook: useCompetitiveLobby
 * Isolated state machine for competitive matchmaking, waiting lobby,
 * live player joining/leaving detection, sound trigger, and synchronized countdown.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { competitiveApi } from '../services/competitiveApi';
import { CompetitiveMatchDoc, QueueTicketDoc } from '../types/competitive';
import { PublicCompetitivePlayer } from '../components/CompetitivePlayerCard';

export type CompetitiveLobbyStatus =
  | 'waiting'
  | 'match_found'
  | 'countdown'
  | 'launching'
  | 'cancelled';

interface UseCompetitiveLobbyOptions {
  ticket: QueueTicketDoc | null;
  initialMatch?: CompetitiveMatchDoc | null;
  targetPlayers?: number;
  countdownDuration?: number; // 3 to 5 seconds
  onMatchReady?: (match: CompetitiveMatchDoc) => void;
  onCancel?: () => void;
}

// Sound effect utility (Attempts audio file + fallback Web Audio chime)
function playMatchFoundSound() {
  // 1. Web Audio API synthesized arpeggio (100% reliable across all browsers)
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 triumphant chime
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.3);
      });
    }
  } catch (_) {}

  // 2. Audio asset file playback attempt
  try {
    const audio = new Audio('/src/assets/match-found.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch (_) {}
}

const DEV_BOT_POOL = [
  { name: 'DevBot_Arjun', rank: 'Bronze', rp: 120 },
  { name: 'DevBot_Priya', rank: 'Silver', rp: 210 },
  { name: 'DevBot_Rohan', rank: 'Gold', rp: 330 },
  { name: 'DevBot_Ananya', rank: 'Bronze', rp: 140 },
  { name: 'DevBot_Vikram', rank: 'Silver', rp: 225 },
  { name: 'DevBot_Neha', rank: 'Gold', rp: 310 },
  { name: 'DevBot_Kabir', rank: 'Platinum', rp: 410 },
  { name: 'DevBot_Siddharth', rank: 'Diamond', rp: 520 },
];

export function useCompetitiveLobby({
  ticket,
  initialMatch = null,
  targetPlayers = 8,
  countdownDuration = 4,
  onMatchReady,
  onCancel,
}: UseCompetitiveLobbyOptions) {
  const [match, setMatch] = useState<CompetitiveMatchDoc | null>(initialMatch);
  const [status, setStatus] = useState<CompetitiveLobbyStatus>('waiting');
  const [searchElapsedSeconds, setSearchElapsedSeconds] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(countdownDuration);

  const hasPlayedSoundRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const matchRef = useRef(match);
  matchRef.current = match;

  const onMatchReadyRef = useRef(onMatchReady);
  onMatchReadyRef.current = onMatchReady;

  // Convert match players to safe public player objects (never expose email/uid)
  const getPublicPlayers = useCallback((): PublicCompetitivePlayer[] => {
    if (!match || !match.players || match.players.length === 0) {
      if (ticket) {
        return [
          {
            displayName: ticket.displayName || 'Athlete',
            avatarUrl: ticket.avatarUrl,
            rankTier: ticket.rankTier,
            rankPoints: ticket.rankPoints,
            level: Math.max(1, Math.floor((ticket.rankPoints || 100) / 100)),
            ready: true,
            isSimulated: false,
            connectionStatus: 'connected',
          },
        ];
      }
      return [];
    }

    return match.players.map((p) => ({
      displayName: p.displayName || 'Athlete',
      avatarUrl: p.avatarUrl,
      rankTier: p.rankTier,
      rankPoints: p.rankPoints,
      level: Math.max(1, Math.floor((p.rankPoints || 100) / 100)),
      ready: p.ready,
      isSimulated: !!p.isSimulated,
      connectionStatus: 'connected',
    }));
  }, [match, ticket]);

  const publicPlayers = getPublicPlayers();
  const playersJoinedCount = publicPlayers.length;
  const isLobbyFull = playersJoinedCount >= targetPlayers;

  // ── 1. Search Elapsed Timer ────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'launching' || status === 'cancelled') return;

    const timer = setInterval(() => {
      setSearchElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // ── 2. Matchmaking Queue & Match Room Polling ──────────────────────────────
  useEffect(() => {
    if (status === 'launching' || status === 'cancelled') return;

    const pollLobby = async () => {
      try {
        // If we already have a match ID, poll the match room
        if (match?.matchId) {
          const res = await competitiveApi.getMatch(match.matchId);
          if (res.match) {
            setMatch(res.match);
          }
        } else if (ticket?.ticketId) {
          // Poll ticket queue status
          const res = await competitiveApi.getQueueStatus(ticket.ticketId);
          if (res.ticket.status === 'MATCHED' && res.match) {
            setMatch(res.match);
          }
        }
      } catch (err) {
        console.warn('[useCompetitiveLobby] Poll warning:', err);
      }
    };

    pollIntervalRef.current = setInterval(pollLobby, 1500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [match?.matchId, ticket?.ticketId, status]);

  // ── 3. Player Count Detection, Sound Trigger & Countdown ──────────────────
  useEffect(() => {
    if (isLobbyFull && match) {
      if (status === 'launching' || status === 'cancelled') return;

      // Play sound ONCE only
      if (!hasPlayedSoundRef.current) {
        hasPlayedSoundRef.current = true;
        playMatchFoundSound();
      }

      if (status === 'waiting') {
        setStatus('match_found');
      }

      if (!countdownIntervalRef.current) {
        setCountdownSeconds(countdownDuration);
        let current = countdownDuration;

        countdownIntervalRef.current = setInterval(() => {
          current -= 1;
          setCountdownSeconds(current);

          if (current <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            setStatus('launching');
            if (onMatchReadyRef.current && matchRef.current) {
              onMatchReadyRef.current(matchRef.current);
            }
          }
        }, 1000);
      }
    } else {
      // If any player leaves before countdown finishes: stop countdown and return to waiting mode!
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      hasPlayedSoundRef.current = false;
      setCountdownSeconds(countdownDuration);
      if (status !== 'cancelled' && status !== 'launching' && status !== 'waiting') {
        setStatus('waiting');
      }
    }
  }, [isLobbyFull, !!match, countdownDuration, status]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const cancelSearch = useCallback(async () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setStatus('cancelled');

    if (ticket?.ticketId) {
      try {
        await competitiveApi.cancelQueue(ticket.ticketId);
      } catch (err) {
        console.warn('Failed to cancel queue ticket:', err);
      }
    }

    if (onCancel) {
      onCancel();
    }
  }, [ticket?.ticketId, onCancel]);

  // Fill all target slots with opponents
  const simulateDevOpponent = useCallback(async () => {
    if (!ticket?.ticketId) return;
    try {
      const res = await competitiveApi.simulateDevOpponent(ticket.ticketId);
      if (res.match) {
        if (targetPlayers > 2 && res.match.players.length < targetPlayers) {
          const now = new Date().toISOString();
          const needed = targetPlayers - res.match.players.length;
          const extraBots = DEV_BOT_POOL.slice(0, needed).map((bot, idx) => ({
            userId: `sim_bot_${Date.now()}_${idx}`,
            displayName: `⚡ ${bot.name}`,
            rankTier: bot.rank as any,
            rankPoints: bot.rp,
            isSimulated: true,
            ready: true,
            telemetry: { reps: 0, formScore: 85, verifiedScore: 0, lastUpdated: now },
            completed: false,
          }));
          const fullMatch: CompetitiveMatchDoc = {
            ...res.match,
            targetPlayers,
            players: [...res.match.players, ...extraBots],
          };
          setMatch(fullMatch);
          return;
        }
        setMatch(res.match);
      }
    } catch (err) {
      console.warn('Dev simulate opponent failed:', err);
    }
  }, [ticket?.ticketId, targetPlayers]);

  // Add a single simulated opponent (+1 slot)
  const simulateAddOpponent = useCallback(async () => {
    if (!ticket?.ticketId) return;
    if (!match) {
      try {
        const res = await competitiveApi.simulateDevOpponent(ticket.ticketId);
        if (res.match) {
          setMatch({ ...res.match, targetPlayers });
        }
      } catch (err) {
        console.warn('Dev simulate opponent failed:', err);
      }
      return;
    }

    if (match.players.length < targetPlayers) {
      const now = new Date().toISOString();
      const botIdx = match.players.length - 1;
      const bot = DEV_BOT_POOL[botIdx % DEV_BOT_POOL.length];
      const newBot = {
        userId: `sim_bot_${Date.now()}_${botIdx}`,
        displayName: `⚡ ${bot.name}`,
        rankTier: bot.rank as any,
        rankPoints: bot.rp,
        isSimulated: true,
        ready: true,
        telemetry: { reps: 0, formScore: 85, verifiedScore: 0, lastUpdated: now },
        completed: false,
      };
      setMatch({
        ...match,
        targetPlayers,
        players: [...match.players, newBot],
      });
    }
  }, [ticket?.ticketId, match, targetPlayers]);

  // Opponent leaves (steps down by 1 player to test abort & auto-recovery)
  const simulateDevOpponentLeave = useCallback(() => {
    if (match) {
      if (match.players.length > 2) {
        setMatch({
          ...match,
          players: match.players.slice(0, match.players.length - 1),
        });
      } else {
        setMatch(null);
      }
    }
  }, [match]);

  return {
    status,
    players: publicPlayers,
    targetPlayers,
    playersJoinedCount,
    isLobbyFull,
    countdownSeconds,
    searchElapsedSeconds,
    match,
    cancelSearch,
    simulateDevOpponent,
    simulateAddOpponent,
    simulateDevOpponentLeave,
  };
}

export default useCompetitiveLobby;

