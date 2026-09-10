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

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('fitness');
  const [time, setTime] = useState(20);
  const [sports, setSports] = useState<string[]>([]);
  const [allSports, setAllSports] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSports().then((r: any) => setAllSports(r.data || [])).catch(console.error);
  }, []);

  const toggleSport = (id: string) =>
    setSports(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const finish = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ fitnessGoal: goal, availableTimeMinutes: time });
      await api.selectSports(sports);
      await refreshUser();
      navigate('/dashboard');
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const steps = [
    // Step 0: Goal
    <div key="goal" className="section animate-in">
      <div className="text-center py-2 pb-4">
        <div className="text-5xl">🎯</div>
        <h2 className="text-white mt-2">What's your goal?</h2>
        <p className="text-sm mt-1">We'll personalize your plan for you</p>
      </div>
      {GOALS.map(g => (
        <button
          key={g.id}
          onClick={() => setGoal(g.id)}
          className={`w-full text-left p-4 rounded-xl transition-all ${
            goal === g.id
              ? 'bg-neon/10 border-[1.5px] border-neon/40'
              : 'bg-card border-[1.5px] border-white/5'
          }`}
        >
          <div className="font-bold text-base text-white">{g.label}</div>
          <div className="text-sm text-muted mt-0.5">{g.desc}</div>
        </button>
      ))}
      <button className="btn btn-primary btn-full" onClick={() => setStep(1)}>Next →</button>
    </div>,

    // Step 1: Time
    <div key="time" className="section animate-in">
      <div className="text-center py-2 pb-4">
        <div className="text-5xl">⏱️</div>
        <h2 className="text-white mt-2">Daily time available?</h2>
        <p className="text-sm mt-1">We'll fit workouts to your schedule</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {TIMES.map(t => (
          <button
            key={t}
            onClick={() => setTime(t)}
            className={`py-5 px-3 rounded-xl text-center transition-all ${
              time === t
                ? 'bg-neon/10 border-[1.5px] border-neon/40'
                : 'bg-card border-[1.5px] border-white/5'
            }`}
          >
            <div className={`text-2xl font-black ${time === t ? 'text-neon' : 'text-white'}`}>{t}</div>
            <div className="text-xs text-muted mt-0.5">minutes</div>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
        <button className="btn btn-primary flex-1" onClick={() => setStep(2)}>Next →</button>
      </div>
    </div>,

    // Step 2: Sports
    <div key="sports" className="section animate-in">
      <div className="text-center py-2 pb-4">
        <div className="text-5xl">🏆</div>
        <h2 className="text-white mt-2">Pick your sports</h2>
        <p className="text-sm mt-1">We'll cross-train specifically for these</p>
      </div>
      <div className="chip-grid">
        {allSports.map(s => (
          <button
            key={s.id}
            onClick={() => toggleSport(s.id)}
            className={`chip ${sports.includes(s.id) ? 'selected' : ''}`}
          >
            {s.icon} {s.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
        <button className="btn btn-primary flex-1" onClick={finish} disabled={saving}>
          {saving ? <span className="spinner w-4 h-4" /> : "Let's Go! 🚀"}
        </button>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen bg-obsidian pt-6">
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i <= step ? 'bg-neon' : 'bg-surface'
            } ${i === step ? 'w-6' : 'w-2'}`}
          />
        ))}
      </div>
      {steps[step]}
    </div>
  );
}
