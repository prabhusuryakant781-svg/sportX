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
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

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
    if (!exercise || isStarting) return;
    setIsStarting(true);
    setStartError(null);
    try {
      const res: any = await api.startSession({
        exerciseId: exercise.id,
        planId: planId !== 'free' ? planId : undefined,
      });
      const sId = res?.data?.sessionId || res?.data?.id;
      if (!sId) {
        throw new Error('Server did not return a valid sessionId');
      }
      setActiveSessionId(sId);
      setSessionId(sId);
      setSessionStarted(true);
    } catch (err: any) {
      console.error('[CameraWorkoutPage] Failed to start session:', err);
      setStartError(err.message || 'Failed to start workout session on server. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleComplete = async (result: { reps: number; formScore: number; duration: number; streak: number }) => {
    if (!exercise) return;
    setLastResult(result);
    setIsCompleting(true);
    setCompletionError(null);

    const sId = activeSessionId;
    if (!sId) {
      setCompletionError('No active server session ID found. Cannot finalize session.');
      setIsCompleting(false);
      return;
    }

    try {
      // 1. Ingest Vision telemetry using exact same sessionId
      await api.submitVisionResult({
        sessionId: sId,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        reps: result.reps,
        formScore: result.formScore,
        durationSeconds: result.duration,
        confidence: 0.95,
        errors: result.formScore < 80 ? [{ code: 'knees_inward', severity: 'medium' }] : [],
        metrics: {
          averageAngle: 90,
          cadenceRepsPerMinute: Math.round((result.reps / Math.max(1, result.duration)) * 60),
        },
        visionVersion: '2.0.0-mediapipe',
      });

      // 2. Authoritative session completion using exact same sessionId
      await api.completeSession(sId, {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        totalReps: result.reps,
        averageFormScore: result.formScore,
        durationSeconds: result.duration,
      });

      endWorkout();
      navigate('/result', {
        state: {
          sessionId: sId,
          result,
          exercise,
          planId,
        },
      });
    } catch (e: any) {
      console.error('[CameraWorkoutPage] Session completion error:', e);
      setCompletionError(e.message || 'Failed to save workout results. Please retry.');
    } finally {
      setIsCompleting(false);
    }
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

            {startError && (
              <div className="text-rose-400 text-xs p-3 mb-4 bg-rose-500/10 rounded-lg border border-rose-500/30 text-center">
                ⚠️ {startError}
              </div>
            )}

            <button
              className="btn btn-primary btn-full py-4 text-lg disabled:opacity-50"
              onClick={handleStartSession}
              disabled={isStarting}
            >
              {isStarting ? <span className="spinner w-5 h-5 mx-auto" /> : '📸 Ready Camera'}
            </button>
          </div>
        ) : (
          <div className="w-full h-full max-w-[500px] mx-auto flex flex-col items-center justify-center animate-in">
            {completionError && (
              <div className="w-full mb-3 p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-center text-xs text-rose-200">
                <p className="mb-2 font-semibold">⚠️ {completionError}</p>
                {lastResult && (
                  <button
                    onClick={() => handleComplete(lastResult)}
                    disabled={isCompleting}
                    className="btn btn-secondary text-xs px-4 py-1.5"
                  >
                    {isCompleting ? 'Saving...' : '🔄 Retry Saving Results'}
                  </button>
                )}
              </div>
            )}
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
