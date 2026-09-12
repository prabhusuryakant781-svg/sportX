import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import WorkoutCard from '../components/WorkoutCard';
import ExerciseCard from '../components/ExerciseCard';
import { buildCameraRoute } from '../utils/exerciseUtils';
import type { WorkoutPlan, Exercise } from '../types';
import { Dumbbell, Search, Sparkles, SlidersHorizontal } from 'lucide-react';

export default function WorkoutLibraryPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [tab, setTab] = useState<'plans' | 'exercises'>('plans');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getWorkouts().catch(() => ({ data: [] })),
      api.getExercises().catch(() => ({ data: [] }))
    ])
      .then(([wRes, eRes]: any[]) => {
        setPlans(wRes?.data || []);
        setExercises(eRes?.data || []);
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

  const filteredPlans = plans.filter(p =>
    (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.difficulty || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredExercises = exercises.filter(e =>
    (e.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.difficulty || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {/* Page Header */}
      <header className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-neon/15 text-neon flex items-center justify-center">
            <Dumbbell size={18} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-neon">Training Hub</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Workout Library</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Curated training routines and computer-vision tracked movement drills.
        </p>
      </header>

      {/* Segmented Tab Switcher */}
      <div className="flex rounded-xl p-1 bg-surface border border-white/5">
        <button
          type="button"
          onClick={() => setTab('plans')}
          className={`flex-1 py-2.5 rounded-lg border-none cursor-pointer font-outfit font-bold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
            tab === 'plans'
              ? 'bg-card text-white shadow-md border border-white/10'
              : 'bg-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>📋 Workout Plans</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-light text-slate-300">
            {plans.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('exercises')}
          className={`flex-1 py-2.5 rounded-lg border-none cursor-pointer font-outfit font-bold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
            tab === 'exercises'
              ? 'bg-card text-white shadow-md border border-white/10'
              : 'bg-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>🏋️ Movement Drills</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-light text-slate-300">
            {exercises.length}
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={tab === 'plans' ? 'Search workout routines…' : 'Search exercises (squats, pushups)…'}
          className="input pl-10 pr-4 py-2.5 text-xs bg-surface/60 border border-white/5"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="space-y-3 pt-2">
          <div className="card skeleton h-36" />
          <div className="card skeleton h-36" />
          <div className="card skeleton h-36" />
        </div>
      ) : tab === 'plans' ? (
        <div className="space-y-3.5 pt-1">
          {filteredPlans.map((p, idx) => (
            <WorkoutCard
              key={p.id || p.workoutId || p.planId || `plan-${idx}`}
              plan={p}
              onStart={handleStartPlan}
            />
          ))}

          {filteredPlans.length === 0 && (
            <div className="card text-center py-12 border border-white/5">
              <span className="text-4xl block mb-2">📂</span>
              <h3 className="text-sm font-bold text-white">No plans match your query</h3>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery ? `No routines found for "${searchQuery}".` : 'No workout routines available right now.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {filteredExercises.map((ex, idx) => (
            <ExerciseCard
              key={ex.id || ex.exerciseId || `ex-${idx}`}
              exercise={ex}
              onSelect={handleSelectExercise}
            />
          ))}

          {filteredExercises.length === 0 && (
            <div className="card text-center py-12 border border-white/5">
              <span className="text-4xl block mb-2">🏋️</span>
              <h3 className="text-sm font-bold text-white">No exercises found</h3>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery ? `No movement drills found for "${searchQuery}".` : 'No exercises registered in library.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
