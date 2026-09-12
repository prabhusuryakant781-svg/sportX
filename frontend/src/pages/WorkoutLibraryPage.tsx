import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import WorkoutCard from '../components/WorkoutCard';
import ExerciseCard from '../components/ExerciseCard';
import DrillDetailModal from '../components/DrillDetailModal';
import { buildCameraRoute, isCameraSupported } from '../utils/exerciseUtils';
import { DEFAULT_WORKOUT_PLANS, DEFAULT_EXERCISES } from '../data/workoutLibraryData';
import type { WorkoutPlan, Exercise } from '../types';
import { Dumbbell, Search, SlidersHorizontal, Sparkles } from 'lucide-react';

const PLAN_CATEGORIES = [
  'All',
  'Full Body',
  'Upper Body',
  'Lower Body',
  'Strength',
  'Endurance',
  'Cardio & Running',
  'Mobility',
  'Sport Drills',
];

const EXERCISE_CATEGORIES = [
  'All',
  'Running & Cardio',
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Core',
  'Legs',
  'Mobility',
  'Full Body',
];

export default function WorkoutLibraryPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WorkoutPlan[]>(DEFAULT_WORKOUT_PLANS);
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [tab, setTab] = useState<'plans' | 'exercises'>('plans');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [activeDrillModalExercise, setActiveDrillModalExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    Promise.all([
      api.getWorkouts().catch(() => ({ data: [] })),
      api.getExercises().catch(() => ({ data: [] }))
    ])
      .then(([wRes, eRes]: any[]) => {
        const fetchedPlans: WorkoutPlan[] = Array.isArray(wRes?.data) ? wRes.data : Array.isArray(wRes) ? wRes : [];
        const fetchedExercises: Exercise[] = Array.isArray(eRes?.data) ? eRes.data : Array.isArray(eRes) ? eRes : [];

        // Build combined plans map: Start with DEFAULT_WORKOUT_PLANS, then merge fetched
        const planMap = new Map<string, WorkoutPlan>();
        DEFAULT_WORKOUT_PLANS.forEach(p => {
          const key = p.workoutId || p.planId || p.id || '';
          if (key) planMap.set(key, p);
        });
        fetchedPlans.forEach(p => {
          const key = p.workoutId || p.planId || p.id || '';
          if (key) {
            const existing = planMap.get(key);
            planMap.set(key, existing ? { ...existing, ...p } : p);
          }
        });
        setPlans(Array.from(planMap.values()));

        // Build combined exercises map: Start with DEFAULT_EXERCISES, then merge fetched
        const exMap = new Map<string, Exercise>();
        DEFAULT_EXERCISES.forEach(e => {
          const key = e.exerciseId || e.id || '';
          if (key) exMap.set(key, e);
        });
        fetchedExercises.forEach(e => {
          const key = e.exerciseId || e.id || '';
          if (key) {
            const existing = exMap.get(key);
            exMap.set(key, existing ? { ...existing, ...e } : e);
          }
        });
        setExercises(Array.from(exMap.values()));
      })
      .catch(err => {
        console.warn('[WorkoutLibraryPage] Using static catalog defaults:', err);
        setPlans(DEFAULT_WORKOUT_PLANS);
        setExercises(DEFAULT_EXERCISES);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStartPlan = (plan: WorkoutPlan) => {
    const firstExId = plan.exercises?.[0]?.exerciseId || 'squat';
    if (isCameraSupported(firstExId)) {
      navigate(buildCameraRoute(plan, firstExId));
    } else {
      // Find drill and open guided modal for manual / outdoor routine
      const drill = exercises.find(e => (e.id || e.exerciseId) === firstExId) || {
        id: firstExId,
        exerciseId: firstExId,
        name: plan.title,
        category: 'Running & Cardio',
        difficulty: plan.difficulty,
        description: plan.recommendationReason || 'Guided training routine outside the camera studio.',
        aiSupported: false,
      };
      setActiveDrillModalExercise(drill);
    }
  };

  const handleSelectExercise = (ex: Exercise) => {
    const exId = ex.id || ex.exerciseId;
    if (isCameraSupported(exId)) {
      navigate(buildCameraRoute('free', ex));
    } else {
      setActiveDrillModalExercise(ex);
    }
  };

  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (p.title || '').toLowerCase().includes(q) ||
        (p.difficulty || '').toLowerCase().includes(q) ||
        (p.recommendationReason || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (selectedCategory === 'All') return true;

      const catLower = selectedCategory.toLowerCase();
      const titleLower = (p.title || '').toLowerCase();
      const reasonLower = (p.recommendationReason || '').toLowerCase();
      const idLower = (p.workoutId || p.id || '').toLowerCase();

      if (catLower === 'full body') {
        return titleLower.includes('full body') || titleLower.includes('dorm room') || titleLower.includes('dorm blast');
      }
      if (catLower === 'upper body') {
        return titleLower.includes('upper') || titleLower.includes('chest') || titleLower.includes('back');
      }
      if (catLower === 'lower body') {
        return titleLower.includes('lower') || titleLower.includes('glute') || titleLower.includes('leg');
      }
      if (catLower === 'strength') {
        return (
          titleLower.includes('strength') ||
          titleLower.includes('core') ||
          p.difficulty?.toLowerCase() === 'advanced'
        );
      }
      if (catLower === 'endurance') {
        return titleLower.includes('endurance') || titleLower.includes('stamina');
      }
      if (catLower === 'cardio & running') {
        return (
          titleLower.includes('cardio') ||
          titleLower.includes('run') ||
          titleLower.includes('jog') ||
          titleLower.includes('sprint') ||
          titleLower.includes('hiit')
        );
      }
      if (catLower === 'mobility') {
        return titleLower.includes('mobility') || titleLower.includes('reset') || titleLower.includes('flow');
      }
      if (catLower === 'sport drills') {
        return (
          titleLower.includes('agility') ||
          titleLower.includes('court') ||
          titleLower.includes('racquet') ||
          titleLower.includes('sport')
        );
      }

      return titleLower.includes(catLower) || reasonLower.includes(catLower) || idLower.includes(catLower);
    });
  }, [plans, searchQuery, selectedCategory]);

  const filteredExercises = useMemo(() => {
    return exercises.filter(e => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (e.name || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q) ||
        (e.difficulty || '').toLowerCase().includes(q) ||
        (Array.isArray(e.targetMuscles) && e.targetMuscles.some(m => m.toLowerCase().includes(q)));

      if (!matchesSearch) return false;
      if (selectedCategory === 'All') return true;

      const catLower = selectedCategory.toLowerCase();
      const exCategory = (e.category || '').toLowerCase();

      if (catLower === 'running & cardio') {
        return exCategory.includes('cardio') || exCategory.includes('running');
      }

      return exCategory === catLower;
    });
  }, [exercises, searchQuery, selectedCategory]);

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
          Curated training routines, running sessions, and computer-vision tracked movement drills.
        </p>
      </header>

      {/* Segmented Tab Switcher */}
      <div className="flex rounded-xl p-1 bg-surface border border-white/5">
        <button
          type="button"
          onClick={() => {
            setTab('plans');
            setSelectedCategory('All');
          }}
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
          onClick={() => {
            setTab('exercises');
            setSelectedCategory('All');
          }}
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
          placeholder={tab === 'plans' ? 'Search workout routines…' : 'Search drills (squat, run, bench, curl)…'}
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

      {/* Category Filter Chips Bar */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
        {(tab === 'plans' ? PLAN_CATEGORIES : EXERCISE_CATEGORIES).map(cat => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-neon text-obsidian border-neon shadow-glow-sm'
                  : 'bg-surface text-slate-300 border-white/5 hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          );
        })}
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
                {searchQuery || selectedCategory !== 'All'
                  ? `No routines found for filter "${selectedCategory}" / "${searchQuery}".`
                  : 'No workout routines available right now.'}
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
                {searchQuery || selectedCategory !== 'All'
                  ? `No movement drills found for "${selectedCategory}" / "${searchQuery}".`
                  : 'No exercises registered in library.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Drill Detail / Manual Activity Modal for Non-Camera Drills */}
      <DrillDetailModal
        exercise={activeDrillModalExercise}
        isOpen={Boolean(activeDrillModalExercise)}
        onClose={() => setActiveDrillModalExercise(null)}
      />
    </div>
  );
}
