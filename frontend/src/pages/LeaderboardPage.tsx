import { useState, useEffect } from 'react';
import { api } from '../services/api';
import LeaderboardRow from '../components/LeaderboardRow';
import type { LeaderboardEntry } from '../types';
import { Trophy, School, Globe, Crown } from 'lucide-react';

export default function LeaderboardPage() {
  const [boardType, setBoardType] = useState<'college' | 'global'>('college');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = boardType === 'global' ? api.getGlobalLeaderboard : api.getCollegeLeaderboard;

    fetcher()
      .then((r: any) => setEntries(r?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [boardType]);

  const topThree = entries.slice(0, 3);

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {/* Header */}
      <header className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Trophy size={18} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Campus Standings</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Athlete Leaderboard</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time performance rankings based on verified workout XP.
        </p>
      </header>

      {/* Segmented Control */}
      <div className="flex rounded-xl p-1 bg-surface border border-white/5">
        <button
          type="button"
          onClick={() => setBoardType('college')}
          className={`flex-1 py-2 rounded-lg border-none cursor-pointer font-outfit font-bold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 ${
            boardType === 'college'
              ? 'bg-card text-neon shadow-md border border-white/10'
              : 'bg-transparent text-slate-400 hover:text-white'
          }`}
        >
          <School size={14} />
          <span>My College</span>
        </button>

        <button
          type="button"
          onClick={() => setBoardType('global')}
          className={`flex-1 py-2 rounded-lg border-none cursor-pointer font-outfit font-bold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 ${
            boardType === 'global'
              ? 'bg-card text-neon shadow-md border border-white/10'
              : 'bg-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Globe size={14} />
          <span>Global Arena</span>
        </button>
      </div>

      {/* Top 3 Podium Banner */}
      {!loading && topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-2">
          {/* 2nd Place */}
          {topThree[1] ? (
            <div className="card p-3 flex flex-col items-center justify-end text-center bg-surface/40 border border-white/5 order-1">
              <span className="text-2xl mb-1">🥈</span>
              <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-sm font-bold text-white mb-1.5">
                {topThree[1].username?.[0]?.toUpperCase() || '2'}
              </div>
              <span className="text-xs font-bold text-white truncate max-w-full block">
                {topThree[1].username}
              </span>
              <span className="text-[10px] font-black text-neon font-outfit mt-0.5 tabular-nums">
                {topThree[1].totalXp} XP
              </span>
            </div>
          ) : <div className="order-1" />}

          {/* 1st Place Champion */}
          {topThree[0] && (
            <div className="card-glass p-3.5 flex flex-col items-center justify-end text-center border-amber-500/40 bg-gradient-to-b from-amber-500/15 to-card shadow-glow-amber order-2 relative -mt-3">
              <Crown size={16} className="text-amber-400 mb-1 animate-pulse" />
              <span className="text-3xl mb-1">🥇</span>
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-base font-black mb-1.5">
                {topThree[0].username?.[0]?.toUpperCase() || '1'}
              </div>
              <span className="text-xs font-black text-white truncate max-w-full block">
                {topThree[0].username}
              </span>
              <span className="text-xs font-black text-amber-400 font-outfit mt-0.5 tabular-nums">
                {topThree[0].totalXp} XP
              </span>
            </div>
          )}

          {/* 3rd Place */}
          {topThree[2] ? (
            <div className="card p-3 flex flex-col items-center justify-end text-center bg-surface/40 border border-white/5 order-3">
              <span className="text-2xl mb-1">🥉</span>
              <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-sm font-bold text-white mb-1.5">
                {topThree[2].username?.[0]?.toUpperCase() || '3'}
              </div>
              <span className="text-xs font-bold text-white truncate max-w-full block">
                {topThree[2].username}
              </span>
              <span className="text-[10px] font-black text-neon font-outfit mt-0.5 tabular-nums">
                {topThree[2].totalXp} XP
              </span>
            </div>
          ) : <div className="order-3" />}
        </div>
      )}

      {/* Leaderboard Table List */}
      <section className="pt-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="card skeleton h-16 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="card text-center py-12 border border-white/5">
            <Trophy size={36} className="text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">No Standings Available</h3>
            <p className="text-xs text-slate-400 mt-1">
              Be the first athlete to record a session on this board!
            </p>
          </div>
        ) : (
          <div className="card-glass border border-white/10 p-2 divide-y divide-white/5 shadow-card">
            {entries.map((entry, index) => (
              <LeaderboardRow key={entry.userId || index} entry={entry} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
