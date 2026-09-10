import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import CameraWorkout from '../components/CameraWorkout.jsx';

export default function CameraWorkoutPage() {
  const navigate = useNavigate();
  const { planId = 'dorm_blast_20', exerciseId = 'squat' } = useParams();
  const [exercise, setExercise] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  useEffect(() => {
    api.getExercise(exerciseId).then(r => setExercise(r.data)).catch(console.error);
    api.getCoachingTip(exerciseId).then(r => setTip(r.tip)).catch(console.error);
  }, [exerciseId]);

  const handleStartWorkout = async () => {
    try {
      const res = await api.startSession({
        exerciseId,
        exerciseName: exercise?.name || exerciseId,
        planId
      });
      if (res?.data?.sessionId) {
        setActiveSessionId(res.data.sessionId);
        return res.data.sessionId;
      }
    } catch (err) {
      console.warn('Backend startSession notice (will initialize at completion):', err);
    }
    return null;
  };

  const handleFinishWorkout = async (summaryPayload) => {
    const sessionId = activeSessionId || ('session_' + Date.now());
    const exerciseName = exercise?.name || exerciseId.replace('_', ' ');

    try {
      // 1. Submit structured Vision result to backend
      const visionData = {
        sessionId,
        exerciseId,
        exerciseName,
        reps: summaryPayload.reps,
        validFormReps: summaryPayload.validFormReps || summaryPayload.reps,
        formScore: summaryPayload.formScore,
        confidence: 0.95,
        detectedIssues: (summaryPayload.feedbackLog || []).map(f => typeof f === 'string' ? f : f.text || String(f)),
        feedbackLog: summaryPayload.feedbackLog || [],
        tempoPacing: String(summaryPayload.tempoPacing || '2.0'),
        durationSeconds: summaryPayload.durationSeconds
      };
      await api.submitVisionResult(visionData).catch(e => console.warn('Vision persistence warning:', e));

      // 2. Complete session with server-calculated XP & streak updates
      const r = await api.completeSession(sessionId, {
        exerciseId,
        exerciseName,
        planId,
        totalReps: summaryPayload.reps,
        averageFormScore: summaryPayload.formScore,
        durationSeconds: summaryPayload.durationSeconds
      });

      navigate('/result', {
        state: {
          sessionId,
          exerciseId,
          exerciseName,
          result: r.data,
          vision: visionData
        }
      });
    } catch (e) {
      console.warn('Saving fallback result state:', e);
      navigate('/result', {
        state: {
          sessionId,
          exerciseId,
          exerciseName,
          result: {
            sessionId,
            totalReps: summaryPayload.reps,
            averageFormScore: summaryPayload.formScore,
            xpEarned: summaryPayload.totalScore + 100,
            caloriesBurned: Math.round(summaryPayload.durationSeconds / 60 * 8.5),
            currentStreak: 1
          },
          vision: {
            sessionId,
            exerciseId,
            exerciseName,
            reps: summaryPayload.reps,
            formScore: summaryPayload.formScore,
            detectedIssues: summaryPayload.feedbackLog || [],
            durationSeconds: summaryPayload.durationSeconds
          }
        }
      });
    }
  };

  return (
    <div className="section">
      <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
        <div>
          <h2>{exercise?.name || exerciseId.replace('_', ' ')}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            AI Edge Vision • Real-Time Form Analysis
          </p>
        </div>
        <span className="stat-pill" style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--accent)' }}>
          🤖 AI Motion Engine
        </span>
      </div>

      {/* Coaching Tip */}
      {tip && (
        <div style={{ background: 'rgba(255,217,61,0.08)', border: '1px solid rgba(255,217,61,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--accent3)', margin: 0 }}>💡 Coach Tip: {tip}</p>
        </div>
      )}

      {/* Edge Camera Workout Component */}
      <CameraWorkout
        exerciseId={exerciseId}
        onStartWorkout={handleStartWorkout}
        onFinishWorkout={handleFinishWorkout}
      />
    </div>
  );
}
