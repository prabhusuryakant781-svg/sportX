import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';

const DIFFICULTY_COLOR = { beginner: 'var(--accent4)', intermediate: 'var(--accent3)', advanced: 'var(--accent2)' };

export default function WorkoutPlanPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | beginner | intermediate | advanced

  useEffect(() => {
    api.getWorkouts().then(r => setPlans(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? plans : plans.filter(p => p.difficulty === filter);

  return (
    <div>
      <div className="section">
        <div>
          <h1>Workout Plans 💪</h1>
          <p style={{ fontSize: 14, marginTop: 4 }}>AI-powered plans for your schedule</p>
        </div>

        {/* Filter chips */}
        <div className="chip-grid">
          {['all', 'beginner', 'intermediate', 'advanced'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`chip${filter === f ? ' selected' : ''}`}>
              {f === 'all' ? '🔥 All' : f === 'beginner' ? '🌱 Beginner' : f === 'intermediate' ? '⚡ Mid' : '🔱 Advanced'}
            </button>
          ))}
        </div>

        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="card" style={{ gap: 8, display: 'flex', flexDirection: 'column' }}>
              <div className="skeleton" style={{ height: 20, width: '70%' }} />
              <div className="skeleton" style={{ height: 14, width: '40%' }} />
              <div className="skeleton" style={{ height: 40, marginTop: 4 }} />
            </div>
          ))
        ) : filtered.map(plan => (
          <div key={plan.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/camera/${plan.id}/${plan.exercises[0]?.exerciseId || 'squat'}`)}>
            <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
              <h3>{plan.title}</h3>
              <span style={{ fontSize: 11, fontWeight: 700, color: DIFFICULTY_COLOR[plan.difficulty] || 'var(--text-muted)', background: `${DIFFICULTY_COLOR[plan.difficulty]}22`, padding: '3px 8px', borderRadius: 100 }}>
                {plan.difficulty}
              </span>
            </div>
            <div className="flex gap-8" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
              <span className="stat-pill" style={{ fontSize: 12 }}>⏱️ {plan.estimatedDurationMinutes}min</span>
              <span className="stat-pill" style={{ fontSize: 12 }}>🎯 {plan.targetGoal}</span>
              <span className="stat-pill" style={{ fontSize: 12 }}>📋 {plan.exercises.length} exercises</span>
            </div>
            {/* Exercise list preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {plan.exercises.slice(0, 3).map((ex, i) => (
                <div key={i} className="flex items-center gap-8" style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, minWidth: 16 }}>{i + 1}</span>
                  <span>{ex.name}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>
                    {ex.targetReps ? `${ex.targetSets}×${ex.targetReps}` : `${ex.targetSets}×${ex.targetDurationSeconds}s`}
                  </span>
                  {ex.aiSupported && <span style={{ fontSize: 10, color: 'var(--accent4)', background: 'rgba(107,203,119,0.1)', padding: '2px 6px', borderRadius: 100 }}>AI</span>}
                </div>
              ))}
              {plan.exercises.length > 3 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>+{plan.exercises.length - 3} more…</div>}
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop: 14 }}>
              🎬 Start This Workout
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
