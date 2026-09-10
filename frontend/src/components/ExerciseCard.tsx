import type { Exercise } from '../types';

interface ExerciseCardProps {
  exercise: Exercise;
  onSelect?: (exercise: Exercise) => void;
  selected?: boolean;
}

export default function ExerciseCard({ exercise, onSelect, selected }: ExerciseCardProps) {
  return (
    <button
      onClick={() => onSelect?.(exercise)}
      className={`card text-left w-full transition-all duration-200 ${
        selected ? 'border-neon/40 bg-neon/10' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{exercise.icon || '🏃'}</span>
        <div className="flex-1">
          <h4 className="text-white font-semibold">{exercise.name}</h4>
          <p className="text-xs text-muted mt-0.5">{exercise.category} • {exercise.difficulty}</p>
        </div>
        {selected && <span className="text-neon text-lg">✓</span>}
      </div>
    </button>
  );
}
