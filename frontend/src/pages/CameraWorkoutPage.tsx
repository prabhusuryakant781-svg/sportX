import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import CameraWorkout from '../components/CameraWorkout';
import { useWorkout } from '../context/WorkoutContext';
import { normalizeExerciseId } from '../utils/exerciseUtils';
import type { WorkoutPlan, Exercise } from '../types';

export default function CameraWorkoutPage() {
  const params = useParams<{ planId?: string; exerciseId?: string }>();
  const navigate = useNavigate();
  const { setSessionId, endWorkout } = useWorkout();

  // Resolve raw parameters
  let rawPlanId = params.planId;
  let rawExerciseId = params.exerciseId;

  // Handle single param case: e.g. /camera/:exerciseId
  if (!rawExerciseId && rawPlanId) {
    rawExerciseId = rawPlanId;
    rawPlanId = 'free';
  }

  // Canonical normalization
  const cleanPlanId = (!rawPlanId || rawPlanId === 'undefined' || rawPlanId === 'null') ? 'free' : rawPlanId;
  const cleanExerciseId = normalizeExerciseId(rawExerciseId);

  // Self-heal: If route has "undefined" or was single-parameter, replace with canonical /camera/:planId/:exerciseId
  useEffect(() => {
    if (
      params.planId === 'undefined' ||
      params.exerciseId === 'undefined' ||
      !params.exerciseId ||
      params.exerciseId !== cleanExerciseId
    ) {
      navigate(`/camera/${cleanPlanId}/${cleanExerciseId}`, { replace: true });
    }
  }, [params.planId, params.exerciseId, cleanPlanId, cleanExerciseId, navigate]);

  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => {
    const exId = cleanExerciseId;
    Promise.all([
      api.getExercise(exId).catch(() => ({
        data: {
          id: exId,
          exerciseId: exId,
          name: exId === 'pushup' ? 'Push-Ups' : exId === 'jumping_jacks' ? 'Jumping Jacks' : 'Bodyweight Squats',
          category: 'strength',
          targetMuscles: ['quads', 'glutes', 'core'],
          difficulty: 'beginner',
          description: 'Full-body functional exercise tracked with MediaPipe vision.',
          icon: exId === 'pushup' ? '💪' : exId === 'jumping_jacks' ? '⭐' : '🏋️',
        }
      })),
      cleanPlanId !== 'free' ? api.getWorkout(cleanPlanId).catch(() => ({ data: null })) : Promise.resolve({ data: null })
    ]).then(([eRes, pRes]: any[]) => {
      const rawEx = eRes?.data || {};
      const resolvedEx: Exercise = {
        ...rawEx,
        id: rawEx.id || rawEx.exerciseId || exId,
        exerciseId: rawEx.exerciseId || rawEx.id || exId,
        name: rawEx.name || (exId === 'pushup' ? 'Push-Ups' : exId === 'jumping_jacks' ? 'Jumping Jacks' : 'Bodyweight Squats'),
      };
      setExercise(resolvedEx);
      setPlan(pRes?.data || null);
      setLoading(false);
    });
  }, [cleanPlanId, cleanExerciseId]);

  // Seamlessly initiate backend session for workout
  const initSession = useCallback(async (exId: string) => {
    if (activeSessionId || isStarting) return;
    setIsStarting(true);
    try {
      const res: any = await api.startSession({
        exerciseId: exId,
        planId: cleanPlanId !== 'free' ? cleanPlanId : undefined,
      });
      const sId = res?.data?.sessionId || res?.data?.id;
      if (sId) {
        setActiveSessionId(sId);
        setSessionId(sId);
      }
    } catch (err: any) {
      console.warn('[CameraWorkoutPage] Session initialization notice:', err.message);
    } finally {
      setIsStarting(false);
    }
  }, [activeSessionId, isStarting, cleanPlanId, setSessionId]);

  // Automatically initiate backend session once exercise is loaded
  useEffect(() => {
    if (exercise?.id) {
      initSession(exercise.id);
    }
  }, [exercise?.id, initSession]);

  const handleStartWorkout = () => {
    if (exercise?.id && !activeSessionId) {
      initSession(exercise.id);
    }
  };

  const handleComplete = async (result: { reps: number; formScore: number; duration: number; streak: number }) => {
    if (!exercise) return;
    setLastResult(result);
    setIsCompleting(true);
    setCompletionError(null);

    let sId = activeSessionId;
    if (!sId) {
      try {
        const res: any = await api.startSession({
          exerciseId: exercise.id || exercise.exerciseId || cleanExerciseId,
          planId: cleanPlanId !== 'free' ? cleanPlanId : undefined,
        });
        sId = res?.data?.sessionId || res?.data?.id;
        if (sId) {
          setActiveSessionId(sId);
          setSessionId(sId);
        }
      } catch (err: any) {
        console.error('[CameraWorkoutPage] On-demand session start error:', err);
      }
    }

    if (!sId) {
      setCompletionError('No active server session ID found. Cannot finalize session.');
      setIsCompleting(false);
      return;
    }

    try {
      const resolvedExId = exercise.id || exercise.exerciseId || cleanExerciseId;
      // 1. Ingest Vision telemetry using exact same sessionId
      await api.submitVisionResult({
        sessionId: sId,
        exerciseId: resolvedExId,
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
        exerciseId: resolvedExId,
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
          planId: cleanPlanId !== 'free' ? cleanPlanId : undefined,
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
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center gap-3">
        <span className="spinner w-8 h-8" />
        <p className="text-xs text-muted">Preparing workout studio…</p>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-4">⚠️</span>
        <h2 className="text-white font-bold">Exercise not found</h2>
        <button className="btn btn-primary mt-6" onClick={() => navigate('/workout')}>Back to Library</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian flex flex-col relative overflow-hidden">
      {/* Header overlaid on camera */}
      <div className="p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <button className="btn btn-sm btn-secondary cursor-pointer" onClick={() => navigate(-1)}>✕ Cancel</button>
        <div className="text-center">
          <h3 className="text-white font-bold text-sm sm:text-base">{exercise.name}</h3>
          <span className="text-[11px] text-muted">AI Pose Tracking</span>
        </div>
        <div className="w-16" /> {/* spacer for alignment */}
      </div>

      <div className="flex-1 flex flex-col p-4 relative justify-center items-center">
        <div className="w-full h-full max-w-[500px] mx-auto flex flex-col items-center justify-center animate-in">
          {completionError && (
            <div className="w-full mb-3 p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-center text-xs text-rose-200">
              <p className="mb-2 font-semibold">⚠️ {completionError}</p>
              {lastResult && (
                <button
                  onClick={() => handleComplete(lastResult)}
                  disabled={isCompleting}
                  className="btn btn-secondary text-xs px-4 py-1.5 cursor-pointer"
                >
                  {isCompleting ? 'Saving...' : '🔄 Retry Saving Results'}
                </button>
              )}
            </div>
          )}
          <CameraWorkout
            exerciseId={cleanExerciseId as any}
            onComplete={handleComplete}
            onStartWorkout={handleStartWorkout}
            targetReps={
              plan?.exercises
                ? plan.exercises.find(e => normalizeExerciseId(e.exerciseId) === cleanExerciseId)?.reps || 20
                : 20
            }
          />
        </div>
      </div>
    </div>
  );
}
