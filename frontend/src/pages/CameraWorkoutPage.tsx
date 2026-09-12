import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import CameraWorkout, { type WorkoutCompletionResult } from '../components/CameraWorkout';
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

  const handleComplete = async (result: WorkoutCompletionResult) => {
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
      // 1. Ingest Vision telemetry using exact same sessionId and REAL data from engine
      const visionPayload: any = {
        sessionId: sId,
        exerciseId: resolvedExId,
        exerciseName: exercise.name,
        reps: result.reps,
        formScore: result.formScore,
        durationSeconds: result.duration,
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.9,
        errors: Array.isArray(result.detectedErrors) ? result.detectedErrors : [],
        metrics: {
          averageAngle: typeof result.averageAngle === 'number' ? result.averageAngle : null,
          minAngle: typeof result.minAngle === 'number' ? result.minAngle : null,
          cadenceRepsPerMinute: typeof result.cadenceRepsPerMinute === 'number'
            ? result.cadenceRepsPerMinute
            : Math.round((result.reps / Math.max(1, result.duration)) * 60),
        },
        visionVersion: result.visionVersion || '2.0.0-mediapipe',
      };

      await api.submitVisionResult(visionPayload);

      // 2. Authoritative session completion using exact same sessionId
      const compRes: any = await api.completeSession(sId, {
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
          completionData: compRes?.data,
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
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center gap-4 p-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 bg-neon/20 rounded-full blur-2xl animate-pulse" />
          <div className="spinner w-10 h-10 border-[3px] border-neon/20 border-t-neon" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-white tracking-tight">Initializing Vision Studio</h3>
          <p className="text-xs text-slate-400 mt-1">Calibrating MediaPipe biomechanical models…</p>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20 text-3xl">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-white">Exercise Not Found</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
          The requested movement drill could not be resolved from your library.
        </p>
        <button className="btn btn-primary mt-5" onClick={() => navigate('/workout')}>
          Back to Workout Library
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian flex flex-col relative overflow-hidden">
      {/* Studio Header Overlay */}
      <header className="px-4 py-3.5 z-20 flex justify-between items-center bg-gradient-to-b from-obsidian/95 via-obsidian/80 to-transparent backdrop-blur-sm border-b border-white/5">
        <button
          className="btn btn-sm btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <span>✕</span>
          <span>Exit</span>
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-neon uppercase tracking-wider">AI Pose Engine</span>
          </div>
          <h3 className="text-white font-black text-sm sm:text-base tracking-tight leading-tight">
            {exercise.name}
          </h3>
        </div>

        <div className="w-16 flex justify-end">
          <span className="text-[10px] font-mono font-bold text-cyan px-2 py-0.5 rounded-full bg-cyan/10 border border-cyan/30">
            60 FPS
          </span>
        </div>
      </header>

      {/* Main Studio Arena */}
      <main className="flex-1 flex flex-col p-4 relative justify-center items-center">
        <div className="w-full h-full max-w-[500px] mx-auto flex flex-col items-center justify-center animate-fade-in">
          {completionError && (
            <div className="w-full mb-3 p-3.5 bg-rose-950/80 border border-rose-500/40 rounded-2xl text-center text-xs text-rose-200 shadow-lg animate-slide-up">
              <p className="mb-2 font-bold flex items-center justify-center gap-1.5">
                <span>⚠️</span>
                <span>{completionError}</span>
              </p>
              {lastResult && (
                <button
                  onClick={() => handleComplete(lastResult)}
                  disabled={isCompleting}
                  className="btn btn-secondary text-xs px-4 py-2 cursor-pointer shadow"
                >
                  {isCompleting ? 'Saving Telemetry…' : '🔄 Retry Finalizing Session'}
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
      </main>
    </div>
  );
}
