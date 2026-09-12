import type { WorkoutPlan } from '../types';
import { Clock, Dumbbell, Play, Sparkles, ChevronRight } from 'lucide-react';

interface WorkoutCardProps {
  plan: WorkoutPlan;
  onStart: (plan: WorkoutPlan) => void;
}

export default function WorkoutCard({ plan, onStart }: WorkoutCardProps) {
  const duration = plan.estimatedDurationMinutes || plan.estimatedDuration || 15;
  const exerciseCount = plan.exercises?.length || 0;

  const difficultyColors: Record<string, string> = {
    beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    intermediate: 'text-cyan bg-cyan/10 border-cyan/30',
    advanced: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  };

  const diffClass = difficultyColors[plan.difficulty?.toLowerCase()] || 'text-slate-300 bg-surface border-white/10';

  return (
    <div
      onClick={() => onStart(plan)}
      className="card-glass border border-white/10 p-5 rounded-2xl cursor-pointer hover:border-neon/40 transition-all duration-200 group relative overflow-hidden shadow-card hover:shadow-glow-sm"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${diffClass}`}>
              {plan.difficulty || 'All Levels'}
            </span>
            {plan.recommendationReason && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-neon px-2 py-0.5 rounded-full bg-neon/10 border border-neon/20">
                <Sparkles size={10} />
                <span>Recommended</span>
              </span>
            )}
          </div>

          <h3 className="text-base font-black text-white tracking-tight group-hover:text-neon transition-colors">
            {plan.title}
          </h3>

          {plan.recommendationReason && (
            <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
              {plan.recommendationReason}
            </p>
          )}
        </div>

        <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-slate-300 group-hover:bg-neon group-hover:text-obsidian transition-all flex-shrink-0">
          <Dumbbell size={18} />
        </div>
      </div>

      {/* Routine Telemetry Badges */}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/5">
        <span className="stat-pill text-xs">
          <Clock size={12} className="text-slate-400" />
          <span>{duration} mins</span>
        </span>
        <span className="stat-pill text-xs">
          <Dumbbell size={12} className="text-slate-400" />
          <span>{exerciseCount} drills</span>
        </span>
      </div>

      {/* Action Bar */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
          Tap to preview & start
        </span>
        <button
          className="btn btn-primary btn-sm py-2 px-4 flex items-center gap-1.5 text-xs font-black shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onStart(plan);
          }}
        >
          <Play size={13} className="fill-current" />
          <span>Start</span>
        </button>
      </div>
    </div>
  );
}
