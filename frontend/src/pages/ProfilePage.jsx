import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'];
const GOALS = ['fitness', 'strength', 'endurance', 'weight_loss'];

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [bugForm, setBugForm] = useState({ category: 'ui_glitch', description: '' });
  const [showBug, setShowBug] = useState(false);
  const [submittingBug, setSubmittingBug] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name, collegeName: user.collegeName, department: user.department, fitnessLevel: user.fitnessLevel, fitnessGoal: user.fitnessGoal, availableTimeMinutes: user.availableTimeMinutes });
  }, [user]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile(form);
      await refreshUser();
      setEditing(false);
      showToast('✅ Profile updated!');
    } catch (e) { showToast(e.message, 'error'); } finally { setSaving(false); }
  };

  const submitBug = async (e) => {
    e.preventDefault(); setSubmittingBug(true);
    try {
      await api.reportBug({ ...bugForm, exerciseId: 'unknown', deviceModel: navigator.userAgent.slice(0, 40) });
      setBugForm({ category: 'ui_glitch', description: '' });
      setShowBug(false);
      showToast('🐛 Bug report submitted. Thank you!');
    } catch (e) { showToast(e.message, 'error'); } finally { setSubmittingBug(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="section">
      {/* Avatar Header */}
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 12px', boxShadow: 'var(--shadow-glow)' }}>
          {user?.name?.[0] || '👤'}
        </div>
        <h2>{user?.name}</h2>
        <p style={{ fontSize: 13, marginTop: 2 }}>{user?.collegeName} · {user?.department}</p>
        <div className="flex gap-8" style={{ justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <span className="stat-pill">⭐ {user?.totalXp?.toLocaleString() || 0} XP</span>
          <span className="stat-pill">🔥 {user?.currentStreak || 0} day streak</span>
        </div>
      </div>

      {/* Profile Form */}
      <div className="card">
        <div className="flex justify-between items-center" style={{ marginBottom: 14 }}>
          <h4>Profile Details</h4>
          <button className={`btn btn-sm ${editing ? 'btn-secondary' : 'btn-outline'}`}
            onClick={() => editing ? setEditing(false) : setEditing(true)}>
            {editing ? '✕ Cancel' : '✏️ Edit'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Full Name', key: 'name', type: 'text' },
            { label: 'College', key: 'collegeName', type: 'text' },
            { label: 'Department', key: 'department', type: 'text' },
          ].map(({ label, key, type }) => (
            <div key={key} className="form-group">
              <label>{label}</label>
              {editing ? (
                <input className="input" type={type} value={form[key] || ''} onChange={set(key)} />
              ) : (
                <div style={{ padding: '10px 0', fontSize: 15, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{form[key] || '—'}</div>
              )}
            </div>
          ))}
          {editing && (
            <>
              <div className="form-group">
                <label>Fitness Level</label>
                <select className="input" value={form.fitnessLevel || 'beginner'} onChange={set('fitnessLevel')}>
                  {FITNESS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Fitness Goal</label>
                <select className="input" value={form.fitnessGoal || 'fitness'} onChange={set('fitnessGoal')}>
                  {GOALS.map(g => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Daily Time: {form.availableTimeMinutes} min</label>
                <input type="range" min="10" max="60" step="5" value={form.availableTimeMinutes || 20}
                  onChange={set('availableTimeMinutes')} style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
              <button className="btn btn-primary btn-full" onClick={saveProfile} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bug Report */}
      <button className="btn btn-secondary btn-full" onClick={() => setShowBug(s => !s)}>
        🐛 Report a Bug
      </button>
      {showBug && (
        <div className="card scale-in">
          <h4 style={{ marginBottom: 12 }}>Report Issue</h4>
          <form onSubmit={submitBug} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="form-group">
              <label>Category</label>
              <select className="input" value={bugForm.category} onChange={e => setBugForm(b => ({ ...b, category: e.target.value }))}>
                {['ai_detection', 'camera_issue', 'ui_glitch', 'other'].map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="input" rows={3} value={bugForm.description} onChange={e => setBugForm(b => ({ ...b, description: e.target.value }))} placeholder="Describe what went wrong…" required style={{ resize: 'none' }} />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={submittingBug}>
              {submittingBug ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Submit Report'}
            </button>
          </form>
        </div>
      )}

      {/* Logout */}
      <button className="btn btn-danger btn-full" onClick={() => { logout(); navigate('/login'); }}>
        🚪 Sign Out
      </button>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
