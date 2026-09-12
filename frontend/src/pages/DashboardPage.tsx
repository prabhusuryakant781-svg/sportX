import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GoalRing from '../components/GoalRing';
import StreakFlame from '../components/StreakFlame';
import ManualLogModal from '../components/ManualLogModal';
import { buildCameraRoute } from '../utils/exerciseUtils';
import type { WorkoutPlan, Badge } from '../types';

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: string | number; accent?: string }) {
  return (
    <div className="card text-center flex-1">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-black" style={{ color: accent || '#F8FAFC' }}>{value}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayPlan, setTodayPlan] = useState<WorkoutPlan | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManualLog, setShowManualLog] = useState(false);

  useEffect(() => {
    Promise.all([api.getTodayWorkout(), api.getBadges()])
      .then(([wp, bg]: any[]) => {
        setTodayPlan(wp.data);
        setBadges((bg.data || []).filter((b: Badge) => b.unlocked));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const xp = user?.totalXp ?? 0;
  const streak = user?.currentStreak ?? 0;
  const nextMilestone = Math.ceil(xp / 500) * 500;
  const xpPct = Math.min(100, ((xp % 500) / 500) * 100);
  const greeting = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';

  return (
    <div>
      {/* Hero Header */}
      <div className="p-5 pb-4" style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.12) 0%, transparent 100%)' }}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-muted text-sm">Good {greeting} 👋</p>
            <h1 className="text-2xl font-extrabold text-white">{user?.name?.split(' ')[0] || 'Athlete'}</h1>
          </div>
          <Link to="/profile">
            <div className="w-11 h-11 rounded-full bg-gradient-hero flex items-center justify-center text-xl cursor-pointer hover:scale-105 transition-transform">
              {user?.name?.[0] || '👤'}
            </div>
          </Link>
        </div>

        {/* XP + Goal Ring */}
        <div className="flex items-center gap-4 mt-4">
          <GoalRing progress={xpPct} size={64} strokeWidth={5}>
            <span className="text-xs font-bold text-neon">{Math.round(xpPct)}%</span>
          </GoalRing>
          <div className="flex-1">
            <div className="flex justify-between mb-1.5">
              <span className="text-sm font-semibold">⭐ {xp.toLocaleString()} XP</span>
              <span className="text-xs text-muted">Next: {nextMilestone.toLocaleString()}</span>
            </div>
            <div className="xp-bar-track">
              <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stat Row */}
      <div className="flex gap-3 px-5 pb-4">
        <div className="card text-center flex-1">
          <StreakFlame streak={streak} size="sm" />
          <div className="text-[11px] text-muted mt-1">Streak</div>
        </div>
        <StatCard icon="⭐" label="Total XP" value={xp > 999 ? `${(xp / 1000).toFixed(1)}k` : xp} accent="#06B6D4" />
        <StatCard icon="🏅" label="Badges" value={badges.length} accent="#10B981" />
      </div>

      {/* Today's Workout */}
      <div className="section pt-0">
        <h3 className="text-white">Today's Workout</h3>
        {loading ? (
          <div className="card">
            <div className="skeleton h-5 w-3/5 mb-2" />
            <div className="skeleton h-4 w-2/5" />
          </div>
        ) : todayPlan ? (
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, #131B2E 100%)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-white">{todayPlan.title}</h3>
                <p className="text-sm mt-1">{todayPlan.recommendationReason}</p>
              </div>
              <span className="text-4xl">🏋️</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="stat-pill">⏱️ {todayPlan.estimatedDurationMinutes || todayPlan.estimatedDuration || 15} min</span>
              <span className="stat-pill">📋 {todayPlan.exercises?.length || 0} exercises</span>
              <span className="stat-pill">🎯 {todayPlan.difficulty}</span>
            </div>
            <button
              className="btn btn-primary btn-full mt-3"
              onClick={() => {
                const firstEx = todayPlan.exercises?.[0]?.exerciseId || 'squat';
                navigate(buildCameraRoute(todayPlan, firstEx));
              }}
            >
              🎬 Start Workout
            </button>
          </div>
        ) : null}

        {/* Competitive Mode Showcase */}
        <div 
          onClick={() => navigate('/competitive')}
          className="card cursor-pointer p-4 mb-4 rounded-2xl relative overflow-hidden transition hover:border-blue-500/50"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(147,51,234,0.15) 100%)', border: '1px solid rgba(99,102,241,0.3)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚔️</span>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">Global Matchmaking</span>
                <h4 className="text-base font-black text-white">Random Match Arena</h4>
                <p className="text-xs text-slate-300">Head-to-head verified sports challenges</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 text-white shadow-md">
              Battle →
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <h3 className="text-white">Quick Access</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '⚔️', label: 'Random Match', path: '/competitive' },
            { icon: '🏷️', label: 'Room Lobby', path: '/lobby' },
            { icon: '📋', label: 'All Plans', path: '/workout' },
            { icon: '📊', label: 'My Progress', path: '/progress' },
            { icon: '🏆', label: 'Leaderboard', path: '/leaderboard' },
            { icon: '📸', label: 'Free Camera', path: '/camera/free/squat' },
          ].map(a => (
            <button
              key={a.label}
              className="card cursor-pointer flex flex-col items-center gap-1.5 py-4 hover:border-neon/20"
              onClick={() => (a as any).action ? (a as any).action() : (a as any).path && navigate((a as any).path)}
            >
              <span className="text-3xl">{a.icon}</span>
              <span className="font-semibold text-sm text-white">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <>
            <h3 className="text-white">Badges Earned 🏅</h3>
            <div className="flex gap-2.5 flex-wrap">
              {badges.map(b => (
                <div key={b.id} className="card py-3 px-3.5 flex items-center gap-2 flex-shrink-0">
                  <span className="text-2xl">{b.icon}</span>
                  <div>
                    <div className="font-bold text-sm text-white">{b.name}</div>
                    <div className="text-[11px] text-muted">{b.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ManualLogModal isOpen={showManualLog} onClose={() => setShowManualLog(false)} />
    </div>
  );
}
