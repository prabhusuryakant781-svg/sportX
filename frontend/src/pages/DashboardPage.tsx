import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GoalRing from '../components/GoalRing';
import StreakFlame from '../components/StreakFlame';
import ManualLogModal from '../components/ManualLogModal';
import { buildCameraRoute } from '../utils/exerciseUtils';
import type { WorkoutPlan, Badge } from '../types';
import { 
  Zap, 
  Swords, 
  Bot, 
  Dumbbell, 
  TrendingUp, 
  Trophy, 
  PlusCircle, 
  Camera, 
  Play, 
  Clock, 
  Flame, 
  ChevronRight, 
  Award,
  Sparkles,
  Activity
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayPlan, setTodayPlan] = useState<WorkoutPlan | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManualLog, setShowManualLog] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getTodayWorkout().catch(() => ({ data: null })),
      api.getBadges().catch(() => ({ data: [] })),
      api.getHistory('7d').catch(() => ({ data: [] }))
    ])
      .then(([wp, bg, hist]: any[]) => {
        setTodayPlan(wp?.data || null);
        setBadges((bg?.data || []).filter((b: Badge) => b.unlocked));
        setRecentSessions(Array.isArray(hist?.data) ? hist.data.slice(0, 3) : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const xp = user?.totalXp ?? 0;
  const streak = user?.currentStreak ?? 0;
  const athleteLevel = user?.level || Math.max(1, Math.floor(xp / 500) + 1);
  const nextMilestone = Math.ceil((xp + 1) / 500) * 500;
  const xpPct = Math.min(100, Math.max(5, ((xp % 500) / 500) * 100));
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'Athlete';

  return (
    <div className="space-y-5 pb-8 animate-fade-in">
      {/* ── Athlete Profile Header ─────────────────────────── */}
      <header className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-slate-400 uppercase">
            <Zap size={14} className="text-neon fill-neon" />
            <span>SPORT<span className="text-neon">X</span> ARENA</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualLog(true)}
              className="p-2 rounded-xl bg-surface/60 hover:bg-surface border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Log Manual Workout"
            >
              <PlusCircle size={16} />
            </button>
            <Link
              to="/profile"
              className="p-2 rounded-xl bg-surface/60 hover:bg-surface border border-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <Trophy size={16} className="text-amber-400" />
            </Link>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/profile" className="relative group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-hero p-0.5 shadow-glow-sm transition-transform duration-200 group-hover:scale-105">
                <div className="w-full h-full bg-obsidian rounded-[14px] flex items-center justify-center text-base font-black text-white">
                  {user?.name?.[0]?.toUpperCase() || 'A'}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-neon text-obsidian text-[9px] font-black border border-obsidian">
                L{athleteLevel}
              </span>
            </Link>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">{greeting}</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                {firstName}
                {user?.collegeName && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface text-slate-300 border border-white/5">
                    {user.collegeName}
                  </span>
                )}
              </h1>
            </div>
          </div>
        </div>

        {/* ── Athlete Performance Hub Card ─────────────────────── */}
        <div className="mt-4 card-glass border border-white/10 p-4 sm:p-5 relative overflow-hidden shadow-card">
          <div className="absolute top-0 right-0 w-48 h-48 bg-neon/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <GoalRing progress={xpPct} size={68} strokeWidth={6} color="#10B981">
              <span className="text-xs font-black tabular-nums text-neon">
                {Math.round(xpPct)}%
              </span>
            </GoalRing>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-white tabular-nums">
                    {xp.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-neon uppercase tracking-wider">XP</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                  Next: {nextMilestone.toLocaleString()} XP
                </span>
              </div>

              {/* Glowing XP Progress Bar */}
              <div className="xp-bar-track mt-1.5">
                <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
              </div>

              <div className="flex justify-between items-center mt-2 text-[11px] text-slate-400 font-medium">
                <span>Rank Tier: Athlete</span>
                <span className="text-cyan font-semibold">Level {athleteLevel}</span>
              </div>
            </div>
          </div>

          {/* Key Stat Badges Row */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-white/5 relative z-10">
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface/40 border border-white/5">
              <StreakFlame streak={streak} size="sm" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Streak</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface/40 border border-white/5">
              <div className="flex items-center gap-1 text-cyan font-black text-sm tabular-nums">
                <Zap size={14} className="fill-cyan/20" />
                <span>{xp > 999 ? `${(xp / 1000).toFixed(1)}k` : xp}</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Total XP</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface/40 border border-white/5">
              <div className="flex items-center gap-1 text-amber-400 font-black text-sm tabular-nums">
                <Award size={14} />
                <span>{badges.length}</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Badges</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── The 4 Pillars of SportX ───────────────────────────── */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-0.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles size={13} className="text-neon" />
            <span>SportX Core Pillars</span>
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">4 Athletic Modules</span>
        </div>

        {/* Pillar 1: WORKOUT (Featured Daily Workout) */}
        {loading ? (
          <div className="card skeleton h-40" />
        ) : todayPlan ? (
          <div className="card-pillar-workout p-5 relative overflow-hidden shadow-card">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-3">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-neon/15 text-neon border border-neon/30 mb-2">
                  <Dumbbell size={11} />
                  <span>Pillar I • Workout</span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight leading-snug">
                  {todayPlan.title}
                </h3>
                {todayPlan.recommendationReason && (
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
                    {todayPlan.recommendationReason}
                  </p>
                )}
              </div>

              <div className="w-11 h-11 rounded-2xl bg-neon/15 border border-neon/30 flex items-center justify-center text-neon flex-shrink-0 shadow-glow-sm">
                <Activity size={22} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3.5">
              <span className="stat-pill text-xs">
                <Clock size={12} className="text-slate-400" />
                <span>{todayPlan.estimatedDurationMinutes || todayPlan.estimatedDuration || 15} mins</span>
              </span>
              <span className="stat-pill text-xs">
                <Dumbbell size={12} className="text-slate-400" />
                <span>{todayPlan.exercises?.length || 0} drills</span>
              </span>
              <span className="stat-pill text-xs font-semibold capitalize text-emerald-300">
                🎯 {todayPlan.difficulty}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                className="btn btn-primary flex-1 py-3 flex items-center justify-center gap-2 font-black shadow-glow"
                onClick={() => {
                  const firstEx = todayPlan.exercises?.[0]?.exerciseId || 'squat';
                  navigate(buildCameraRoute(todayPlan, firstEx));
                }}
              >
                <Play size={15} className="fill-current" />
                <span>Launch Workout</span>
              </button>
              <button
                onClick={() => navigate('/workout')}
                className="btn btn-secondary px-3.5 py-3 text-xs"
                title="Browse all routines"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="card text-center py-6 border border-white/5">
            <Dumbbell size={30} className="mx-auto text-slate-500 mb-2" />
            <h3 className="text-sm font-bold text-white">Daily Workout Drills</h3>
            <p className="text-xs text-slate-400 mt-1 mb-3">
              Explore custom routines calibrated to your sport or start free tracking.
            </p>
            <button
              onClick={() => navigate('/workout')}
              className="btn btn-primary btn-sm"
            >
              Open Workout Library
            </button>
          </div>
        )}

        {/* Pillars 2 & 3: COMPETE & AI COACH */}
        <div className="grid grid-cols-2 gap-3">
          {/* Pillar 2: Compete */}
          <div
            onClick={() => navigate('/lobby')}
            className="card-pillar-compete p-4 flex flex-col justify-between group shadow-card"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Swords size={18} />
                </div>
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
                  Pillar II
                </span>
              </div>
              <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                Arena Compete
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Synchronized multiplayer camera rep battles.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-400">
              <span>Enter Arena</span>
              <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>

          {/* Pillar 3: AI Coach */}
          <div
            onClick={() => navigate('/ai-coach')}
            className="card-pillar-ai p-4 flex flex-col justify-between group shadow-card"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan/15 text-cyan flex items-center justify-center border border-cyan/30">
                  <Bot size={18} />
                </div>
                <span className="text-[9px] font-black text-cyan uppercase tracking-wider px-1.5 py-0.2 rounded bg-cyan/10 border border-cyan/20">
                  Pillar III
                </span>
              </div>
              <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                AI Coach
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Google Gemini biomechanical cues & chat.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-cyan">
              <span>Consult Coach</span>
              <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>

        {/* Pillar 4: PROGRESS */}
        <div
          onClick={() => navigate('/progress')}
          className="card-pillar-progress p-4 flex items-center justify-between group shadow-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface text-cyan flex items-center justify-center border border-white/10 flex-shrink-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-white group-hover:text-cyan transition-colors">
                  Telemetry & Progress
                </h3>
                <span className="text-[9px] font-black text-cyan uppercase tracking-wider px-1.5 py-0.2 rounded bg-cyan/10 border border-cyan/20">
                  Pillar IV
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Track volume analytics, verified reps and XP progression.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-cyan flex-shrink-0 pl-2">
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </section>

      {/* ── Quick Access Fast Commands ───────────────────────── */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5 px-0.5">
          Quick Vision Drills
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Camera, label: 'Free Squat', path: '/camera/free/squat', color: 'text-neon' },
            { icon: Dumbbell, label: 'Push-Ups', path: '/camera/free/pushup', color: 'text-cyan' },
            { icon: Trophy, label: 'Standings', path: '/leaderboard', color: 'text-amber-400' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                className="card p-3 flex flex-col items-center justify-center gap-1.5 hover:border-white/20 transition-all cursor-pointer text-center"
              >
                <div className={`w-8 h-8 rounded-xl bg-surface flex items-center justify-center ${item.color}`}>
                  <Icon size={16} />
                </div>
                <span className="text-xs font-bold text-white tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Recent Activity / History ────────────────────────── */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-cyan" />
            <h2 className="text-base font-black text-white tracking-tight">Recent Activity</h2>
          </div>
          <Link to="/progress" className="text-xs font-semibold text-slate-400 hover:text-cyan transition-colors flex items-center gap-0.5">
            <span>History</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="card skeleton h-24" />
        ) : recentSessions.length > 0 ? (
          <div className="space-y-2">
            {recentSessions.map((session, idx) => (
              <div key={session.id || idx} className="card p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-neon">
                    {session.sportId ? '🏅' : <Dumbbell size={16} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white capitalize">
                      {session.sportName || session.exerciseId?.replace(/_/g, ' ') || 'Workout Session'}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {new Date(session.completedAt || session.loggedAt || Date.now()).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })} • {session.durationMinutes || Math.round((session.durationSeconds || 0) / 60)} min
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-neon tabular-nums">
                    +{session.xpAwarded || session.xp || 0} XP
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-4 text-center border border-white/5">
            <p className="text-xs text-slate-400">
              No sessions completed this week. Start a workout to ignite your streak!
            </p>
          </div>
        )}
      </section>

      {/* ── Earned Badges Shelf ─────────────────────────────── */}
      {badges.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} className="text-amber-400" />
            <h2 className="text-base font-black text-white tracking-tight">Unlocked Milestones</h2>
          </div>

          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {badges.map(b => (
              <div
                key={b.id}
                className="card py-3 px-3.5 flex items-center gap-2.5 flex-shrink-0 border border-white/10 bg-surface/50 max-w-[240px]"
              >
                <span className="text-2xl flex-shrink-0">{b.icon || '🏅'}</span>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-white truncate">{b.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Manual Activity Log Modal */}
      <ManualLogModal isOpen={showManualLog} onClose={() => setShowManualLog(false)} />
    </div>
  );
}
