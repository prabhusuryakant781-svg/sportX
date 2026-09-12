import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import WorkoutCard from '../components/WorkoutCard';
import ExerciseCard from '../components/ExerciseCard';
import { buildCameraRoute } from '../utils/exerciseUtils';
import type { WorkoutPlan, Exercise } from '../types';

export default function WorkoutLibraryPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [tab, setTab] = useState<'plans' | 'exercises'>('plans');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getWorkouts(), api.getExercises()])
      .then(([wRes, eRes]: any[]) => {
        setPlans(wRes.data || []);
        setExercises(eRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStartPlan = (plan: WorkoutPlan) => {
    const firstEx = plan.exercises?.[0]?.exerciseId || 'squat';
    navigate(buildCameraRoute(plan, firstEx));
  };

  const handleSelectExercise = (ex: Exercise) => {
    navigate(buildCameraRoute('free', ex));
  };

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="page-header">
        <h1 className="text-white">Workout Library</h1>
        <p className="text-sm mt-1">Discover plans and exercises.</p>
      </div>

      <div className="px-5 mt-5">
        <div className="flex bg-surface rounded-lg p-1">
          {(['plans', 'exercises'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                tab === t ? 'bg-card border border-white/10 text-white shadow-md' : 'text-muted'
              }`}
            >
              {t === 'plans' ? '📋 Plans' : '🏋️ Exercises'}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="skeleton h-32" />
            <div className="skeleton h-32" />
          </div>
        ) : tab === 'plans' ? (
          <div className="flex flex-col gap-4">
            {plans.map((p, idx) => (
              <WorkoutCard key={p.id || p.workoutId || p.planId || `plan-${idx}`} plan={p} onStart={handleStartPlan} />
            ))}
            {plans.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">📂</span>
                <p>No workout plans available.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {exercises.map((ex, idx) => (
              <ExerciseCard key={ex.id || ex.exerciseId || `ex-${idx}`} exercise={ex} onSelect={handleSelectExercise} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
