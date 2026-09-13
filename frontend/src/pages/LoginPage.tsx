import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2, Lock, Mail, User, School, BookOpen } from 'lucide-react';

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
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-between p-4 sm:p-6 relative overflow-hidden">
      {/* ── Cinematic Sports Background with Diagonal Streaks ── */}
      <div 
        className="absolute inset-0 bg-cover bg-top pointer-events-none z-0"
        style={{ backgroundImage: `url('/login-bg.jpg')` }}
      />
      
      {/* Dark Vignette Overlay to maintain master reference contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian/40 via-obsidian/75 to-obsidian pointer-events-none z-0" />
      
      {/* Ambient Neon Speed Glow */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-neon/10 rounded-full blur-[110px] pointer-events-none z-0" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-cyan/10 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* ── Master Reference Header: SportX Logo & Tagline ── */}
      <div className="pt-6 sm:pt-10 pb-4 text-center relative z-10 animate-fade-in">
        <div className="flex items-center justify-center tracking-tighter">
          <span className="text-4xl sm:text-5xl font-black italic text-white drop-shadow-md">Sport</span>
          <span className="text-4xl sm:text-5xl font-black italic text-neon drop-shadow-[0_0_15px_rgba(204,255,0,0.4)]">X</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-slate-300 mt-1 tracking-wider uppercase">
          <span>Train</span>
          <span className="w-1.5 h-1.5 rounded-full bg-neon shadow-[0_0_6px_#CCFF00]" />
          <span>Compete</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan shadow-[0_0_6px_#00F0FF]" />
          <span>Be Better</span>
        </div>
      </div>

      {/* ── Master Reference Card Container ── */}
      <div className="card-glass w-full max-w-[410px] rounded-3xl p-6 sm:p-7 relative z-10 border border-white/10 shadow-2xl backdrop-blur-2xl my-auto">
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

        {/* Card Title & Subtitle matching Master Reference */}
        <div className="mb-5">
          <h2 className="text-2xl sm:text-[26px] font-black tracking-tight text-white">
            {tab === 'login' ? 'Sign In' : 'Sign Up'}
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 font-normal">
            {tab === 'login' ? 'Continue your journey with SportX' : 'Create your verified Athlete ID'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {tab === 'signup' && (
            <>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <User size={18} />
                </div>
                <input
                  className="input pl-11 text-sm bg-surface border-white/10 rounded-xl py-3 text-white placeholder:text-slate-500"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Full Name (e.g. Alex Rivera)"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <School size={16} />
                  </div>
                  <input
                    className="input pl-9 text-xs bg-surface border-white/10 rounded-xl py-3 text-white placeholder:text-slate-500"
                    value={form.collegeName}
                    onChange={set('collegeName')}
                    placeholder="College"
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <BookOpen size={16} />
                  </div>
                  <input
                    className="input pl-9 text-xs bg-surface border-white/10 rounded-xl py-3 text-white placeholder:text-slate-500"
                    value={form.department}
                    onChange={set('department')}
                    placeholder="Dept"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email input with Mail prefix icon */}
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Mail size={18} />
            </div>
            <input
              className="input pl-11 text-sm bg-surface border-white/10 rounded-xl py-3 text-white placeholder:text-slate-500"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="Email address"
              required
            />
          </div>

          {/* Password input with Lock prefix and Eye suffix */}
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Lock size={18} />
            </div>
            <input
              className="input pl-11 pr-11 text-sm bg-surface border-white/10 rounded-xl py-3 text-white placeholder:text-slate-500"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Password"
              required={!showForgot}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Forgot Password Link - Only in Login mode */}
          {tab === 'login' && !showForgot && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs font-semibold text-neon hover:underline bg-transparent border-none cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          {showForgot && (
            <div className="p-3.5 bg-surface/90 rounded-xl border border-white/10 flex flex-col gap-2.5 animate-slide-up">
              <p className="text-xs text-slate-300 leading-relaxed">
                Enter your email address above and click below to receive a secure password reset link.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="btn btn-outline text-xs py-2 flex-1"
                >
                  Send Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="btn btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-rose-300 text-xs p-3 bg-rose-500/15 rounded-xl border border-rose-500/30">
              <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="flex items-start gap-2 text-emerald-300 text-xs p-3 bg-emerald-500/15 rounded-xl border border-emerald-500/30">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Primary CTA Button: Solid Neon Lime with Black Text and Right Arrow */}
          <button
            type="submit"
            className="btn btn-primary w-full py-3.5 text-base font-black rounded-xl shadow-glow text-obsidian flex items-center justify-center gap-2 mt-1 cursor-pointer transition-all hover:scale-[1.01]"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner w-4 h-4 border-obsidian/30 border-t-obsidian" />
                <span>Authenticating…</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>{tab === 'login' ? 'Sign In' : 'Sign Up'}</span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </span>
            )}
          </button>
        </form>

        {/* OR Divider matching Master Reference */}
        <div className="flex items-center gap-3 my-4">
          <div className="h-[1px] bg-white/10 flex-1" />
          <span className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">OR</span>
          <div className="h-[1px] bg-white/10 flex-1" />
        </div>

        {/* Google OAuth Button matching Master Reference */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full py-3 px-4 rounded-xl bg-surface hover:bg-surface-light border border-slate-700/60 text-white text-sm font-semibold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md"
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

        {/* Switch prompt matching Master Reference */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {tab === 'login' ? (
            <span>
              Don’t have an account?{' '}
              <button
                type="button"
                onClick={() => { setTab('signup'); setError(''); setInfoMessage(''); }}
                className="text-neon font-bold hover:underline bg-transparent border-none cursor-pointer"
              >
                Sign Up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setTab('login'); setError(''); setInfoMessage(''); }}
                className="text-neon font-bold hover:underline bg-transparent border-none cursor-pointer"
              >
                Sign In
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Security note footer */}
      <div className="pb-4 pt-2 text-center relative z-10 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck size={14} className="text-neon" />
        <span>Encrypted Session • Student Athlete Privacy Guaranteed</span>
      </div>
    </div>
  );
}
