import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const GOALS = [
  { id: 'fitness', label: '🏃 General Fitness', desc: 'Stay active and healthy' },
  { id: 'strength', label: '💪 Build Strength', desc: 'Get stronger each week' },
  { id: 'endurance', label: '⚡ Endurance', desc: 'Improve stamina & cardio' },
  { id: 'weight_loss', label: '🔥 Weight Loss', desc: 'Burn calories efficiently' },
];

const TIMES = [10, 20, 30, 45, 60];

const DEFAULT_SPORTS = [
  { id: 'badminton', sportId: 'badminton', name: 'Badminton', icon: '🏸', iconUrl: '🏸' },
  { id: 'football', sportId: 'football', name: 'Football / Soccer', icon: '⚽', iconUrl: '⚽' },
  { id: 'cricket', sportId: 'cricket', name: 'Cricket', icon: '🏏', iconUrl: '🏏' },
  { id: 'basketball', sportId: 'basketball', name: 'Basketball', icon: '🏀', iconUrl: '🏀' },
  { id: 'running', sportId: 'running', name: 'Campus Athletics & Running', icon: '🏃', iconUrl: '🏃' },
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

  const steps = [
    // Step 0: Goal
    <div key="goal" className="section animate-in">
      <div className="text-center py-2 pb-4">
        <div className="text-5xl">🎯</div>
        <h2 className="text-white mt-2">What's your goal?</h2>
        <p className="text-sm text-muted mt-1">We'll personalize your plan for you</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {GOALS.map(g => (
          <button
            type="button"
            key={g.id}
            onClick={() => setGoal(g.id)}
            className={`w-full text-left p-4 rounded-xl transition-all cursor-pointer ${
              goal === g.id
                ? 'bg-neon/10 border-[1.5px] border-neon/40 shadow-glow-sm'
                : 'bg-card border-[1.5px] border-white/5 hover:border-white/20'
            }`}
          >
            <div className="font-bold text-base text-white">{g.label}</div>
            <div className="text-sm text-muted mt-0.5">{g.desc}</div>
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-primary btn-full mt-4" onClick={() => setStep(1)}>
        Next →
      </button>
    </div>,

    // Step 1: Time
    <div key="time" className="section animate-in">
      <div className="text-center py-2 pb-4">
        <div className="text-5xl">⏱️</div>
        <h2 className="text-white mt-2">Daily time available?</h2>
        <p className="text-sm text-muted mt-1">We'll fit workouts to your schedule</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {TIMES.map(t => (
          <button
            type="button"
            key={t}
            onClick={() => setTime(t)}
            className={`py-5 px-3 rounded-xl text-center transition-all cursor-pointer ${
              time === t
                ? 'bg-neon/10 border-[1.5px] border-neon/40 shadow-glow-sm'
                : 'bg-card border-[1.5px] border-white/5 hover:border-white/20'
            }`}
          >
            <div className={`text-2xl font-black ${time === t ? 'text-neon' : 'text-white'}`}>{t}</div>
            <div className="text-xs text-muted mt-0.5">minutes</div>
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
        <button type="button" className="btn btn-primary flex-1" onClick={() => setStep(2)}>Next →</button>
      </div>
    </div>,

    // Step 2: Sports
    <div key="sports" className="section animate-in">
      <div className="text-center py-2 pb-4">
        <div className="text-5xl">🏆</div>
        <h2 className="text-white mt-2">Pick your sports</h2>
        <p className="text-sm text-muted mt-1">
          {sports.length > 0
            ? `${sports.length} sport${sports.length > 1 ? 's' : ''} selected`
            : "Select the sports you train for"}
        </p>
      </div>

      <div className="flex justify-between items-center px-1 mb-2">
        <span className="text-xs text-muted">Click each sport to select / deselect</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAllSports}
            className="text-xs text-neon hover:underline bg-transparent border-none cursor-pointer"
          >
            Select All
          </button>
          <span className="text-xs text-muted">•</span>
          <button
            type="button"
            onClick={clearAllSports}
            className="text-xs text-muted hover:text-white bg-transparent border-none cursor-pointer"
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
              className={`chip ${isSelected ? 'selected' : ''}`}
            >
              {sIcon} {sName}
            </button>
          );
        })}
      </div>

      {sports.length === 0 && (
        <p className="text-xs text-amber-400/90 text-center mt-3">
          💡 Tip: Pick at least 1 sport to personalize your drills and workouts.
        </p>
      )}

      {error && (
        <div className="text-crimson text-sm p-2 bg-crimson/10 rounded-lg border border-crimson/30 mt-2">
          {error}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
        <button
          type="button"
          className="btn btn-primary flex-1"
          onClick={finish}
          disabled={saving}
        >
          {saving ? <span className="spinner w-4 h-4" /> : "Let's Go! 🚀"}
        </button>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen bg-obsidian pt-6 pb-12">
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-4">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i <= step ? 'bg-neon' : 'bg-surface'
            } ${i === step ? 'w-6' : 'w-2'}`}
          />
        ))}
      </div>
      <div className="max-w-md mx-auto">
        {steps[step]}
      </div>
    </div>
  );
}
