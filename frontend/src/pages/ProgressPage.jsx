import { useState, useEffect } from 'react';
import { api } from '../services/api.js';

const PERIOD_LABELS = { today: 'Today', '7d': 'This Week', '30d': 'This Month', all: 'All Time' };

export default function ProgressPage() {
  const [tab, setTab] = useState('history'); // history | badges | leaderboard
  const [period, setPeriod] = useState('7d');
  const [history, setHistory] = useState([]);
  const [badges, setBadges] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const calls = {
      history: api.getHistory(period).then(r => setHistory(r.data)),
      badges: api.getBadges().then(r => setBadges(r.data)),
      leaderboard: api.getGlobalLeaderboard().then(r => setLeaders(r.data)),
    };
    Promise.all(Object.values(calls)).catch(console.error).finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="section">
      <h1>Progress 📊</h1>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
        {[['history', '📋 History'], ['badges', '🏅 Badges'], ['leaderboard', '🏆 Ranks']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 12, borderRadius: 8, transition: 'all 0.2s',
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── History Tab ── */}
      {tab === 'history' && (
        <>
          <div className="chip-grid">
            {Object.entries(PERIOD_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setPeriod(k)} className={`chip${period === k ? ' selected' : ''}`}>{v}</button>
            ))}
          </div>
          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72 }} />)
          ) : history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏋️</div>
              <h3>No workouts yet</h3>
              <p>Complete your first workout to see it here!</p>
            </div>
          ) : history.map(s => (
            <div key={s.id} className="card flex gap-12 items-center">
              <div style={{ fontSize: 32 }}>💪</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.exerciseId.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(s.completedAt).toLocaleDateString()} · {s.reps} reps · {s.formScore}% form
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>+{s.xpEarned}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>XP</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Badges Tab ── */}
      {tab === 'badges' && (
        <>
          {loading ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80 }} />) :
            badges.map(b => (
              <div key={b.id} className="card flex items-center gap-12" style={{ opacity: b.unlocked ? 1 : 0.4, filter: b.unlocked ? 'none' : 'grayscale(1)' }}>
                <div style={{ fontSize: 36 }}>{b.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</div>
                  <p style={{ fontSize: 12, margin: 0 }}>{b.description}</p>
                </div>
                {b.unlocked
                  ? <span className="badge-pill">✅ Earned</span>
                  : <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>🔒 Locked</span>}
              </div>
            ))
          }
        </>
      )}

      {/* ── Leaderboard Tab ── */}
      {tab === 'leaderboard' && (
        <div className="card" style={{ padding: '8px 16px' }}>
          {loading ? [...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8 }} />) :
            leaders.map(p => (
              <div key={p.userId} className="lb-row">
                <div className="lb-rank" style={{ color: p.rank === 1 ? 'var(--accent3)' : p.rank === 2 ? '#94A3B8' : p.rank === 3 ? '#CD7F32' : 'var(--text-muted)' }}>
                  {p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank - 1] : p.rank}
                </div>
                <div className="lb-avatar">{p.avatar || p.name?.[0]}</div>
                <div style={{ flex: 1 }}>
                  <div className="lb-name">{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.collegeName} · 🔥{p.currentStreak}d</div>
                </div>
                <div className="lb-xp">{p.totalXp?.toLocaleString()} XP</div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
