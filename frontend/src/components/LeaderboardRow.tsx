import type { LeaderboardEntry } from '../types';
import { Flame, Medal, Award, Crown } from 'lucide-react';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
}

export default function LeaderboardRow({ entry, index }: LeaderboardRowProps) {
  const isTopThree = index < 3;

  const rankBadge = index === 0 ? (
    <span className="text-xl" title="1st Place">🥇</span>
  ) : index === 1 ? (
    <span className="text-xl" title="2nd Place">🥈</span>
  ) : index === 2 ? (
    <span className="text-xl" title="3rd Place">🥉</span>
  ) : (
    <span className="text-xs font-black text-slate-500 tabular-nums font-outfit">
      #{index + 1}
    </span>
  );

  return (
    <div
      className={`lb-row px-3 py-3 rounded-xl transition-all ${
        entry.isCurrentUser
          ? 'bg-neon/10 border border-neon/30 shadow-glow-sm'
          : 'hover:bg-surface/50'
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
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-xs sm:text-sm text-white truncate">
            {entry.username}
          </span>
          {entry.isCurrentUser && (
            <span className="text-[9px] font-black uppercase tracking-wider text-neon bg-neon/15 px-1.5 py-0.2 rounded-full border border-neon/30">
              YOU
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 truncate">
          {entry.college || 'Collegiate Athlete'}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="lb-xp font-outfit tabular-nums font-black text-sm text-neon">
          {entry.totalXp.toLocaleString()} <span className="text-[10px] font-bold">XP</span>
        </div>
        <div className="text-[10px] text-amber-400 font-semibold flex items-center justify-end gap-0.5 tabular-nums">
          <Flame size={11} className="fill-amber-400/20 text-amber-400" />
          <span>{entry.currentStreak}d</span>
        </div>
      </div>
    </div>
  );
}
