import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import CameraWorkout from '../components/CameraWorkout.jsx';

export default function CameraWorkoutPage() {
  const navigate = useNavigate();
  const { planId = 'dorm_blast_20', exerciseId = 'squat' } = useParams();
  const [exercise, setExercise] = useState(null);
  const [tip, setTip] = useState('');

  useEffect(() => {
    api.getExercise(exerciseId).then(r => setExercise(r.data)).catch(console.error);
    api.getCoachingTip(exerciseId).then(r => setTip(r.tip)).catch(console.error);
  }, [exerciseId]);

  const handleFinishWorkout = async (summaryPayload) => {
    try {
      const r = await api.completeSession('camera_session_' + Date.now(), {
        exerciseId,
        totalReps: summaryPayload.reps,
        averageFormScore: summaryPayload.formScore,
        durationSeconds: summaryPayload.durationSeconds
      });
      navigate('/result', { state: { result: r.data } });
    } catch (e) {
      console.warn('Saving fallback result state:', e);
      navigate('/result', {
        state: {
          result: {
            totalReps: summaryPayload.reps,
            averageFormScore: summaryPayload.formScore,
            xpEarned: summaryPayload.totalScore + 100,
            caloriesBurned: Math.round(summaryPayload.durationSeconds / 60 * 8),
            currentStreak: 1
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
        onFinishWorkout={handleFinishWorkout}
      />
    </div>
  );
}
