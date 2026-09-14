import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LeaderboardRow from '../components/LeaderboardRow';
import SportxBackground from '../components/SportxBackground';
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
    <SportxBackground src="/images/bg-leaderboard.jpg" overlayOpacity={0.88} accentGlow="amber">
      <div className="space-y-4 pb-12 animate-fade-in max-w-4xl mx-auto relative z-10">
        {/* Header with Championship Arena Energy */}
        <header className="pt-2">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-glow-amber">
              <Trophy size={18} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
              CHAMPIONSHIP STANDINGS & DIVISIONS
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase font-outfit">
            ATHLETE LEADERBOARD
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative real-time rankings based on verified workout XP and competitive RP division points.
          </p>
        </header>

      {/* Primary Scope Toggle (College vs Global) */}
      <div className="flex rounded-xl p-1 bg-obsidian-card/90 border border-white/10 backdrop-blur-md">
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
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
          RANKING METRIC:
        </span>
        <div className="flex items-center gap-1.5 bg-obsidian-card border border-white/10 p-1 rounded-xl">
          <button
            onClick={() => setSortBy('xp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 font-outfit uppercase tracking-wider ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 font-outfit uppercase tracking-wider ${
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
        <div className="grid grid-cols-3 gap-2.5 pt-3 items-end">
          {/* 2nd Place Podium */}
          {topThree[1] ? (
            <div className="hud-panel p-3.5 flex flex-col items-center justify-end text-center rounded-2xl order-1 border-slate-600/60 shadow-lg relative group hover:border-slate-400 transition-all">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-slate-200 to-slate-400 text-black font-black text-xs flex items-center justify-center mb-1.5 shadow">
                2
              </div>
              <div className="w-11 h-11 rounded-2xl bg-surface border border-slate-600 flex items-center justify-center text-base font-black text-white mb-1.5 shadow">
                {topThree[1].username?.[0]?.toUpperCase() || '2'}
              </div>
              <span className="text-xs font-black text-white truncate max-w-full block font-outfit">
                {topThree[1].username}
              </span>
              {topThree[1].equippedTitle && (
                <span className="text-[9px] font-mono font-bold text-slate-300 uppercase tracking-wider block truncate max-w-full mt-0.5 flex items-center justify-center gap-1">
                  <Crown size={10} className="text-slate-300" />
                  <span>{getCleanTitle(topThree[1].equippedTitle)}</span>
                </span>
              )}
              <span className="text-[11px] font-black font-outfit mt-1 tabular-nums text-neon">
                {sortBy === 'rp' ? `${topThree[1].rankPoints} RP` : `${topThree[1].totalXp.toLocaleString()} XP`}
              </span>
              {topThree[1].rankTier && (
                <span className="text-[9px] font-mono text-slate-400 block mt-0.5 uppercase">
                  {topThree[1].rankTier}
                </span>
              )}
            </div>
          ) : <div className="order-1" />}

          {/* 1st Place Champion Podium (Center & Elevated) */}
          {topThree[0] && (
            <div className="hud-panel-amber p-4 flex flex-col items-center justify-end text-center order-2 relative -mt-4 rounded-2xl shadow-glow-amber border-amber-400/80 group hover:border-amber-300 transition-all">
              <div className="flex items-center gap-1 text-amber-400 mb-1">
                <Crown size={20} className="animate-bounce" />
              </div>
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-black font-black text-sm flex items-center justify-center mb-1.5 shadow-glow-sm">
                1
              </div>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/25 text-amber-300 border-2 border-amber-400 flex items-center justify-center text-xl font-black mb-1.5 shadow-lg">
                {topThree[0].username?.[0]?.toUpperCase() || '1'}
              </div>
              <span className="text-sm font-black text-white truncate max-w-full block font-outfit tracking-wide">
                {topThree[0].username}
              </span>
              {topThree[0].equippedTitle ? (
                <span className="text-[9px] font-mono font-extrabold text-amber-300 uppercase tracking-wider block truncate max-w-full mt-0.5 flex items-center justify-center gap-1">
                  <Crown size={10} className="text-amber-300" />
                  <span>{getCleanTitle(topThree[0].equippedTitle)}</span>
                </span>
              ) : (
                <span className="text-[9px] font-mono text-amber-400/90 uppercase tracking-wider block font-bold">
                  REIGNING CHAMPION
                </span>
              )}
              <span className="text-sm font-black text-amber-300 font-outfit mt-1 tabular-nums tracking-wide">
                {sortBy === 'rp' ? `${topThree[0].rankPoints} RP` : `${topThree[0].totalXp.toLocaleString()} XP`}
              </span>
              {topThree[0].rankTier && (
                <span className="text-[9px] font-mono font-black uppercase text-amber-400 block mt-0.5">
                  {topThree[0].rankTier} DIVISION
                </span>
              )}
            </div>
          )}

          {/* 3rd Place Podium */}
          {topThree[2] ? (
            <div className="hud-panel p-3.5 flex flex-col items-center justify-end text-center rounded-2xl order-3 border-amber-800/60 shadow-lg relative group hover:border-amber-700 transition-all">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 font-black text-xs flex items-center justify-center mb-1.5 shadow">
                3
              </div>
              <div className="w-11 h-11 rounded-2xl bg-surface border border-amber-800/60 flex items-center justify-center text-base font-black text-amber-200 mb-1.5 shadow">
                {topThree[2].username?.[0]?.toUpperCase() || '3'}
              </div>
              <span className="text-xs font-black text-white truncate max-w-full block font-outfit">
                {topThree[2].username}
              </span>
              {topThree[2].equippedTitle && (
                <span className="text-[9px] font-mono font-bold text-slate-300 uppercase tracking-wider block truncate max-w-full mt-0.5 flex items-center justify-center gap-1">
                  <Crown size={10} className="text-slate-300" />
                  <span>{getCleanTitle(topThree[2].equippedTitle)}</span>
                </span>
              )}
              <span className="text-[11px] font-black font-outfit mt-1 tabular-nums text-neon">
                {sortBy === 'rp' ? `${topThree[2].rankPoints} RP` : `${topThree[2].totalXp.toLocaleString()} XP`}
              </span>
              {topThree[2].rankTier && (
                <span className="text-[9px] font-mono text-slate-400 block mt-0.5 uppercase">
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
              <div key={i} className="hud-panel h-16 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="hud-panel p-12 text-center text-slate-400 space-y-2">
            <Trophy size={36} className="mx-auto text-slate-600 mb-1" />
            <div className="font-black text-sm text-white uppercase tracking-wider font-outfit">No Athletes Ranked Yet</div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Complete verified workouts or competitive matches to establish your standing on the leaderboard!
            </p>
          </div>
        ) : (
          <div className="hud-panel p-2 space-y-1">
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
  </SportxBackground>
  );
}
