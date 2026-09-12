/**
 * SportX Competitive Match Loading / Waiting Lobby Component
 * Strictly additive isolated component featuring:
 * - Live player count: "Players Joined: 1 / 2"
 * - Profile photo, public name, rank tier, level, connection/ready status
 * - Empty slots with animated pulse until lobby is full
 * - "Match Found" banner with one-time sound effect
 * - 3–5s synchronized countdown
 * - Instant recovery if any player leaves before match starts
 * - Cancel Search control
 * - Zero private account data exposure
 */

import React from 'react';
import { useCompetitiveLobby } from '../hooks/useCompetitiveLobby';
import { CompetitivePlayerCard } from './CompetitivePlayerCard';
import { CompetitiveMatchDoc, QueueTicketDoc } from '../types/competitive';

interface CompetitiveMatchLoadingProps {
  ticket: QueueTicketDoc | null;
  initialMatch?: CompetitiveMatchDoc | null;
  targetPlayers?: number;
  countdownDuration?: number;
  onMatchReady: (match: CompetitiveMatchDoc) => void;
  onCancel: () => void;
}

export const CompetitiveMatchLoading: React.FC<CompetitiveMatchLoadingProps> = ({
  ticket,
  initialMatch = null,
  targetPlayers = 2,
  countdownDuration = 4,
  onMatchReady,
  onCancel,
}) => {
  const {
    status,
    players,
    playersJoinedCount,
    isLobbyFull,
    countdownSeconds,
    searchElapsedSeconds,
    cancelSearch,
    simulateDevOpponent,
    simulateDevOpponentLeave,
  } = useCompetitiveLobby({
    ticket,
    initialMatch,
    targetPlayers,
    countdownDuration,
    onMatchReady,
    onCancel,
  });

  const isMatchFound = status === 'match_found' || status === 'countdown' || status === 'launching';

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col items-center text-center space-y-6 animate-fadeIn">
      {/* ── Top Header & Live Counter ────────────────────────────────────────── */}
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            COMPETITIVE LOBBY
          </span>

          <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-2.5 py-1 rounded-full border border-white/10">
            ⏱️ {formatTime(searchElapsedSeconds)}
          </span>
        </div>

        {/* Live Players Joined Pill */}
        <div
          className={`py-2 px-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${
            isLobbyFull
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/80 border-white/10 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{isLobbyFull ? '✓' : '👥'}</span>
            <span className="text-xs font-black tracking-wide">
              PLAYERS JOINED: {playersJoinedCount} / {targetPlayers}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {Array.from({ length: targetPlayers }).map((_, idx) => (
              <span
                key={idx}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  idx < playersJoinedCount
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Status Hero Graphic: Radar vs Match Found Banner ─────────────────── */}
      {isMatchFound ? (
        <div className="w-full p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border-2 border-emerald-500/60 shadow-2xl shadow-emerald-500/20 text-center space-y-2 animate-bounce">
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black tracking-widest uppercase">
            ⚡ MATCH FOUND
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            OPPONENTS READY!
          </h2>
          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-emerald-300 to-emerald-500 animate-pulse">
            STARTING IN {countdownSeconds}s
          </div>
          <p className="text-[11px] text-slate-400">
            Synchronizing arena challenge...
          </p>
        </div>
      ) : (
        <div className="relative w-44 h-44 flex items-center justify-center my-2">
          {/* Outer radar pulse rings */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" />
          <div className="absolute inset-4 rounded-full border border-indigo-500/30 animate-pulse" />
          <div className="absolute inset-8 rounded-full border border-purple-500/40" />
          <div
            className="absolute inset-12 rounded-full border border-cyan-500/20 border-dashed animate-spin"
            style={{ animationDuration: '10s' }}
          />

          {/* Central Beacon */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-3xl text-white shadow-xl shadow-blue-500/40 relative z-10">
            ⚡
          </div>
        </div>
      )}

      {/* ── Waiting Notice ───────────────────────────────────────────────────── */}
      {!isMatchFound && (
        <div className="space-y-1">
          <h3 className="text-lg font-black text-white flex items-center justify-center gap-1.5">
            <span>WAITING IN LOBBY</span>
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Searching for a skill-matched opponent within your competitive tier.
          </p>
        </div>
      )}

      {/* ── Player Slots Grid ────────────────────────────────────────────────── */}
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Lobby Slots
          </span>
          <span className="text-[11px] text-cyan-400 font-semibold">
            {targetPlayers - playersJoinedCount === 0
              ? 'Lobby Full'
              : `Waiting for ${targetPlayers - playersJoinedCount} more`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {Array.from({ length: targetPlayers }).map((_, slotIdx) => {
            const player = players[slotIdx] || null;
            const isEmpty = !player;
            const isCurrentPlayer = slotIdx === 0;

            return (
              <CompetitivePlayerCard
                key={slotIdx}
                slotNumber={slotIdx + 1}
                player={player}
                isEmpty={isEmpty}
                isCurrentPlayer={isCurrentPlayer}
              />
            );
          })}
        </div>
      </div>

      {/* ── Controls & Dev Mode ──────────────────────────────────────────────── */}
      <div className="w-full space-y-3 pt-2">
        {/* Development simulated pairing / leave button */}
        {!isLobbyFull ? (
          <button
            onClick={simulateDevOpponent}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2"
          >
            <span>🤖</span> Instant Pair (Simulate Opponent)
          </button>
        ) : (
          <button
            onClick={simulateDevOpponentLeave}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2"
          >
            <span>🚪</span> Test Opponent Leave (Abort Countdown)
          </button>
        )}

        {/* Cancel Search button */}
        <button
          onClick={cancelSearch}
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-2"
        >
          <span>✕</span> Cancel Search
        </button>
      </div>
    </div>
  );
};

export default CompetitiveMatchLoading;
