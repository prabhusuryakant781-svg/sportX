import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Award,
  Lock,
  CheckCircle2,
  ChevronLeft,
  Filter,
  Sparkles,
  Trophy,
  Flame,
  Zap,
  Target,
  Swords,
  Shield,
  Activity,
} from 'lucide-react';

interface BadgeProgress {
  current: number;
  target: number;
  percentage: number;
}

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'workout' | 'streak' | 'reps' | 'form' | 'sports' | 'competitive' | 'xp' | string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  isMilestone?: boolean;
  xpReward?: number;
  unlocked: boolean;
  unlockedAt?: string | null;
  progress?: BadgeProgress | null;
}

const RARITY_THEMES: Record<string, { border: string; glow: string; badge: string; text: string; bg: string }> = {
  Common: {
    border: 'border-slate-700/60',
    glow: 'rgba(148, 163, 184, 0.1)',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    text: 'text-slate-300',
    bg: 'from-slate-900/40 to-slate-950/40',
  },
  Uncommon: {
    border: 'border-emerald-700/50',
    glow: 'rgba(52, 211, 153, 0.15)',
    badge: 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60',
    text: 'text-emerald-400',
    bg: 'from-emerald-950/20 to-slate-950/40',
  },
  Rare: {
    border: 'border-cyan-600/50',
    glow: 'rgba(34, 211, 238, 0.2)',
    badge: 'bg-cyan-950/70 text-cyan-400 border-cyan-700/60',
    text: 'text-cyan-400',
    bg: 'from-cyan-950/20 to-slate-950/40',
  },
  Epic: {
    border: 'border-purple-600/50',
    glow: 'rgba(192, 132, 252, 0.25)',
    badge: 'bg-purple-950/70 text-purple-300 border-purple-700/60',
    text: 'text-purple-300',
    bg: 'from-purple-950/20 to-slate-950/40',
  },
  Legendary: {
    border: 'border-amber-500/60',
    glow: 'rgba(251, 191, 36, 0.3)',
    badge: 'bg-amber-950/80 text-amber-300 border-amber-500/80 shadow-glow-sm',
    text: 'text-amber-400',
    bg: 'from-amber-950/20 to-slate-950/40',
  },
};

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Award },
  { id: 'workout', label: 'Workout', icon: Activity },
  { id: 'streak', label: 'Streak', icon: Flame },
  { id: 'reps', label: 'Reps', icon: Zap },
  { id: 'form', label: 'Form', icon: Target },
  { id: 'competitive', label: 'Competitive', icon: Swords },
  { id: 'xp', label: 'Progression', icon: Trophy },
  { id: 'sports', label: 'Sports', icon: Shield },
];

