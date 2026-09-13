import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LeaderboardRow from '../components/LeaderboardRow';
import type { LeaderboardEntry } from '../types';
import { Trophy, School, Globe, Crown, Zap, Swords, Flame, Sparkles, Award } from 'lucide-react';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [boardType, setBoardType] = useState<'college' | 'global'>('global');
  const [sortBy, setSortBy] = useState<'xp' | 'rp'>('xp');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [boardType, sortBy]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const fetcher = boardType === 'global'
        ? () => api.getGlobalLeaderboard(sortBy)
        : () => api.getCollegeLeaderboard(sortBy);

      const res: any = await fetcher();
      if (res?.success && Array.isArray(res.data)) {
        const mapped = res.data.map((item: any, idx: number) => ({
          rank: item.rank || idx + 1,
          userId: item.userId,
          username: item.name || 'Anonymous Athlete',
          avatar: item.profileImage || '',
          college: item.collegeName || item.department || 'Campus University',
          totalXp: item.totalXp ?? item.xp ?? 0,
          currentStreak: item.currentStreak || 0,
          rankPoints: item.rankPoints ?? 100,
          rankTier: item.rankTier || 'Bronze',
          equippedTitle: item.equippedTitle,
          featuredBadge: item.featuredBadge,
          isCurrentUser: user?.id === item.userId,
        }));
        setEntries(mapped);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const topThree = entries.slice(0, 3);
  const getCleanTitle = (titleId?: string) => {
    if (!titleId) return null;
    return titleId.replace('title_', '').replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <header className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Trophy size={18} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Competitive Standings</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Athlete Leaderboard</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Authoritative real-time rankings based on verified workout XP and competitive RP.
        </p>
      </header>

      {/* Primary Scope Toggle (College vs Global) */}
      <div className="flex rounded-xl p-1 bg-surface border border-white/5">
        <button
          type="button"
          onClick={() => setBoardType('global')}
          className={`flex-1 py-2.5 rounded-lg border-none cursor-pointer font-outfit font-black text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 ${
            boardType === 'global'
              ? 'bg-neon text-obsidian shadow-glow-sm'
              : 'bg-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Globe size={14} />
          <span>Global Arena</span>
        </button>

        <button
          type="button"
          onClick={() => setBoardType('college')}
          className={`flex-1 py-2.5 rounded-lg border-none cursor-pointer font-outfit font-black text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 ${
            boardType === 'college'
              ? 'bg-neon text-obsidian shadow-glow-sm'
              : 'bg-transparent text-slate-400 hover:text-white'
          }`}
        >
          <School size={14} />
          <span>My Campus</span>
        </button>
      </div>

      {/* Metric Sort Toggle (Workout XP vs Competitive RP) */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Ranking Metric:
        </span>
        <div className="flex items-center gap-1.5 bg-surface border border-white/5 p-1 rounded-xl">
          <button
            onClick={() => setSortBy('xp')}
            className={`px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 ${
              sortBy === 'xp'
                ? 'bg-neon text-obsidian shadow-glow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap size={12} />
            <span>Workout XP</span>
          </button>
          <button
            onClick={() => setSortBy('rp')}
            className={`px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 ${
              sortBy === 'rp'
                ? 'bg-amber-500 text-obsidian shadow-glow-amber'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Swords size={12} />
            <span>Competitive RP</span>
          </button>
        </div>
      </div>

      {/* Top 3 Podium Showcase */}
      {!loading && topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-3">
          {/* 2nd Place Podium */}
          {topThree[1] ? (
            <div className="card p-3.5 flex flex-col items-center justify-end text-center bg-surface/50 border border-slate-700/60 rounded-2xl order-1 shadow-md">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-slate-200 to-slate-400 text-black font-black text-xs flex items-center justify-center mb-1.5 shadow">
                2
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-white mb-1.5 shadow">
                {topThree[1].username?.[0]?.toUpperCase() || '2'}
              </div>
              <span className="text-xs font-black text-white truncate max-w-full block">
                {topThree[1].username}
              </span>
              {topThree[1].equippedTitle && (
                <span className="text-[9px] font-extrabold text-slate-300 uppercase tracking-wider block truncate max-w-full mt-0.5 flex items-center justify-center gap-1">
                  <Crown size={10} className="text-slate-300" />
                  <span>{getCleanTitle(topThree[1].equippedTitle)}</span>
                </span>
              )}
              <span className="text-[11px] font-black font-outfit mt-1 tabular-nums text-neon">
                {sortBy === 'rp' ? `${topThree[1].rankPoints} RP` : `${topThree[1].totalXp.toLocaleString()} XP`}
              </span>
              {topThree[1].rankTier && (
                <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                  {topThree[1].rankTier}
                </span>
              )}
            </div>
          ) : <div className="order-1" />}

          {/* 1st Place Champion Podium (Center & Elevated) */}
          {topThree[0] && (
            <div className="card-glass p-4 flex flex-col items-center justify-end text-center border-amber-500/50 bg-gradient-to-b from-amber-500/20 via-card to-card shadow-glow-amber order-2 relative -mt-3.5 rounded-2xl">
              <div className="flex items-center gap-1 text-amber-400 mb-1">
                <Crown size={18} className="animate-pulse" />
              </div>
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-black font-black text-sm flex items-center justify-center mb-1.5 shadow-glow-sm">
                1
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/25 text-amber-300 border-2 border-amber-400/80 flex items-center justify-center text-lg font-black mb-1.5 shadow-lg">
                {topThree[0].username?.[0]?.toUpperCase() || '1'}
              </div>
              <span className="text-xs sm:text-sm font-black text-white truncate max-w-full block">
                {topThree[0].username}
              </span>
              {topThree[0].equippedTitle ? (
                <span className="text-[9px] font-extrabold text-amber-300 uppercase tracking-wider block truncate max-w-full mt-0.5 flex items-center justify-center gap-1">
                  <Crown size={10} className="text-amber-300" />
                  <span>{getCleanTitle(topThree[0].equippedTitle)}</span>
                </span>
              ) : (
                <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider block">
                  Reigning Leader
                </span>
              )}
              <span className="text-xs sm:text-sm font-black text-amber-300 font-outfit mt-1 tabular-nums">
                {sortBy === 'rp' ? `${topThree[0].rankPoints} RP` : `${topThree[0].totalXp.toLocaleString()} XP`}
              </span>
              {topThree[0].rankTier && (
                <span className="text-[9px] font-black uppercase text-amber-400 block mt-0.5">
                  {topThree[0].rankTier} Division
                </span>
              )}
            </div>
          )}

          {/* 3rd Place Podium */}
          {topThree[2] ? (
            <div className="card p-3.5 flex flex-col items-center justify-end text-center bg-surface/50 border border-slate-700/60 rounded-2xl order-3 shadow-md">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 font-black text-xs flex items-center justify-center mb-1.5 shadow">
                3
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-white mb-1.5 shadow">
                {topThree[2].username?.[0]?.toUpperCase() || '3'}
              </div>
              <span className="text-xs font-black text-white truncate max-w-full block">
                {topThree[2].username}
              </span>
              {topThree[2].equippedTitle && (
                <span className="text-[9px] font-extrabold text-slate-300 uppercase tracking-wider block truncate max-w-full mt-0.5 flex items-center justify-center gap-1">
                  <Crown size={10} className="text-slate-300" />
                  <span>{getCleanTitle(topThree[2].equippedTitle)}</span>
                </span>
              )}
              <span className="text-[11px] font-black font-outfit mt-1 tabular-nums text-neon">
                {sortBy === 'rp' ? `${topThree[2].rankPoints} RP` : `${topThree[2].totalXp.toLocaleString()} XP`}
              </span>
              {topThree[2].rankTier && (
                <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                  {topThree[2].rankTier}
                </span>
              )}
            </div>
          ) : <div className="order-3" />}
        </div>
      )}

      {/* Leaderboard Table List */}
      <section className="pt-2">
        {loading ? (
          <div className="space-y-2 py-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="card p-12 text-center text-slate-400 space-y-2 rounded-2xl border border-slate-800">
            <Trophy size={36} className="mx-auto text-slate-600 mb-1" />
            <div className="font-black text-sm text-white">No Athletes Ranked Yet</div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Complete verified workouts or competitive matches to establish your standing on the leaderboard!
            </p>
          </div>
        ) : (
          <div className="card p-2 space-y-1 rounded-2xl border border-white/5 bg-surface/30">
            {entries.map((entry, index) => (
              <LeaderboardRow
                key={entry.userId || index}
                entry={entry}
                index={index}
                sortBy={sortBy}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
