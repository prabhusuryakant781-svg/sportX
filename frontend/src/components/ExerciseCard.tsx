import type { Exercise } from '../types';
import { Camera, Check, ChevronRight, Activity } from 'lucide-react';
import { isCameraSupported } from '../utils/exerciseUtils';

interface ExerciseCardProps {
  exercise: Exercise;
  onSelect?: (exercise: Exercise) => void;
  selected?: boolean;
}

export default function ExerciseCard({ exercise, onSelect, selected }: ExerciseCardProps) {
  const exId = exercise.id || exercise.exerciseId;
  const hasCamera = isCameraSupported(exId);

  const iconEmoji = exercise.icon || (
    exId?.includes('pushup')
      ? '💪'
      : exId?.includes('jumping')
      ? '⚡'
      : exId?.includes('run') || exId?.includes('jog')
      ? '🏃'
      : exId?.includes('walk')
      ? '🚶'
      : exId?.includes('stretch') || exId?.includes('mobility')
      ? '🧘'
      : exId?.includes('squat')
      ? '🏋️'
      : '🎯'
  );

  return (
    <button
      type="button"
      onClick={() => onSelect?.(exercise)}
      className={`card text-left w-full transition-all duration-200 cursor-pointer p-4 group select-none ${
        selected
          ? 'border-neon bg-neon/10 shadow-glow-sm'
          : 'hover:border-white/20'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 transition-colors ${
          selected ? 'bg-neon/20 border border-neon/40' : 'bg-surface border border-white/5 group-hover:border-white/10'
        }`}>
          {iconEmoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-white font-bold text-sm truncate group-hover:text-neon transition-colors">
              {exercise.name}
            </h4>
            {selected && (
              <span className="w-5 h-5 rounded-full bg-neon text-obsidian flex items-center justify-center flex-shrink-0">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 capitalize">
              {exercise.category || 'Compound Drill'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[10px] font-bold text-cyan uppercase tracking-wider px-1.5 py-0.2 rounded bg-cyan/10 border border-cyan/20">
              {exercise.difficulty || 'All Levels'}
            </span>
            <span className="text-slate-600">•</span>
            {hasCamera ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neon uppercase tracking-wider px-1.5 py-0.2 rounded bg-neon/10 border border-neon/20">
                <Camera size={10} />
                <span>AI Vision</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider px-1.5 py-0.2 rounded bg-surface-light border border-white/5">
                <Activity size={10} />
                <span>Guided Drill</span>
              </span>
            )}
          </div>

          {Array.isArray(exercise.targetMuscles) && exercise.targetMuscles.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {exercise.targetMuscles.slice(0, 3).map((m, i) => (
                <span key={i} className="text-[10px] text-slate-400 bg-surface/80 px-2 py-0.5 rounded-md border border-white/5">
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={`flex items-center gap-1 flex-shrink-0 pl-1 transition-colors ${
          hasCamera ? 'text-neon/80 group-hover:text-neon' : 'text-slate-500 group-hover:text-cyan'
        }`}>
          {hasCamera ? <Camera size={18} /> : <Activity size={18} />}
          <ChevronRight size={14} />
        </div>
      </div>
    </button>
  );
}
