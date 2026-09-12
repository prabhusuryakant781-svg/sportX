import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Target, Clock, Trophy, ArrowRight, ArrowLeft, Check, Sparkles, AlertCircle, Dumbbell, Flame, Zap, Activity } from 'lucide-react';

const GOALS = [
  { id: 'fitness', label: 'General Athletic Fitness', desc: 'Stay mobile, conditioned and energized for campus life', icon: Activity },
  { id: 'strength', label: 'Build Muscular Strength', desc: 'Increase calibrated resistance, volume and power', icon: Dumbbell },
  { id: 'endurance', label: 'Stamina & Aerobic Capacity', desc: 'Sustain peak athletic output with higher rep density', icon: Zap },
  { id: 'weight_loss', label: 'Fat Loss & Conditioning', desc: 'High metabolic burn with real-time cadence tracking', icon: Flame },
];

const TIMES = [10, 20, 30, 45, 60];

const DEFAULT_SPORTS = [
  { id: 'badminton', sportId: 'badminton', name: 'Badminton', icon: '🏸', iconUrl: '🏸' },
  { id: 'football', sportId: 'football', name: 'Football / Soccer', icon: '⚽', iconUrl: '⚽' },
  { id: 'cricket', sportId: 'cricket', name: 'Cricket', icon: '🏏', iconUrl: '🏏' },
  { id: 'basketball', sportId: 'basketball', name: 'Basketball', icon: '🏀', iconUrl: '🏀' },
  { id: 'running', sportId: 'running', name: 'Campus Athletics & Track', icon: '🏃', iconUrl: '🏃' },
  { id: 'table_tennis', sportId: 'table_tennis', name: 'Table Tennis', icon: '🏓', iconUrl: '🏓' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(user?.fitnessGoal || 'fitness');
  const [time, setTime] = useState(user?.availableTimeMinutes || 20);
  const [sports, setSports] = useState<string[]>(user?.selectedSports || []);
  const [allSports, setAllSports] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSports()
      .then((r: any) => {
        if (Array.isArray(r.data) && r.data.length > 0) {
          setAllSports(r.data);
        } else {
          setAllSports(DEFAULT_SPORTS);
        }
      })
      .catch((err) => {
        console.warn('[Onboarding] Could not fetch sports catalogue from backend, using defaults:', err);
        setAllSports(DEFAULT_SPORTS);
      });
  }, []);

  const sportsCatalogue = allSports.length > 0 ? allSports : DEFAULT_SPORTS;

  const toggleSport = (sportId: string) => {
    if (!sportId) return;
    setSports(prev =>
      prev.includes(sportId)
        ? prev.filter(x => x !== sportId)
        : [...prev, sportId]
    );
  };

  const selectAllSports = () => {
    const allIds = sportsCatalogue.map(s => s.id || s.sportId).filter(Boolean);
    setSports(allIds);
  };

  const clearAllSports = () => {
    setSports([]);
  };

  const finish = async () => {
    setSaving(true);
    setError('');
    try {
      // 1. Update full user profile in backend
      await api.updateProfile({
        fitnessGoal: goal,
        goals: [goal],
        availableTimeMinutes: time,
        availableWorkoutTime: time,
        selectedSports: sports,
      });

      // 2. Synchronize sports selection endpoint
      if (sports.length > 0) {
        await api.selectSports(sports).catch(() => {});
      }

      // 3. Refresh user state in AuthContext
      await refreshUser().catch(() => {});
    } catch (e: any) {
      console.warn('[Onboarding] Profile sync notice:', e.message);
    } finally {
      setSaving(false);
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-white flex flex-col justify-between py-6 px-4 sm:px-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header & Step Progress Bar */}
      <div className="w-full max-w-lg mx-auto relative z-10 pt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-neon uppercase">Athlete Calibration</span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">Step {step + 1} of 3</span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {step === 0 ? 'Goal' : step === 1 ? 'Schedule' : 'Disciplines'}
          </span>
        </div>

        {/* Progress Track */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-gradient-hero shadow-glow-sm' : 'bg-surface'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Wizard Content */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-center py-6 relative z-10">
        {step === 0 && (
          <div className="animate-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-neon/15 text-neon mb-3 shadow-glow-sm">
                <Target size={24} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Select Primary Focus</h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                SportX AI calibrates movement thresholds and routines to this goal.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {GOALS.map(g => {
                const Icon = g.icon;
                const isSelected = goal === g.id;
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={`w-full text-left p-4 rounded-2xl transition-all cursor-pointer flex items-center gap-4 ${
                      isSelected
                        ? 'bg-neon/15 border-[1.5px] border-neon text-white shadow-glow-sm'
                        : 'card hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-neon text-obsidian font-bold' : 'bg-surface text-slate-400'
                    }`}>
                      <Icon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white">{g.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5 leading-snug">{g.desc}</div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-neon text-obsidian flex items-center justify-center flex-shrink-0">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="btn btn-primary btn-full mt-6 py-3.5"
              onClick={() => setStep(1)}
            >
              <span>Continue to Schedule</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan/15 text-cyan mb-3 shadow-glow-cyan-sm">
                <Clock size={24} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Daily Training Window</h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                How much active time do you have per day between classes and study?
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TIMES.map(t => {
                const isSelected = time === t;
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTime(t)}
                    className={`py-5 px-3 rounded-2xl text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-cyan/15 border-[1.5px] border-cyan shadow-glow-cyan-sm'
                        : 'card hover:border-white/20'
                    }`}
                  >
                    <div className={`text-3xl font-black tabular-nums ${isSelected ? 'text-cyan' : 'text-white'}`}>
                      {t}
                    </div>
                    <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                      Minutes
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                className="btn btn-secondary px-5"
                onClick={() => setStep(0)}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={() => setStep(2)}
              >
                <span>Select Disciplines</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber/15 text-amber mb-3 shadow-glow-amber">
                <Trophy size={24} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Active Sports & Disciplines</h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                {sports.length > 0
                  ? `${sports.length} sport${sports.length > 1 ? 's' : ''} selected for athletic calibration`
                  : 'Choose the sports you play or train for on campus'}
              </p>
            </div>

            <div className="flex justify-between items-center px-1 mb-3">
              <span className="text-xs text-slate-400">Tap to toggle sports</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllSports}
                  className="text-xs font-semibold text-neon hover:underline bg-transparent border-none cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={clearAllSports}
                  className="text-xs font-semibold text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="chip-grid">
              {sportsCatalogue.map(s => {
                const sId = s.id || s.sportId;
                const sName = s.name;
                const sIcon = s.icon || s.iconUrl || '🏅';
                const isSelected = sports.includes(sId);
                return (
                  <button
                    type="button"
                    key={sId}
                    onClick={() => toggleSport(sId)}
                    className={`chip py-2.5 px-4 flex items-center gap-2 text-sm ${isSelected ? 'selected' : ''}`}
                  >
                    <span>{sIcon}</span>
                    <span>{sName}</span>
                    {isSelected && <Check size={14} className="text-neon ml-1" />}
                  </button>
                );
              })}
            </div>

            {sports.length === 0 && (
              <div className="flex items-center justify-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 mt-4">
                <AlertCircle size={15} />
                <span>Tip: Select at least 1 sport to customize your telemetry & AI plans.</span>
              </div>
            )}

            {error && (
              <div className="text-rose-300 text-xs p-3 bg-rose-500/10 rounded-xl border border-rose-500/30 mt-3">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                className="btn btn-secondary px-5"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1 py-3.5"
                onClick={finish}
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner w-4 h-4 border-white/30 border-t-white" />
                    <span>Calibrating Engine…</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles size={16} />
                    <span>Complete Calibration</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Security Note */}
      <div className="w-full max-w-lg mx-auto text-center relative z-10 pt-2 pb-1">
        <p className="text-[11px] text-slate-500">
          Settings can be fine-tuned anytime in Athlete Profile.
        </p>
      </div>
    </div>
  );
}
