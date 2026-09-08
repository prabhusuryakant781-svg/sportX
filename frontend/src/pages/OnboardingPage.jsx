import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

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
  const [step, setStep] = useState(0); // 0: goal, 1: time, 2: sports
  const [goal, setGoal] = useState('fitness');
  const [time, setTime] = useState(20);
  const [sports, setSports] = useState([]);
  const [allSports, setAllSports] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSports().then(r => setAllSports(r.data)).catch(console.error);
  }, []);

  const toggleSport = (id) => setSports(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

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
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <div style={{ fontSize: 48 }}>🎯</div>
        <h2 style={{ marginTop: 8 }}>What's your goal?</h2>
        <p style={{ marginTop: 4, fontSize: 14 }}>We'll personalize your plan for you</p>
      </div>
      {GOALS.map(g => (
        <button key={g.id} onClick={() => setGoal(g.id)}
          style={{ background: goal === g.id ? 'rgba(108,99,255,0.15)' : 'var(--bg-card)', border: `1.5px solid ${goal === g.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{g.label}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{g.desc}</div>
        </button>
      ))}
      <button className="btn btn-primary btn-full" onClick={() => setStep(1)}>Next →</button>
    </div>,

    // Step 1: Time
    <div key="time" className="section animate-in">
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <div style={{ fontSize: 48 }}>⏱️</div>
        <h2 style={{ marginTop: 8 }}>Daily time available?</h2>
        <p style={{ marginTop: 4, fontSize: 14 }}>We'll fit workouts to your schedule</p>
      </div>
      <div className="grid-2">
        {TIMES.map(t => (
          <button key={t} onClick={() => setTime(t)}
            style={{ background: time === t ? 'rgba(108,99,255,0.15)' : 'var(--bg-card)', border: `1.5px solid ${time === t ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '20px 12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: time === t ? 'var(--accent)' : 'var(--text-primary)' }}>{t}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>minutes</div>
          </button>
        ))}
      </div>
      <div className="flex gap-8">
        <button className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(2)}>Next →</button>
      </div>
    </div>,

    // Step 2: Sports
    <div key="sports" className="section animate-in">
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <div style={{ fontSize: 48 }}>🏆</div>
        <h2 style={{ marginTop: 8 }}>Pick your sports</h2>
        <p style={{ marginTop: 4, fontSize: 14 }}>We'll cross-train specifically for these</p>
      </div>
      <div className="chip-grid">
        {allSports.map(s => (
          <button key={s.id} onClick={() => toggleSport(s.id)} className={`chip${sports.includes(s.id) ? ' selected' : ''}`}>
            {s.icon} {s.name}
          </button>
        ))}
      </div>
      <div className="flex gap-8">
        <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={finish} disabled={saving}>
          {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : "Let's Go! 🚀"}
        </button>
      </div>
    </div>,
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', paddingTop: 24 }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 100, background: i <= step ? 'var(--accent)' : 'var(--surface)', transition: 'all 0.3s' }} />
        ))}
      </div>
      {steps[step]}
    </div>
  );
}
