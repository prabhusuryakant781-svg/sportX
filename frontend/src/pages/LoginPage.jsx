import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', collegeName: '', department: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (tab === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await signup(form);
        navigate('/onboarding');
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    setLoading(true); setError('');
    try {
      await login({ email: 'demo@sportx.app', password: 'demo' });
      navigate('/dashboard');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>⚡</div>
        <h1 className="gradient-text" style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1px' }}>SportX</h1>
        <p className="text-muted" style={{ fontSize: 14, marginTop: 4 }}>AI Fitness for College Athletes</p>
      </div>

      {/* Card */}
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {['login', 'signup'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                background: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-muted)' }}>
              {t === 'login' ? '🔑 Login' : '🚀 Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'signup' && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input className="input" value={form.name} onChange={set('name')} placeholder="Aarav Sharma" required />
              </div>
              <div className="form-group">
                <label>College Name</label>
                <input className="input" value={form.collegeName} onChange={set('collegeName')} placeholder="Campus University" />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input className="input" value={form.department} onChange={set('department')} placeholder="Computer Science" />
              </div>
            </>
          )}
          <div className="form-group">
            <label>Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@college.edu" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
          </div>

          {error && <div style={{ color: 'var(--accent2)', fontSize: 13, padding: '8px 12px', background: 'rgba(255,107,107,0.1)', borderRadius: 8, border: '1px solid rgba(255,107,107,0.3)' }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : tab === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
          <div className="divider" style={{ flex: 1 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>or</span>
          <div className="divider" style={{ flex: 1 }} />
        </div>

        <button onClick={demoLogin} className="btn btn-secondary btn-full" disabled={loading}>
          🎯 Try Demo (no signup needed)
        </button>
      </div>
    </div>
  );
}
