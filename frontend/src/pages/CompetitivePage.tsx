/**
 * SportX Competitive Arena & Global Matchmaking Page
 * Complete 6-Stage Reactive Flow:
 * Stage 1: Home (Rank tier, stats, challenge cards, sport selector, "Random Match" CTA)
 * Stage 2: Searching (Radar pulse animation, timer, cancel, dev instant-match)
 * Stage 3: Private Match Room (Head-to-head opponent, rules, scoring formula, Ready up)
 * Stage 4: Synchronized Countdown (3-2-1-GO!)
 * Stage 5: Live Challenge Arena (Live timer, side-by-side telemetry, verified score, rep logger)
 * Stage 6: Result Screen (Victory/Defeat/Draw celebration, XP & RP rewards, new tier)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { competitiveApi } from '../services/competitiveApi';
import {
  CompetitiveChallengeDoc,
  CompetitiveMatchDoc,
  CompetitiveRankDoc,
  CompetitiveRankTier,
  QueueTicketDoc,
} from '../types/competitive';

type FlowStage = 'HOME' | 'SEARCHING' | 'MATCH_ROOM' | 'COUNTDOWN' | 'CHALLENGE' | 'RESULT';

const RANK_COLORS: Record<CompetitiveRankTier, { bg: string; text: string; border: string; icon: string }> = {
  Bronze: { bg: 'bg-amber-950/40', text: 'text-amber-500', border: 'border-amber-600/40', icon: '🥉' },
  Silver: { bg: 'bg-slate-800/60', text: 'text-slate-300', border: 'border-slate-500/40', icon: '🥈' },
  Gold: { bg: 'bg-yellow-950/40', text: 'text-yellow-400', border: 'border-yellow-500/50', icon: '🥇' },
  Platinum: { bg: 'bg-cyan-950/40', text: 'text-cyan-400', border: 'border-cyan-500/50', icon: '💎' },
  Diamond: { bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-500/50', icon: '👑' },
};

const SPORT_ICONS: Record<string, string> = {
  all: '🎲',
  cricket: '🏏',
  football: '⚽',
  athletics: '🏃',
};

const ACCOUNT_NEED_DIAGNOSTICS: Record<string, { title: string; focus: string; rationale: string }> = {
  cricket: {
    title: 'Hand-Eye Catch Reflexes & Field Positioning',
    focus: 'High-speed ball tracking, reactive wrist cushion, and clean reception under match pressure.',
    rationale: 'Based on your enrolled Cricket specialization and rating, your account needs verified catch repeatability to advance to Gold tier.',
  },
  football: {
    title: 'Close-Quarter Agility & Ball Maneuvering',
    focus: 'Rapid multi-directional cutting, deceleration control, and precise ball touch rhythm.',
    rationale: 'Based on your enrolled Football specialization and rating, your account needs close-control agility cadence to climb the Platinum division.',
  },
  athletics: {
    title: 'Anaerobic Shuttle Endurance & Deceleration Power',
    focus: 'Maximum speed intervals, line touch transition, and cadence endurance.',
    rationale: 'Based on your enrolled Athletics specialization and rating, your account needs sharp deceleration efficiency to qualify for Diamond tier.',
  },
};

export default function CompetitivePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserId = user?.id || (user as any)?.uid || 'athlete_user';

  // User's enrolled sports from their account profile
  const rawAccountSports = user?.selectedSports && user.selectedSports.length > 0
    ? user.selectedSports.map((s) => s.toLowerCase().trim())
    : ['cricket'];

  // Normalize sports to standard challenge sport IDs
  const accountSports = Array.from(new Set(rawAccountSports.map((s) => {
    if (s.includes('crick')) return 'cricket';
    if (s.includes('foot') || s.includes('socc')) return 'football';
    if (s.includes('run') || s.includes('athle') || s.includes('track')) return 'athletics';
    return s;
  })));

  const primarySport = accountSports[0] || 'cricket';

  // State machine
  const [stage, setStage] = useState<FlowStage>('HOME');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [challenges, setChallenges] = useState<CompetitiveChallengeDoc[]>([]);
  const [userRank, setUserRank] = useState<CompetitiveRankDoc | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>(primarySport);
  const [activeTicket, setActiveTicket] = useState<QueueTicketDoc | null>(null);
  const [activeMatch, setActiveMatch] = useState<CompetitiveMatchDoc | null>(null);

  useEffect(() => {
    if (primarySport && (!selectedSport || selectedSport === 'all')) {
      setSelectedSport(primarySport);
    }
  }, [primarySport]);

  // Searching state
  const [searchSeconds, setSearchSeconds] = useState(0);

  // Countdown state
  const [countdownValue, setCountdownValue] = useState(3);

  // Live challenge state
  const [timeLeft, setTimeLeft] = useState(90);
  const [myReps, setMyReps] = useState(0);
  const [myQuality, setMyQuality] = useState(92);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Polling refs
  const searchPollInterval = useRef<NodeJS.Timeout | null>(null);
  const matchPollInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // ── Initial Load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [challengeRes, rankRes] = await Promise.all([
          competitiveApi.getChallenges().catch(() => ({ challenges: [] })),
          competitiveApi.getUserRank().catch(() => ({
            rank: {
              userId: currentUserId,
              sportId: 'global',
              rankTier: 'Bronze' as CompetitiveRankTier,
              rankPoints: 120,
              wins: 0,
              losses: 0,
              draws: 0,
              totalMatches: 0,
              highestRankTier: 'Bronze' as CompetitiveRankTier,
              highestRankPoints: 120,
              updatedAt: new Date().toISOString(),
            },
          })),
        ]);

        setChallenges(challengeRes.challenges);
        setUserRank(rankRes.rank);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize competitive arena');
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();

    return () => {
      clearAllTimers();
    };
  }, [user]);

  function clearAllTimers() {
    if (searchPollInterval.current) clearInterval(searchPollInterval.current);
    if (matchPollInterval.current) clearInterval(matchPollInterval.current);
    if (timerInterval.current) clearInterval(timerInterval.current);
  }

  // ── Stage 2: Searching & Matchmaking Polling ────────────────────────────────
  useEffect(() => {
    if (stage !== 'SEARCHING' || !activeTicket) return;

    setSearchSeconds(0);
    const searchClock = setInterval(() => {
      setSearchSeconds((s) => s + 1);
    }, 1000);

    // Poll ticket status every 2 seconds
    searchPollInterval.current = setInterval(async () => {
      try {
        const res = await competitiveApi.getQueueStatus(activeTicket.ticketId);
        if (res.ticket.status === 'MATCHED' && res.match) {
          clearInterval(searchPollInterval.current!);
          clearInterval(searchClock);
          setActiveMatch(res.match);
          setStage('MATCH_ROOM');
        }
      } catch (err) {
        console.warn('Queue poll failed:', err);
      }
    }, 2000);

    return () => {
      clearInterval(searchClock);
      if (searchPollInterval.current) clearInterval(searchPollInterval.current);
    };
  }, [stage, activeTicket]);

  // ── Match State Polling (in MATCH_ROOM or CHALLENGE) ─────────────────────────
  useEffect(() => {
    if ((stage !== 'MATCH_ROOM' && stage !== 'CHALLENGE') || !activeMatch) return;

    matchPollInterval.current = setInterval(async () => {
      try {
        const res = await competitiveApi.getMatch(activeMatch.matchId);
        setActiveMatch(res.match);

        // If in MATCH_ROOM and all players ready, advance to COUNTDOWN
        if (stage === 'MATCH_ROOM' && res.match.status === 'COUNTDOWN') {
          clearInterval(matchPollInterval.current!);
          startCountdown(res.match);
        }

        // If match finished remotely
        if (res.match.status === 'COMPLETED') {
          clearInterval(matchPollInterval.current!);
          setStage('RESULT');
        }
      } catch (err) {
        console.warn('Match poll failed:', err);
      }
    }, 2000);

    return () => {
      if (matchPollInterval.current) clearInterval(matchPollInterval.current);
    };
  }, [stage, activeMatch]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleStartRandomMatch = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await competitiveApi.joinMatchmaking({
        sportPreference: selectedSport === 'all' ? undefined : selectedSport,
      });

      setActiveTicket(res.ticket);

      if (res.match) {
        // Immediate match found!
        setActiveMatch(res.match);
        setStage('MATCH_ROOM');
      } else {
        // Placed in queue
        setStage('SEARCHING');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join matchmaking queue');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSearch = async () => {
    if (!activeTicket) {
      setStage('HOME');
      return;
    }
    try {
      await competitiveApi.cancelQueue(activeTicket.ticketId);
    } catch (err) {
      console.warn('Cancel queue failed:', err);
    }
    clearAllTimers();
    setActiveTicket(null);
    setStage('HOME');
  };

  const handleDevSimulateOpponent = async () => {
    if (!activeTicket) return;
    try {
      setError(null);
      const res = await competitiveApi.simulateDevOpponent(activeTicket.ticketId);
      setActiveMatch(res.match);
      setStage('MATCH_ROOM');
    } catch (err: any) {
      setError(err.message || 'Simulation error');
    }
  };

  const handleReadyUp = async () => {
    if (!activeMatch) return;
    try {
      const res = await competitiveApi.setMatchReady(activeMatch.matchId);
      setActiveMatch(res.match);

      // Check if both players ready
      const allReady = res.match.players.every((p) => p.ready);
      if (allReady) {
        startCountdown(res.match);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to signal ready');
    }
  };

  const startCountdown = (match: CompetitiveMatchDoc) => {
    setStage('COUNTDOWN');
    setCountdownValue(3);

    let currentCount = 3;
    const interval = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdownValue(currentCount);
      } else {
        clearInterval(interval);
        // Start challenge
        setStage('CHALLENGE');
        setTimeLeft(match.challenge.durationSeconds || 90);
        setMyReps(0);
        setMyQuality(92);
        startChallengeTimer(match);
      }
    }, 1000);
  };

  const startChallengeTimer = (match: CompetitiveMatchDoc) => {
    let secondsLeft = match.challenge.durationSeconds || 90;
    timerInterval.current = setInterval(() => {
      secondsLeft -= 1;
      setTimeLeft(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(timerInterval.current!);
        handleFinishMatch(match.matchId);
      }
    }, 1000);
  };

  const handleRecordRep = async () => {
    if (!activeMatch) return;
    const newReps = myReps + 1;
    setMyReps(newReps);

    try {
      const res = await competitiveApi.sendTelemetry(activeMatch.matchId, newReps, myQuality);
      setActiveMatch(res.match);
    } catch (err) {
      console.warn('Telemetry sync error:', err);
    }
  };

  const handleFinishMatch = async (matchId?: string) => {
    const id = matchId || activeMatch?.matchId;
    if (!id || isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (timerInterval.current) clearInterval(timerInterval.current);

      const res = await competitiveApi.finishMatch(id);
      setActiveMatch(res.match);
      setStage('RESULT');

      // Refresh rank
      const rankRes = await competitiveApi.getUserRank().catch(() => null);
      if (rankRes?.rank) setUserRank(rankRes.rank);
    } catch (err: any) {
      setError(err.message || 'Failed to finalize match');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToHome = () => {
    clearAllTimers();
    setActiveTicket(null);
    setActiveMatch(null);
    setMyReps(0);
    setStage('HOME');
  };

  // ── Derived Data Helpers ─────────────────────────────────────────────────────
  const myPlayer = activeMatch?.players.find((p) => p.userId === currentUserId) || activeMatch?.players[0];
  const opponentPlayer = activeMatch?.players.find((p) => p.userId !== currentUserId) || activeMatch?.players[1];

  const myScore = myPlayer ? Math.round(myReps * (myQuality / 100)) : 0;
  const oppScore = opponentPlayer ? opponentPlayer.telemetry.verifiedScore : 0;

  const currentRankTier = userRank?.rankTier || 'Bronze';
  const rankTheme = RANK_COLORS[currentRankTier];

  const accountTargetedChallenge = challenges.find((c) => c.sportId.toLowerCase() === selectedSport.toLowerCase())
    || challenges.find((c) => c.sportId.toLowerCase() === primarySport.toLowerCase())
    || challenges[0];

  return (
    <div className="min-h-screen bg-obsidian text-slate-100 pb-24">
      {/* ── Top Header Bar ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (stage === 'HOME' ? navigate('/dashboard') : handleResetToHome())}
            className="w-9 h-9 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>⚡</span> COMPETITIVE ARENA
            </h1>
            <p className="text-xs text-slate-400">Global Head-to-Head Athlete Matchmaking</p>
          </div>
        </div>

        {/* Global Tab Switcher back to Room Code Lobbies without breaking anything */}
        <button
          onClick={() => navigate('/lobby')}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10 transition flex items-center gap-1.5"
        >
          <span>🏷️</span> Room Code Lobby
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mx-4 mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          STAGE 1: COMPETITIVE HOME
          ═══════════════════════════════════════════════════════════════════════════ */}
      {stage === 'HOME' && (
        <div className="px-4 py-4 space-y-6">
          {/* User Rank Card */}
          <div className={`p-4 rounded-2xl border ${rankTheme.border} ${rankTheme.bg} relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Competitive Tier</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-2xl">{rankTheme.icon}</span>
                  <h2 className={`text-xl font-black tracking-wide ${rankTheme.text}`}>
                    {currentRankTier.toUpperCase()}
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Rating</span>
                <p className="text-xl font-black text-white">{userRank?.rankPoints || 100} <span className="text-xs text-amber-400 font-bold">RP</span></p>
              </div>
            </div>

            {/* Win/Loss/Draw Stats */}
            <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Wins</span>
                <p className="text-base font-extrabold text-emerald-400">{userRank?.wins || 0}</p>
              </div>
              <div className="border-x border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Losses</span>
                <p className="text-base font-extrabold text-rose-400">{userRank?.losses || 0}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Win Rate</span>
                <p className="text-base font-extrabold text-cyan-400">
                  {userRank && userRank.totalMatches > 0
                    ? `${Math.round((userRank.wins / userRank.totalMatches) * 100)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </div>

          {/* Matchmaking Info Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/30 text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20">
              ⚔️
            </div>
            <h3 className="text-lg font-black text-white">Global Matchmaking Arena</h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              Skill-based matchmaking within your rank division ({currentRankTier}). Your competitive challenge will be revealed in the match room.
            </p>
          </div>

          {/* Start Button */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleStartRandomMatch}
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-lg uppercase tracking-wider shadow-2xl shadow-indigo-600/30 active:scale-[0.98] transition flex items-center justify-center gap-3"
            >
              <span>⚔️</span> START RANDOM MATCH
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Tap start to enter matchmaking queue
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          STAGE 2: LOBBY SEARCHING GRAPHIC
          ═══════════════════════════════════════════════════════════════════════════ */}
      {stage === 'SEARCHING' && (
        <div className="px-4 py-16 flex flex-col items-center text-center space-y-8">
          {/* High-Tech Radar Searching Graphic */}
          <div className="relative w-56 h-56 flex items-center justify-center">
            {/* Outer pulsating ring */}
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
            {/* Middle pulsing wave */}
            <div className="absolute inset-6 rounded-full border-2 border-indigo-500/40 animate-pulse" />
            {/* Concentric grid rings */}
            <div className="absolute inset-12 rounded-full border border-purple-500/50" />
            <div className="absolute inset-16 rounded-full border border-cyan-500/30 border-dashed animate-spin" style={{ animationDuration: '12s' }} />
            {/* Glowing central core */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-4xl shadow-2xl shadow-blue-500/50 relative z-10">
              ⚡
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-wide flex items-center justify-center gap-2">
              <span>SEARCHING LOBBY</span>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Scanning for online athletes in {currentRankTier} tier (±1 window)
            </p>
            <div className="mt-2 inline-block px-4 py-1.5 rounded-full bg-slate-900/90 border border-white/10 text-xs font-mono text-cyan-400 shadow-inner">
              Queue Elapsed: {String(Math.floor(searchSeconds / 60)).padStart(2, '0')}:
              {String(searchSeconds % 60).padStart(2, '0')}
            </div>
          </div>

          <div className="w-full max-w-xs space-y-3 pt-4">
            {/* Dev Mode Instant Simulation Helper */}
            <button
              onClick={handleDevSimulateOpponent}
              className="w-full py-3 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2"
            >
              <span>🤖</span> Instant Pair (Simulated Opponent)
            </button>

            {/* Cancel Button */}
            <button
              onClick={handleCancelSearch}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-bold transition"
            >
              Cancel Search
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          STAGE 3: PRIVATE MATCH ROOM
          ═══════════════════════════════════════════════════════════════════════════ */}
      {stage === 'MATCH_ROOM' && activeMatch && (
        <div className="px-4 py-4 space-y-5">
          {/* Challenge Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-900 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 font-extrabold uppercase">
                {activeMatch.challenge.sportId} Match
              </span>
              <span className="text-xs font-bold text-slate-300">⏱️ {activeMatch.challenge.durationSeconds}s</span>
            </div>

            <h3 className="text-lg font-black text-white mt-2">{activeMatch.challenge.title}</h3>
            <p className="text-xs text-slate-300 mt-1">{activeMatch.challenge.goal}</p>

            <div className="mt-3 pt-2.5 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Formula: {activeMatch.challenge.scoringFormula}</span>
              <span className="text-amber-400 font-semibold">1st: +{activeMatch.challenge.rewards.firstPlace.xp} XP</span>
            </div>
          </div>

          {/* Head-to-Head Player Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Player 1 (You) */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-blue-500/40 text-center relative">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-xl">
                🥊
              </div>
              <h4 className="font-bold text-sm text-white mt-2 truncate">{myPlayer?.displayName || 'You'}</h4>
              <span className="text-[11px] font-semibold text-blue-400">{myPlayer?.rankTier}</span>

              <div className="mt-3">
                {myPlayer?.ready ? (
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    ✓ READY
                  </span>
                ) : (
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-semibold">
                    Waiting...
                  </span>
                )}
              </div>
            </div>

            {/* Player 2 (Opponent) */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-rose-500/40 text-center relative">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-xl">
                ⚔️
              </div>
              <h4 className="font-bold text-sm text-white mt-2 truncate">{opponentPlayer?.displayName || 'Opponent'}</h4>
              <span className="text-[11px] font-semibold text-rose-400">{opponentPlayer?.rankTier}</span>

              <div className="mt-3">
                {opponentPlayer?.ready ? (
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    ✓ READY
                  </span>
                ) : (
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-semibold">
                    Waiting...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ready Button */}
          <div className="pt-4">
            {!myPlayer?.ready ? (
              <button
                onClick={handleReadyUp}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition active:scale-95"
              >
                I'M READY 🥊
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 text-center text-xs text-slate-300 animate-pulse">
                ⏳ Synchronizing with opponent... Match starting shortly!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          STAGE 4: COUNTDOWN
          ═══════════════════════════════════════════════════════════════════════════ */}
      {stage === 'COUNTDOWN' && (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-6">
          <span className="text-xs uppercase tracking-widest font-black text-cyan-400">GET READY</span>
          <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-300 to-blue-500 animate-ping">
            {countdownValue}
          </div>
          <p className="text-sm font-bold text-slate-400">Prepare for verified repetitions!</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          STAGE 5: LIVE CHALLENGE ARENA
          ═══════════════════════════════════════════════════════════════════════════ */}
      {stage === 'CHALLENGE' && activeMatch && (
        <div className="px-4 py-4 space-y-4">
          {/* Top Arena Bar: Timer & Lead Indicator */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Challenge Time</span>
              <div className="text-2xl font-black text-white font-mono">
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Current Match Status</span>
              <div>
                {myScore > oppScore ? (
                  <span className="text-xs font-black text-emerald-400">🔥 Leading by {myScore - oppScore} pts</span>
                ) : myScore < oppScore ? (
                  <span className="text-xs font-black text-rose-400">⚠️ Trailing by {oppScore - myScore} pts</span>
                ) : (
                  <span className="text-xs font-black text-cyan-400">⚔️ Tied ({myScore} pts)</span>
                )}
              </div>
            </div>
          </div>

          {/* Side-by-Side Live Head-to-Head Arena */}
          <div className="grid grid-cols-2 gap-3">
            {/* My Live Panel */}
            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/40 text-center">
              <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400">You</span>
              <h3 className="font-extrabold text-sm text-white truncate">{myPlayer?.displayName || 'You'}</h3>

              <div className="my-3">
                <div className="text-4xl font-black text-blue-400">{myScore}</div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Verified Score</span>
              </div>

              <div className="pt-2 border-t border-white/10 text-xs text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span>Count:</span>
                  <span className="font-bold text-white">{myReps}</span>
                </div>
                <div className="flex justify-between">
                  <span>Form:</span>
                  <span className="font-bold text-emerald-400">{myQuality}%</span>
                </div>
              </div>
            </div>

            {/* Opponent Live Panel */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-center">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Opponent</span>
              <h3 className="font-extrabold text-sm text-white truncate">{opponentPlayer?.displayName || 'Opponent'}</h3>

              <div className="my-3">
                <div className="text-4xl font-black text-slate-300">{oppScore}</div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Verified Score</span>
              </div>

              <div className="pt-2 border-t border-white/10 text-xs text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span>Count:</span>
                  <span className="font-bold text-white">{opponentPlayer?.telemetry.reps || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Form:</span>
                  <span className="font-bold text-cyan-400">{opponentPlayer?.telemetry.formScore || 85}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Quality Selector */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
            <span className="text-[11px] text-slate-400 uppercase font-bold block mb-2">Form Quality Precision</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 96, label: 'Perfect (96%)' },
                { val: 88, label: 'Solid (88%)' },
                { val: 75, label: 'Fair (75%)' },
              ].map((q) => (
                <button
                  key={q.val}
                  onClick={() => setMyQuality(q.val)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition border ${
                    myQuality === q.val
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800/60 border-white/5 text-slate-400'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Big Tactile Action: Record Rep */}
          <button
            onClick={handleRecordRep}
            className="w-full py-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-lg uppercase tracking-wider shadow-xl shadow-blue-500/30 active:scale-95 transition"
          >
            ⚡ RECORD VERIFIED REP / CATCH
          </button>

          {/* Finish Button */}
          <button
            onClick={() => handleFinishMatch()}
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            {isSubmitting ? 'Finalizing Match...' : 'Submit & Finish Match Early'}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          STAGE 6: RESULT SCREEN
          ═══════════════════════════════════════════════════════════════════════════ */}
      {stage === 'RESULT' && activeMatch && activeMatch.results && (
        <div className="px-4 py-6 space-y-6">
          {/* Victory / Defeat Header */}
          <div className="text-center space-y-2">
            {activeMatch.results.isDraw ? (
              <>
                <div className="text-5xl">🤝</div>
                <h2 className="text-2xl font-black text-cyan-400 uppercase">IT'S A DRAW!</h2>
                <p className="text-xs text-slate-400">Equal scores achieved in battle</p>
              </>
            ) : activeMatch.results.winnerId === currentUserId ? (
              <>
                <div className="text-5xl">🏆</div>
                <h2 className="text-2xl font-black text-yellow-400 uppercase">VICTORY!</h2>
                <p className="text-xs text-slate-400">You conquered the arena challenge</p>
              </>
            ) : (
              <>
                <div className="text-5xl">🥈</div>
                <h2 className="text-2xl font-black text-slate-300 uppercase">DEFEAT</h2>
                <p className="text-xs text-slate-400">Keep training to climb the ranks</p>
              </>
            )}
          </div>

          {/* Rewards Earned Card */}
          {(() => {
            const myResult = activeMatch.results.leaderboard.find((l) => l.userId === currentUserId) ||
              activeMatch.results.leaderboard[0];
            return (
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rewards Earned</span>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-400">Experience</span>
                    <p className="text-xl font-black text-white">+{myResult?.xpEarned || 0} XP</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-400">Rank Points</span>
                    <p className="text-xl font-black text-white">+{myResult?.rankPointsChange || 0} RP</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">New Rating:</span>
                  <span className="font-bold text-cyan-400">
                    {myResult?.newRankPoints || userRank?.rankPoints} RP ({myResult?.newRankTier || userRank?.rankTier})
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Final Match Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">Match Leaderboard</h4>

            {activeMatch.results.leaderboard.map((res) => (
              <div
                key={res.userId}
                className={`p-3 rounded-xl flex items-center justify-between border ${
                  res.userId === currentUserId
                    ? 'bg-blue-950/20 border-blue-500/30'
                    : 'bg-slate-950/30 border-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-black text-slate-300">#{res.placement}</span>
                  <div>
                    <h5 className="font-bold text-xs text-white">
                      {res.displayName} {res.userId === currentUserId ? '(You)' : ''}
                    </h5>
                    <span className="text-[10px] text-slate-400">
                      {res.reps} reps @ {res.formScore}% form
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-white">{res.score} pts</span>
                  <p className="text-[10px] text-emerald-400 font-semibold">+{res.xpEarned} XP</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleStartRandomMatch}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-500/20 transition"
            >
              ⚔️ Play Again (Queue New Match)
            </button>

            <button
              onClick={handleResetToHome}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-300 transition"
            >
              🏠 Return to Arena Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
