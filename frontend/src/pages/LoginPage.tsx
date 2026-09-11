import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, signup, loginWithGoogle, isFirebaseReady } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', collegeName: '', department: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (tab === 'login') {
        await login({ email: form.email, password: form.password });
        navigate('/dashboard');
      } else {
        await signup(form as any);
        navigate('/onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true); setError('');
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-2">⚡</div>
        <h1 className="gradient-text text-4xl font-black tracking-tight">SportX</h1>
        <p className="text-muted text-sm mt-1">AI Fitness for College Athletes</p>
      </div>

      {/* Card */}
      <div className="card w-full max-w-[400px]">
        {!isFirebaseReady && (
          <div className="text-amber-400 text-xs p-3 mb-4 bg-amber-500/10 rounded-lg border border-amber-500/30 leading-relaxed">
            ℹ️ <strong>Firebase Client Setup Required:</strong> To sign in, configure <code>VITE_FIREBASE_API_KEY</code> and <code>VITE_FIREBASE_APP_ID</code> in Vercel project settings.
          </div>
        )}
        {/* Tab Toggle */}
        <div className="flex rounded-lg p-1 mb-6" style={{ background: '#1F2937' }}>
          {(['login', 'signup'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2.5 rounded-md border-none cursor-pointer font-outfit font-semibold text-sm transition-all ${
                tab === t
                  ? 'bg-gradient-hero text-white'
                  : 'bg-transparent text-muted'
              }`}
            >
              {t === 'login' ? '🔑 Login' : '🚀 Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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

          {error && (
            <div className="text-crimson text-sm p-2 bg-crimson/10 rounded-lg border border-crimson/30">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner w-4 h-4" /> : tab === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          className="btn btn-secondary btn-full mt-3"
          disabled={loading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
