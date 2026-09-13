import type { LeaderboardEntry } from '../types';
import { Flame, Crown, Award, Swords } from 'lucide-react';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
  sortBy?: 'xp' | 'rp';
}

export default function LeaderboardRow({ entry, index, sortBy = 'xp' }: LeaderboardRowProps) {
  const rankBadge = index === 0 ? (
    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-black font-black text-xs flex items-center justify-center shadow-glow-sm">
      1
    </div>
  ) : index === 1 ? (
    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-slate-200 to-slate-400 text-black font-black text-xs flex items-center justify-center">
      2
    </div>
  ) : index === 2 ? (
    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 font-black text-xs flex items-center justify-center">
      3
    </div>
  ) : (
    <span className="text-xs font-black text-slate-500 tabular-nums font-outfit">
      #{index + 1}
    </span>
  );

  const titleDisplayName = entry.equippedTitle
    ? entry.equippedTitle.replace('title_', '').replace(/_/g, ' ').toUpperCase()
    : null;

  return (
    <div
      className={`lb-row px-3 py-3 rounded-xl transition-all ${
        entry.isCurrentUser
          ? 'bg-neon/10 border border-neon/30 shadow-glow-sm'
          : 'hover:bg-surface/50 border border-transparent'
      }`}
    >
      <div className="lb-rank flex items-center justify-center flex-shrink-0">
        {rankBadge}
      </div>

      <div className="lb-avatar flex-shrink-0">
        {entry.avatar ? (
          <span>{entry.avatar}</span>
        ) : (
          <span>{entry.username?.[0]?.toUpperCase() || 'A'}</span>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-xs sm:text-sm text-white truncate">
            {entry.username}
          </span>
          {entry.isCurrentUser && (
            <span className="text-[9px] font-black uppercase tracking-wider text-neon bg-neon/15 px-1.5 py-0.2 rounded-full border border-neon/30">
              YOU
            </span>
          )}
          {titleDisplayName && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Crown size={9} />
              <span>{titleDisplayName}</span>
            </span>
          )}
          {entry.rankTier && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {entry.rankTier} {entry.rankPoints !== undefined ? `• ${entry.rankPoints} RP` : ''}
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 truncate mt-0.5">
          {entry.college || 'Campus University'}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        {sortBy === 'rp' ? (
          <div className="lb-xp font-outfit tabular-nums font-black text-sm text-amber-400">
            {(entry.rankPoints ?? 100).toLocaleString()} <span className="text-[10px] font-bold">RP</span>
          </div>
        ) : (
          <div className="lb-xp font-outfit tabular-nums font-black text-sm text-neon">
            {entry.totalXp.toLocaleString()} <span className="text-[10px] font-bold">XP</span>
          </div>
        )}
        <div className="text-[10px] text-amber-400 font-semibold flex items-center justify-end gap-0.5 tabular-nums">
          <Flame size={11} className="fill-amber-400/20 text-amber-400" />
          <span>{entry.currentStreak}d</span>
        </div>
      </div>
    </div>
  );
}
