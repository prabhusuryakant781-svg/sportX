import type { LeaderboardEntry } from '../types';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
}

const RANK_BADGES = ['🥇', '🥈', '🥉'];

export default function LeaderboardRow({ entry, index }: LeaderboardRowProps) {
  const isTopThree = index < 3;

  return (
    <div className={`lb-row ${entry.isCurrentUser ? 'bg-neon/5 rounded-lg px-2 -mx-2' : ''}`}>
      <div className="lb-rank">
        {isTopThree ? (
          <span className="text-xl">{RANK_BADGES[index]}</span>
        ) : (
          <span className="text-muted">{entry.rank}</span>
        )}
      </div>
      <div className="lb-avatar">
        {entry.avatar || entry.username[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="lb-name truncate">
          {entry.username} {entry.isCurrentUser && <span className="text-neon text-xs">(You)</span>}
        </div>
        <div className="text-xs text-muted">{entry.college}</div>
      </div>
      <div className="text-right">
        <div className="lb-xp">{entry.totalXp.toLocaleString()} XP</div>
        <div className="text-xs text-muted">🔥 {entry.currentStreak}d</div>
      </div>
    </div>
  );
}
