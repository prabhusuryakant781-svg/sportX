import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="card" style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: accent || 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [todayPlan, setTodayPlan] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getTodayWorkout(), api.getBadges()])
      .then(([wp, bg]) => { setTodayPlan(wp.data); setBadges(bg.data.filter(b => b.unlocked)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const xp = user?.totalXp ?? 0;
  const streak = user?.currentStreak ?? 0;
  const nextMilestone = Math.ceil(xp / 500) * 500;
  const xpPct = Math.min(100, ((xp % 500) / 500) * 100);

  return (
    <div>
      {/* Hero Header */}
      <div style={{ background: 'linear-gradient(180deg, rgba(108,99,255,0.15) 0%, transparent 100%)', padding: '24px 20px 16px' }}>
        <div className="flex justify-between items-center">
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} 👋</p>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>{user?.name?.split(' ')[0] || 'Athlete'}</h1>
          </div>
          <Link to="/profile">
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer' }}>
              {user?.name?.[0] || '👤'}
            </div>
          </Link>
        </div>

        {/* XP Progress Bar */}
        <div style={{ marginTop: 16 }}>
          <div className="flex justify-between" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>⭐ {xp.toLocaleString()} XP</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Next: {nextMilestone.toLocaleString()}</span>
          </div>
          <div className="xp-bar-track">
            <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>

      {/* Stat Row */}
      <div className="flex gap-12" style={{ padding: '0 20px 16px' }}>
        <StatCard icon="🔥" label="Streak" value={`${streak}d`} accent="var(--accent2)" />
        <StatCard icon="⭐" label="Total XP" value={xp > 999 ? `${(xp/1000).toFixed(1)}k` : xp} accent="var(--accent3)" />
        <StatCard icon="🏅" label="Badges" value={badges.length} accent="var(--accent)" />
      </div>

      {/* AI Coach Banner Card */}
      <div style={{ padding: '0 20px 16px' }}>
        <div
          className="card"
          onClick={() => navigate('/ai-coach')}
          style={{
            cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(108,99,255,0.22) 0%, rgba(255,107,107,0.12) 100%)',
            border: '1px solid rgba(108,99,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'var(--gradient-hero)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                boxShadow: '0 4px 14px var(--accent-glow)',
                flexShrink: 0,
              }}
            >
              🤖
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
                AI Coach
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Get personalized sports guidance & feedback
              </div>
            </div>
          </div>
          <span style={{ fontSize: 20, color: 'var(--accent)', fontWeight: 'bold' }}>➔</span>
        </div>
      </div>

      {/* Today's Plan */}
      <div className="section" style={{ paddingTop: 0 }}>
        <h3>Today's Workout</h3>
        {loading ? (
          <div className="card">
            <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: '40%' }} />
          </div>
        ) : todayPlan ? (
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, var(--bg-card) 100%)', border: '1px solid rgba(108,99,255,0.3)' }}>
            <div className="flex justify-between items-center">
              <div>
                <h3 style={{ color: 'var(--text-primary)' }}>{todayPlan.title}</h3>
                <p style={{ fontSize: 13, marginTop: 4 }}>{todayPlan.recommendationReason}</p>
              </div>
              <div style={{ fontSize: 36 }}>🏋️</div>
            </div>
            <div className="flex gap-8" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <span className="stat-pill">⏱️ {todayPlan.estimatedDurationMinutes} min</span>
              <span className="stat-pill">📋 {todayPlan.exercises?.length} exercises</span>
              <span className="stat-pill">🎯 {todayPlan.difficulty}</span>
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop: 14 }}
              onClick={() => navigate(`/camera/${todayPlan.id}/${todayPlan.exercises[0]?.exerciseId || 'squat'}`)}>
              🎬 Start Workout
            </button>
          </div>
        ) : null}

        {/* Quick Actions */}
        <h3>Quick Access</h3>
        <div className="grid-2">
          {[
            { icon: '📋', label: 'All Plans', path: '/workout' },
            { icon: '📊', label: 'My Progress', path: '/progress' },
            { icon: '⚡', label: 'Challenges', path: '/challenges' },
            { icon: '🏆', label: 'Leaderboard', path: '/progress' },
          ].map(a => (
            <button key={a.path + a.label} className="card" onClick={() => navigate(a.path)}
              style={{ cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 16 }}>
              <span style={{ fontSize: 32 }}>{a.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* Recent Badges */}
        {badges.length > 0 && (
          <>
            <h3>Badges Earned 🏅</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {badges.map(b => (
                <div key={b.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
                  <span style={{ fontSize: 24 }}>{b.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