export default function BadgesPage() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [summary, setSummary] = useState({ totalAvailable: 0, totalUnlocked: 0, completionPercentage: 0 });

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    setLoading(true);
    try {
      const res: any = await api.getBadges();
      if (res?.success && Array.isArray(res.data)) {
        setBadges(res.data);
        if (res.summary) {
          setSummary(res.summary);
        } else {
          const total = res.data.length;
          const unlocked = res.data.filter((b: BadgeItem) => b.unlocked).length;
          setSummary({
            totalAvailable: total,
            totalUnlocked: unlocked,
            completionPercentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load badges:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBadges = badges.filter((b) => {
    if (selectedCategory !== 'all' && b.category !== selectedCategory) {
      return false;
    }
    if (statusFilter === 'unlocked' && !b.unlocked) {
      return false;
    }
    if (statusFilter === 'locked' && b.unlocked) {
      return false;
    }
    return true;
  });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5 pb-12 animate-fade-in max-w-4xl mx-auto px-1">
      {/* Top Navigation Bar */}
      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition py-1 px-2 rounded-lg bg-slate-900/60 border border-slate-800"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>
        <span className="text-[11px] font-black uppercase tracking-widest text-neon">
          Progression & Trophy Room
        </span>
      </div>

      {/* Hero Showcase Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-black border border-slate-800 p-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-neon/10 border border-neon/30 text-neon mb-2">
              <Sparkles size={12} />
              <span>Athlete Trophy Cabinet</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Achievements & Milestones
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
              Complete verified workouts, accumulate repetitions, and conquer competitive arenas to earn rare trophies and athlete titles.
            </p>
          </div>

          {/* Progress Stat Ring */}
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 shrink-0 shadow-inner">
            <div className="relative flex items-center justify-center w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-neon transition-all duration-1000 ease-out"
                  strokeDasharray={`${summary.completionPercentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-black text-white">
                {summary.completionPercentage}%
              </span>
            </div>
            <div>
              <div className="text-lg font-black text-white leading-tight">
                {summary.totalUnlocked} <span className="text-xs font-normal text-slate-500">/ {summary.totalAvailable}</span>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Unlocked
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-3">
        {/* Status Toggle (All / Unlocked / Locked) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800/80 w-fit">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === 'all'
                ? 'bg-neon text-black shadow-glow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({badges.length})
          </button>
          <button
            onClick={() => setStatusFilter('unlocked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'unlocked'
                ? 'bg-neon text-black shadow-glow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>Unlocked ({summary.totalUnlocked})</span>
          </button>
          <button
            onClick={() => setStatusFilter('locked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'locked'
                ? 'bg-neon text-black shadow-glow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock size={13} />
            <span>Locked ({Math.max(0, summary.totalAvailable - summary.totalUnlocked)})</span>
          </button>
        </div>

        {/* Categories Horizontal Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border shrink-0 ${
                  active
                    ? 'bg-slate-800 text-neon border-neon/50 shadow-glow-sm'
                    : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                <Icon size={14} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Badges Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredBadges.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <Award size={40} className="mx-auto text-slate-600 mb-2" />
          <h3 className="text-base font-bold text-white">No Achievements Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {statusFilter === 'unlocked'
              ? 'You have not unlocked any achievements in this category yet. Keep training!'
              : 'No achievements match your selected filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredBadges.map((badge) => {
            const rarity = badge.rarity || 'Common';
            const theme = RARITY_THEMES[rarity] || RARITY_THEMES.Common;

            return (
              <div
                key={badge.id}
                className={`relative overflow-hidden rounded-2xl border p-4 transition duration-200 flex flex-col justify-between bg-gradient-to-br ${
                  badge.unlocked
                    ? `${theme.bg} ${theme.border} hover:scale-[1.01]`
                    : 'from-slate-950/80 to-slate-900/40 border-slate-800/70 opacity-80'
                }`}
                style={{
                  boxShadow: badge.unlocked ? `0 4px 20px ${theme.glow}` : undefined,
                }}
              >
                {/* Milestone Ribbon */}
                {badge.isMilestone && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-black font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-bl-lg shadow-sm">
                    Milestone
                  </div>
                )}

                <div>
                  <div className="flex items-start gap-3.5">
                    {/* Badge Icon Frame */}
                    <div
                      className={`relative flex items-center justify-center w-14 h-14 rounded-xl border shrink-0 text-3xl select-none ${
                        badge.unlocked
                          ? `${theme.border} bg-slate-900/80 shadow-md`
                          : 'border-slate-800 bg-slate-950 text-slate-600 grayscale'
                      }`}
                    >
                      <span>{badge.icon}</span>
                      {!badge.unlocked && (
                        <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                          <Lock size={16} className="text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            badge.unlocked ? theme.badge : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                        >
                          {rarity}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                          {badge.category}
                        </span>
                      </div>

                      <h3
                        className={`text-sm font-black tracking-tight truncate ${
                          badge.unlocked ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {badge.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer: Progress Bar or Unlock Timestamp */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-800/80">
                  {badge.unlocked ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <CheckCircle2 size={13} />
                        <span>{badge.unlockedAt ? `Unlocked ${formatDate(badge.unlockedAt)}` : 'Completed'}</span>
                      </span>
                      {badge.xpReward && (
                        <span className="text-neon font-black tracking-wider text-[10px]">
                          +{badge.xpReward} XP
                        </span>
                      )}
                    </div>
                  ) : badge.progress ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-400 uppercase tracking-wider">Progress</span>
                        <span className="text-slate-300">
                          {badge.progress.current} / {badge.progress.target} ({badge.progress.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-neon to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${badge.progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Lock size={12} />
                        <span>Locked</span>
                      </span>
                      {badge.xpReward && (
                        <span className="text-slate-500 font-bold text-[10px]">
                          +{badge.xpReward} XP Reward
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
