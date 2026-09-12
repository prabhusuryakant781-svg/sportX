import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2, Lock, Mail, User, School, BookOpen } from 'lucide-react';

export default function LoginPage() {
  const { login, signup, loginWithGoogle, resetPassword, isFirebaseReady } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', collegeName: '', department: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await login({ email: form.email, password: form.password });
        navigate('/dashboard');
      } else {
        await signup(form as any);
        navigate('/onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    setInfoMessage('');
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!form.email) {
      setError('Please enter your email address to receive a password reset link.');
      return;
    }
    setLoading(true);
    setError('');
    setInfoMessage('');
    try {
      await resetPassword(form.email);
      setInfoMessage('Password reset email sent! Please check your inbox.');
      setShowForgot(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-neon/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-cyan/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-6 relative z-10 animate-fade-in">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-hero p-0.5 shadow-glow mb-3">
          <div className="w-full h-full bg-obsidian rounded-[14px] flex items-center justify-center">
            <Zap className="text-neon" size={28} />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          SPORT<span className="text-neon">X</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">
          Next-Gen AI Fitness & Telemetry for Athletes
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="card-glass w-full max-w-[420px] relative z-10 shadow-2xl border border-white/10 p-6 sm:p-7">
        {!isFirebaseReady && (
          <div className="flex items-start gap-2.5 text-amber-300 text-xs p-3.5 mb-5 bg-amber-500/10 rounded-xl border border-amber-500/30 leading-relaxed">
            <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-white">Firebase Setup Required:</strong>
              <div className="mt-0.5 text-amber-200/90">
                To sign in with real auth, ensure <code>VITE_FIREBASE_API_KEY</code> and credentials are configured in your environment.
              </div>
            </div>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="flex rounded-xl p-1 mb-6 bg-surface/60 border border-white/5">
          {(['login', 'signup'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(''); setInfoMessage(''); }}
              className={`flex-1 py-2.5 rounded-lg border-none cursor-pointer font-outfit font-bold text-xs tracking-wider uppercase transition-all duration-200 ${
                tab === t
                  ? 'bg-gradient-hero text-white shadow-glow-sm'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              {t === 'login' ? 'Sign In' : 'Create Athlete ID'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {tab === 'signup' && (
            <>
              <div className="form-group">
                <label className="flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" />
                  Full Name
                </label>
                <input
                  className="input"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Alex Rivera"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="flex items-center gap-1.5">
                    <School size={13} className="text-slate-400" />
                    College
                  </label>
                  <input
                    className="input"
                    value={form.collegeName}
                    onChange={set('collegeName')}
                    placeholder="Campus Univ"
                  />
                </div>
                <div className="form-group">
                  <label className="flex items-center gap-1.5">
                    <BookOpen size={13} className="text-slate-400" />
                    Dept
                  </label>
                  <input
                    className="input"
                    value={form.department}
                    onChange={set('department')}
                    placeholder="Kinesiology / CS"
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="flex items-center gap-1.5">
              <Mail size={13} className="text-slate-400" />
              Email Address
            </label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="athlete@campus.edu"
              required
            />
          </div>

          <div className="form-group">
            <div className="flex justify-between items-center mb-0.5">
              <label className="flex items-center gap-1.5">
                <Lock size={13} className="text-slate-400" />
                Password
              </label>
              {tab === 'login' && (
                <button
                  type="button"
                  onClick={() => setShowForgot(v => !v)}
                  className="text-[11px] font-semibold text-cyan hover:underline bg-transparent border-none cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>

            <div className="relative">
              <input
                className="input pr-10"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                required={!showForgot}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {showForgot && (
            <div className="p-3.5 bg-surface/80 rounded-xl border border-white/10 flex flex-col gap-2.5 animate-slide-up">
              <p className="text-xs text-slate-300 leading-relaxed">
                Enter your email address above and click below to receive a secure password reset link.
              </p>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="btn btn-outline text-xs py-2 w-full"
              >
                Send Reset Link
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-rose-300 text-xs p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
              <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="flex items-start gap-2 text-emerald-300 text-xs p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full py-3.5 mt-1"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner w-4 h-4 border-white/30 border-t-white" />
                <span>Authenticating…</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>{tab === 'login' ? 'Sign In to Arena' : 'Initialize Profile'}</span>
                <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="divider flex-1" />
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">or</span>
          <div className="divider flex-1" />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogle}
          className="btn btn-secondary btn-full flex items-center justify-center gap-2.5 py-3"
          disabled={loading}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Encrypted Session • Student Athlete Privacy Guaranteed</span>
        </div>
      </div>
    </div>
  );
}
