import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import CameraWorkout from '../components/CameraWorkout';
import { useWorkout } from '../context/WorkoutContext';
import type { WorkoutPlan, Exercise } from '../types';

export default function CameraWorkoutPage() {
  const { planId, exerciseId } = useParams();
  const navigate = useNavigate();
  const { setSessionId, endWorkout } = useWorkout();

  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  useEffect(() => {
    const exId = exerciseId || 'squat';
    Promise.all([
      api.getExercise(exId).catch(() => ({ data: null })),
      planId && planId !== 'free' ? api.getWorkout(planId).catch(() => ({ data: null })) : Promise.resolve({ data: null })
    ]).then(([eRes, pRes]: any[]) => {
      setExercise(eRes.data);
      setPlan(pRes.data);
      setLoading(false);
    });
  }, [planId, exerciseId]);

  const handleStartSession = async () => {
    if (!exercise) return;
    try {
      const res: any = await api.startSession({
        exerciseId: exercise.id,
        planId: planId !== 'free' ? planId : undefined
      });
      setSessionId(res.data.id);
      setSessionStarted(true);
    } catch (err) {
      console.error('Failed to start session', err);
      // Fallback for demo
      setSessionId(`demo_sess_${Date.now()}`);
      setSessionStarted(true);
    }
  };

  const handleComplete = async (result: { reps: number; formScore: number; duration: number; streak: number }) => {
    endWorkout();
    navigate('/result', {
      state: {
        result,
        exercise,
        planId
      }
    });
  };

  if (loading) {
    return <div className="min-h-screen bg-obsidian flex items-center justify-center"><span className="spinner w-8 h-8" /></div>;
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-4">⚠️</span>
        <h2 className="text-white">Exercise not found</h2>
        <button className="btn btn-primary mt-6" onClick={() => navigate('/workout')}>Back to Library</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian flex flex-col relative overflow-hidden">
      {/* Header overlaid on camera if started, normal otherwise */}
      <div className={`p-4 z-10 flex justify-between items-center ${sessionStarted ? 'absolute top-0 w-full bg-gradient-to-b from-black/80 to-transparent' : ''}`}>
        <button className="btn btn-sm btn-secondary" onClick={() => navigate(-1)}>✕ Cancel</button>
        <h3 className="text-white font-bold">{exercise.name}</h3>
        <div className="w-16" /> {/* spacer for alignment */}
      </div>

      <div className="flex-1 flex flex-col p-4 relative justify-center">
        {!sessionStarted ? (
          <div className="card flex flex-col items-center text-center p-8 animate-in max-w-[400px] mx-auto w-full">
            <span className="text-6xl mb-4">{exercise.icon}</span>
            <h2 className="text-white mb-2">{exercise.name}</h2>
            <p className="text-sm text-muted mb-6">{exercise.description}</p>

            <div className="flex gap-2 flex-wrap justify-center mb-8">
              {exercise.targetMuscles.map(m => (
                <span key={m} className="badge-pill">{m}</span>
              ))}
            </div>

            <button className="btn btn-primary btn-full py-4 text-lg" onClick={handleStartSession}>
              📸 Ready Camera
            </button>
          </div>
        ) : (
          <div className="w-full h-full max-w-[500px] mx-auto flex items-center justify-center animate-in">
            <CameraWorkout
              exerciseId={exercise.id as any}
              onComplete={handleComplete}
              targetReps={plan ? plan.exercises.find(e => e.exerciseId === exercise.id)?.reps : 20}
            />
          </div>
        )}
      </div>
    </div>
  );
}
