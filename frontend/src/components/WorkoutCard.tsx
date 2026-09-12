import type { WorkoutPlan } from '../types';

interface WorkoutCardProps {
  plan: WorkoutPlan;
  onStart: (plan: WorkoutPlan) => void;
}

export default function WorkoutCard({ plan, onStart }: WorkoutCardProps) {
  return (
    <div className="card group cursor-pointer" onClick={() => onStart(plan)}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="text-white font-bold">{plan.title}</h4>
          {plan.recommendationReason && (
            <p className="text-xs text-muted mt-1">{plan.recommendationReason}</p>
          )}
        </div>
        <span className="text-3xl">🏋️</span>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <span className="stat-pill">⏱️ {plan.estimatedDurationMinutes || plan.estimatedDuration || 15} min</span>
        <span className="stat-pill">📋 {plan.exercises?.length || 0} exercises</span>
        <span className="stat-pill">🎯 {plan.difficulty}</span>
      </div>

      <button
        className="btn btn-primary btn-full mt-3 opacity-90 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onStart(plan); }}
      >
        🎬 Start Workout
      </button>
    </div>
  );
}
