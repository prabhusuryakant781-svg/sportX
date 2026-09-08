import { useState, useEffect } from 'react';
import { api } from '../services/api.js';

const EXERCISES = ['squat', 'pushup', 'bicep_curl', 'plank', 'jumping_jacks'];
const SAMPLE_OPPONENTS = [
  { userId: 'u4', name: 'Rohan Verma' },
  { userId: 'u5', name: 'Anika Singh' },
  { userId: 'u7', name: 'Shreya Gupta' },
];

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ challengeeId: 'u4', exerciseId: 'pushup', targetReps: 20 });
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.getChallenges().then(r => setChallenges(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const createChallenge = async (e) => {
    e.preventDefault(); setCreating(true);
    try {
      const r = await api.createChallenge({ ...form, targetReps: Number(form.targetReps) });
      setChallenges(c => [r.data, ...c]);
      setShowCreate(false);
      showToast('⚡ Challenge sent!');
    } catch (err) { showToast(err.message, 'error'); } finally { setCreating(false); }
  };

  const respond = async (id, action) => {
    try {
      await api.respondChallenge(id, action);
      setChallenges(cs => cs.map(c => c.id === id ? { ...c, status: action === 'accept' ? 'active' : 'declined' } : c));
      showToast(action === 'accept' ? '✅ Challenge accepted!' : '❌ Challenge declined');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const STATUS_STYLE = {
    pending: { color: 'var(--accent3)', bg: 'rgba(255,217,61,0.1)' },
    active: { color: 'var(--accent4)', bg: 'rgba(107,203,119,0.1)' },
    declined: { color: 'var(--accent2)', bg: 'rgba(255,107,107,0.1)' },
    completed: { color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' },
  };

  return (
    <div className="section">
      <div className="flex justify-between items-center">
        <div>
          <h1>Challenges ⚡</h1>
          <p style={{ fontSize: 14, marginTop: 4 }}>Challenge friends to workout battles!</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(s => !s)}>
          {showCreate ? '✕ Close' : '+ Challenge'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card scale-in" style={{ border: '1px solid rgba(108,99,255,0.4)' }}>
          <h4 style={{ marginBottom: 12 }}>⚔️ New Challenge</h4>
          <form onSubmit={createChallenge} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="form-group">
              <label>Challenge</label>
              <select className="input" value={form.challengeeId} onChange={e => setForm(f => ({ ...f, challengeeId: e.target.value }))}>
                {SAMPLE_OPPONENTS.map(o => <option key={o.userId} value={o.userId}>{o.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Exercise</label>
              <select className="input" value={form.exerciseId} onChange={e => setForm(f => ({ ...f, exerciseId: e.target.value }))}>
                {EXERCISES.map(ex => <option key={ex} value={ex}>{ex.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Target Reps: {form.targetReps}</label>
              <input type="range" min="5" max="50" step="5" value={form.targetReps}
                onChange={e => setForm(f => ({ ...f, targetReps: e.target.value }))}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={creating}>
              {creating ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : '⚡ Send Challenge!'}
            </button>
          </form>
        </div>
      )}

      {/* Challenge List */}
      {loading ? (
        [...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)
      ) : challenges.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚡</div>
          <h3>No challenges yet</h3>
          <p>Challenge a friend to see who can do more reps!</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Start a Challenge</button>
        </div>
      ) : challenges.map(c => {
        const s = STATUS_STYLE[c.status] || STATUS_STYLE.pending;
        return (
          <div key={c.id} className="card">
            <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                vs. {c.challengeeName || 'Opponent'}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, padding: '3px 8px', borderRadius: 100 }}>
                {c.status}
              </span>
            </div>
            <div className="flex gap-8" style={{ marginBottom: c.status === 'pending' ? 12 : 0, flexWrap: 'wrap' }}>
              <span className="stat-pill" style={{ fontSize: 12 }}>💪 {c.exerciseId?.replace(/_/g,' ')}</span>
              <span className="stat-pill" style={{ fontSize: 12 }}>🎯 {c.targetReps} reps</span>
              <span className="stat-pill" style={{ fontSize: 12 }}>📅 Expires {new Date(c.expiresAt).toLocaleDateString()}</span>
            </div>
            {c.status === 'pending' && c.challengeeId !== 'demo_student_01' && (
              <div className="flex gap-8">
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => respond(c.id, 'decline')}>✕ Decline</button>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => respond(c.id, 'accept')}>✓ Accept</button>
              </div>
            )}
          </div>
        );
      })}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
