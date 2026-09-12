/**
 * SportX Competitive Player Card Component
 * Strictly displays safe public player data:
 * - Profile photo / Avatar
 * - Display name (never email or UID)
 * - Rank tier badge & level
 * - Connection and ready status
 * - Empty slot state when waiting for opponents
 */

import React from 'react';
import { CompetitiveRankTier } from '../types/competitive';

export interface PublicCompetitivePlayer {
  displayName: string;
  avatarUrl?: string;
  rankTier: CompetitiveRankTier | string;
  rankPoints?: number;
  level?: number;
  ready?: boolean;
  isSimulated?: boolean;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
}

interface CompetitivePlayerCardProps {
  player?: PublicCompetitivePlayer | null;
  slotNumber: number;
  isEmpty?: boolean;
  isCurrentPlayer?: boolean;
}

const RANK_BADGES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  Bronze: { bg: 'bg-amber-950/40', text: 'text-amber-500', border: 'border-amber-600/40', icon: '🥉' },
  Silver: { bg: 'bg-slate-800/60', text: 'text-slate-300', border: 'border-slate-500/40', icon: '🥈' },
  Gold: { bg: 'bg-yellow-950/40', text: 'text-yellow-400', border: 'border-yellow-500/50', icon: '🥇' },
  Platinum: { bg: 'bg-cyan-950/40', text: 'text-cyan-400', border: 'border-cyan-500/50', icon: '💎' },
  Diamond: { bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-500/50', icon: '👑' },
};

export const CompetitivePlayerCard: React.FC<CompetitivePlayerCardProps> = ({
  player,
  slotNumber,
  isEmpty = false,
  isCurrentPlayer = false,
}) => {
  if (isEmpty || !player) {
    return (
      <div className="p-4 rounded-2xl border-2 border-dashed border-white/10 bg-slate-900/30 flex flex-col items-center justify-center text-center min-h-[160px] relative overflow-hidden transition-all duration-300 hover:border-white/20">
        {/* Pulsing radar dot */}
        <div className="w-14 h-14 rounded-full bg-slate-800/50 border border-white/5 flex items-center justify-center text-2xl text-slate-500 animate-pulse mb-2">
          👤
        </div>

        <span className="text-xs font-bold text-slate-400">
          Slot #{slotNumber}
        </span>
        <p className="text-[11px] text-slate-400 mt-0.5 animate-pulse flex items-center gap-1.5 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          <span>Searching for opponent...</span>
        </p>

        <span className="mt-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
          Open Slot
        </span>
      </div>
    );
  }

  const rankTier = player.rankTier || 'Bronze';
  const rankTheme = RANK_BADGES[rankTier] || RANK_BADGES.Bronze;
  const playerLevel = player.level || Math.max(1, Math.floor((player.rankPoints || 100) / 100));
  const isConnected = player.connectionStatus !== 'disconnected';

  // Extract safe public name: never show email or raw uuid
  const safeName = player.displayName
    ? player.displayName.replace(/@.+/, '').substring(0, 20)
    : `Athlete #${slotNumber}`;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
        isCurrentPlayer
          ? 'bg-blue-950/30 border-blue-500/40 shadow-lg shadow-blue-500/10'
          : 'bg-slate-900/70 border-white/10'
      }`}
    >
      {/* Top badges */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase font-bold text-slate-400">
          Slot #{slotNumber} {isCurrentPlayer && <span className="text-blue-400 font-black">(You)</span>}
        </span>

        {/* Connection status indicator */}
        <div className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
            }`}
          />
          <span className="text-[10px] font-semibold text-slate-400">
            {player.ready ? 'Ready' : isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Avatar & Info */}
      <div className="flex items-center gap-3">
        {player.avatarUrl ? (
          <img
            src={player.avatarUrl}
            alt={safeName}
            className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shadow-md"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white/20 flex items-center justify-center text-xl text-white shadow-md">
            {isCurrentPlayer ? '🥊' : player.isSimulated ? '⚡' : '🏃'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-extrabold text-white truncate">{safeName}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            {/* Rank badge */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold border ${rankTheme.border} ${rankTheme.bg} ${rankTheme.text} flex items-center gap-1`}
            >
              <span>{rankTheme.icon}</span>
              <span>{rankTier}</span>
            </span>

            {/* Level indicator */}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
              Lvl {playerLevel}
            </span>
          </div>
        </div>
      </div>

      {/* Ready Banner */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Status:</span>
        <span
          className={`font-bold flex items-center gap-1 ${
            player.ready ? 'text-emerald-400' : 'text-cyan-400'
          }`}
        >
          {player.ready ? '✓ Match Ready' : '• Joined & Waiting'}
        </span>
      </div>
    </div>
  );
};

export default CompetitivePlayerCard;
