import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GoalRing from '../components/GoalRing';
import StreakFlame from '../components/StreakFlame';
import ManualLogModal from '../components/ManualLogModal';
import { buildCameraRoute } from '../utils/exerciseUtils';
import PerformanceScoreCard from '../components/PerformanceScoreCard';
import ActiveGoalsCard from '../components/ActiveGoalsCard';
import GoalsModal from '../components/GoalsModal';
import FriendsModal from '../components/FriendsModal';
import FriendChallengeModal from '../components/FriendChallengeModal';
import type { WorkoutPlan, Badge, Friendship } from '../types';
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
  ChevronRight, 
  Award,
  Sparkles,
  Activity,
  Crown,
  Users
} from 'lucide-react';

import SportxBackground from '../components/SportxBackground';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayPlan, setTodayPlan] = useState<WorkoutPlan | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManualLog, setShowManualLog] = useState(false);

  // Step 7 Modals and Social State
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showFriendChallengeModal, setShowFriendChallengeModal] = useState(false);
  const [targetFriend, setTargetFriend] = useState<Friendship | null>(null);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  useEffect(() => {
    Promise.all([
      api.getTodayWorkout().catch(() => ({ data: null })),
      api.getBadges().catch(() => ({ data: [] })),
      api.getHistory('7d').catch(() => ({ data: [] })),
      api.getFriends().catch(() => ({ data: [] })),
      api.getFriendRequests().catch(() => ({ data: [] })),
    ])
      .then(([wp, bg, hist, fList, reqList]: any[]) => {
        setTodayPlan(wp?.data || null);
        setBadges((bg?.data || []).filter((b: Badge) => b.unlocked));
        setRecentSessions(Array.isArray(hist?.data) ? hist.data.slice(0, 3) : []);
        setFriendsCount(Array.isArray(fList?.data) ? fList.data.length : 0);
        setPendingRequestsCount(Array.isArray(reqList?.data) ? reqList.data.length : 0);
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
    <SportxBackground imageSrc="/images/bg-dashboard.jpg" overlayOpacity="normal">
      <div className="space-y-5 pb-8 animate-fade-in">
        {/* Master Tagline Banner matching Master Reference */}
        <div className="pt-2 pb-0.5 text-center flex items-center justify-center gap-2 text-[11px] font-black tracking-widest uppercase text-slate-300">
          <span className="text-white">Train</span>
          <span className="w-1.5 h-1.5 rounded-full bg-neon shadow-[0_0_6px_#CCFF00]" />
          <span className="text-white">Compete</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan shadow-[0_0_6px_#00F0FF]" />
          <span className="text-white">Be Better</span>
        </div>
      {/* ── Athlete Command Center Header ───────────────────── */}
      <header className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-slate-400 uppercase">
            <Zap size={15} className="text-neon fill-neon shadow-[0_0_8px_#CCFF00]" />
            <span className="tracking-wider">SPORT<span className="text-neon">X</span> COMMAND</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFriendsModal(true)}
              className="p-2 rounded-xl bg-surface hover:bg-surface-light border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer relative shadow-sm"
              title="Friends & Athletes"
            >
              <Users size={16} />
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan ring-2 ring-obsidian animate-pulse shadow-[0_0_6px_#00F0FF]" />
              )}
            </button>
            <button
              onClick={() => setShowManualLog(true)}
              className="p-2 rounded-xl bg-surface hover:bg-surface-light border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer shadow-sm"
              title="Log Manual Workout"
            >
              <PlusCircle size={16} />
            </button>
            <Link
              to="/profile"
              className="p-2 rounded-xl bg-surface hover:bg-surface-light border border-white/10 text-slate-300 hover:text-white transition-colors shadow-sm"
            >
              <Trophy size={16} className="text-amber-400" />
            </Link>
          </div>
        </div>

        {/* ── Athlete Telemetry Hub ── */}
        <div className="card-glass border border-white/10 p-4 sm:p-5 relative overflow-hidden shadow-2xl">
          {/* Ambient stadium lighting glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-neon/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="flex items-center gap-3">
              <Link to="/profile" className="relative group">
                <div className="w-13 h-13 rounded-2xl bg-gradient-hero p-0.5 shadow-glow transition-transform duration-200 group-hover:scale-105">
                  <div className="w-full h-full bg-obsidian rounded-[14px] flex items-center justify-center text-lg font-black text-white">
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
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-neon animate-pulse shadow-[0_0_6px_#CCFF00]" />
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

            {/* Active Title Banner (if equipped) */}
            {user?.equippedTitle && (
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:border-amber-400 transition shadow-sm"
              >
                <Crown size={11} className="text-amber-400" />
                <span>{user.equippedTitle.replace('title_', '').replace(/_/g, ' ').toUpperCase()}</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4 relative z-10 mt-3 pt-3 border-t border-white/5">
            <GoalRing progress={xpPct} size={64} strokeWidth={6} color="#CCFF00">
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

              {/* Authoritative Competitive Rank & Level */}
              <div className="flex justify-between items-center mt-2 text-[11px] text-slate-400 font-medium">
                <span>Rank: <strong className="text-amber-400 font-bold">{user?.rankTier || 'Bronze'}</strong> ({user?.rankPoints ?? 0} RP)</span>
                <span className="text-cyan font-semibold">
                  {(user?.rankPoints ?? 0) >= 1600 
                    ? 'Diamond Division' 
                    : `${Math.max(0, (user?.rankPoints ?? 0) < 400 ? 400 - (user?.rankPoints ?? 0) : (user?.rankPoints ?? 0) < 800 ? 800 - (user?.rankPoints ?? 0) : (user?.rankPoints ?? 0) < 1200 ? 1200 - (user?.rankPoints ?? 0) : 1600 - (user?.rankPoints ?? 0))} RP to Next Rank`}
                </span>
              </div>
            </div>
          </div>

          {/* Key Stat Badges Row */}
          <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-white/5 relative z-10">
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface/60 border border-white/5">
              <StreakFlame streak={streak} size="sm" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Streak</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface/60 border border-white/5">
              <div className="flex items-center gap-1 text-cyan font-black text-sm tabular-nums">
                <Zap size={14} className="fill-cyan/20" />
                <span>{xp > 999 ? `${(xp / 1000).toFixed(1)}k` : xp}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total XP</span>
            </div>

            <Link
              to="/badges"
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface/60 border border-white/5 hover:border-neon/40 hover:bg-surface transition group cursor-pointer"
            >
              <div className="flex items-center gap-1 text-amber-400 font-black text-sm tabular-nums group-hover:scale-105 transition">
                <Award size={14} />
                <span>{badges.length}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-neon uppercase tracking-wider mt-1 flex items-center gap-0.5">
                <span>Trophies</span>
                <ChevronRight size={10} />
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Today's Training Featured Routine ───────────────── */}
      <section className="space-y-2">
        <div className="flex justify-between items-center px-0.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles size={13} className="text-neon" />
            <span>Today's Featured Drill</span>
          </h2>
          <button
            onClick={() => navigate('/workout')}
            className="text-[11px] text-slate-400 hover:text-white font-semibold transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            <span>Browse Library</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {loading ? (
          <div className="card skeleton h-44" />
        ) : todayPlan ? (
          <div className="relative rounded-3xl overflow-hidden border border-neon/30 shadow-2xl group">
            {/* Background athletic photography with dark stadium overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105 pointer-events-none opacity-50"
              style={{ backgroundImage: `url('/images/bg-workout.jpg')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/85 to-obsidian/60 pointer-events-none" />

            <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-between min-h-[170px]">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-neon/20 text-neon border border-neon/40 shadow-sm">
                    <Dumbbell size={11} />
                    <span>Daily Vision Routine</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface/80 text-emerald-300 border border-emerald-500/30 capitalize">
                    {todayPlan.difficulty || 'All Levels'}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white tracking-tight leading-snug">
                  {todayPlan.title}
                </h3>
                {todayPlan.recommendationReason && (
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {todayPlan.recommendationReason}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="stat-pill text-xs">
                    <Clock size={12} className="text-slate-400" />
                    <span>{todayPlan.estimatedDurationMinutes || todayPlan.estimatedDuration || 15}m</span>
                  </span>
                  <span className="stat-pill text-xs">
                    <Activity size={12} className="text-slate-400" />
                    <span>{todayPlan.exercises?.length || 0} drills</span>
                  </span>
                </div>

                <button
                  className="btn btn-primary py-2.5 px-5 text-xs font-black shadow-glow flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    const firstEx = todayPlan.exercises?.[0]?.exerciseId || 'squat';
                    navigate(buildCameraRoute(todayPlan, firstEx));
                  }}
                >
                  <Play size={14} className="fill-current" />
                  <span>Launch Drill</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card text-center py-6 border border-white/5">
            <Dumbbell size={30} className="mx-auto text-slate-500 mb-2" />
            <h3 className="text-sm font-bold text-white">Daily Workout Drills</h3>
            <p className="text-xs text-slate-400 mt-1 mb-3">
              Explore custom routines calibrated to your sport or start free vision tracking.
            </p>
            <button
              onClick={() => navigate('/workout')}
              className="btn btn-primary btn-sm"
            >
              Open Workout Library
            </button>
          </div>
        )}
      </section>

      {/* ── Step 7: Athletic Performance Score & Active Goals ─── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PerformanceScoreCard
          compact
          onViewDetails={() => navigate('/progress')}
        />
        <ActiveGoalsCard
          onOpenGoalsModal={() => setShowGoalsModal(true)}
        />
      </section>

      {/* ── Arena Compete & AI Coach Cockpit ─────────────────── */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-0.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Swords size={13} className="text-amber-400" />
            <span>Multiplayer Arena & Intelligence</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Pillar 2: Arena Compete */}
          <div
            onClick={() => navigate('/lobby')}
            className="hud-panel-amber p-4 flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-sm">
                  <Swords size={18} />
                </div>
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                  Arena
                </span>
              </div>
              <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                Arena Battles
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Synchronized multiplayer camera rep battles.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-black text-amber-400">
              <span>Enter Arena</span>
              <ChevronRight size={13} className="transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Pillar 3: AI Coach */}
          <div
            onClick={() => navigate('/ai-coach')}
            className="hud-panel-cyan p-4 flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan/20 text-cyan flex items-center justify-center border border-cyan/40 shadow-sm">
                  <Bot size={18} />
                </div>
                <span className="text-[9px] font-black text-cyan uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan/15 border border-cyan/30">
                  Coach
                </span>
              </div>
              <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                AI Coach
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Google Gemini biomechanical cues & chat.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-black text-cyan">
              <span>Consult Coach</span>
              <ChevronRight size={13} className="transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>

        {/* Telemetry & Progress Strip */}
        <div
          onClick={() => navigate('/progress')}
          className="hud-panel-neon p-4 flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon/15 text-neon flex items-center justify-center border border-neon/30 flex-shrink-0 shadow-sm">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-white group-hover:text-neon transition-colors">
                  Telemetry & Progress Center
                </h3>
                <span className="text-[9px] font-black text-neon uppercase tracking-widest px-2 py-0.5 rounded-full bg-neon/15 border border-neon/30">
                  Analytics
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Track training volume, verified reps and XP progression.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-black text-neon flex-shrink-0 pl-2">
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </section>

      {/* ── Quick Vision Drills ──────────────────────────────── */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5 px-0.5">
          Quick Vision Drills
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Camera, label: 'Free Squat', path: '/camera/free/squat', color: 'text-neon', border: 'border-neon/30' },
            { icon: Dumbbell, label: 'Push-Ups', path: '/camera/free/pushup', color: 'text-cyan', border: 'border-cyan/30' },
            { icon: Trophy, label: 'Standings', path: '/leaderboard', color: 'text-amber-400', border: 'border-amber-500/30' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                className="card p-3 flex flex-col items-center justify-center gap-1.5 hover:border-white/20 transition-all cursor-pointer text-center"
              >
                <div className={`w-8 h-8 rounded-xl bg-surface flex items-center justify-center ${item.color} border ${item.border}`}>
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
        <div className="flex justify-between items-center mb-3 px-0.5">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-cyan" />
            <h2 className="text-sm font-black text-white tracking-tight uppercase">Recent Activity</h2>
          </div>
          <Link to="/progress" className="text-xs font-semibold text-slate-400 hover:text-cyan transition-colors flex items-center gap-0.5">
            <span>View All</span>
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
                  <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-neon border border-white/5">
                    <Dumbbell size={16} />
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

      {/* ── Unlocked Milestones Shelf ────────────────────────── */}
      {badges.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3 px-0.5">
            <Award size={16} className="text-amber-400" />
            <h2 className="text-sm font-black text-white tracking-tight uppercase">Unlocked Milestones</h2>
          </div>

          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {badges.map(b => (
              <div
                key={b.id}
                className="card py-3 px-3.5 flex items-center gap-2.5 flex-shrink-0 border border-white/10 bg-surface/50 max-w-[240px]"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 flex-shrink-0">
                  <Award size={18} />
                </div>
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

      {/* Step 7 Modals */}
      <GoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
      />
      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        onChallengeFriend={(friend) => {
          setTargetFriend(friend);
          setShowFriendChallengeModal(true);
        }}
        onFriendsUpdated={() => {
          api.getFriends().then((res: any) => setFriendsCount(res?.data?.length || 0)).catch(() => null);
          api.getFriendRequests().then((res: any) => setPendingRequestsCount(res?.data?.length || 0)).catch(() => null);
        }}
      />
      <FriendChallengeModal
        isOpen={showFriendChallengeModal}
        onClose={() => {
          setShowFriendChallengeModal(false);
          setTargetFriend(null);
        }}
        targetFriend={targetFriend}
      />
    </div>
    </SportxBackground>
  );
}
