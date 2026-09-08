import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';

const PHASE_LABELS = { idle: 'Get Ready', down: '⬇️ Going Down…', up: '⬆️ Push Up!', hold: '🔒 Hold!' };
const FEEDBACK_COLORS = { good: 'var(--accent4)', warning: 'var(--accent3)', error: 'var(--accent2)' };

// Simulated pose keypoints for the skeleton visualization
const KEYPOINTS = [
  { name: 'head', x: 50, y: 12 },
  { name: 'shoulder_l', x: 38, y: 26 }, { name: 'shoulder_r', x: 62, y: 26 },
  { name: 'elbow_l', x: 32, y: 42 }, { name: 'elbow_r', x: 68, y: 42 },
  { name: 'wrist_l', x: 28, y: 56 }, { name: 'wrist_r', x: 72, y: 56 },
  { name: 'hip_l', x: 40, y: 54 }, { name: 'hip_r', x: 60, y: 54 },
  { name: 'knee_l', x: 38, y: 70 }, { name: 'knee_r', x: 62, y: 70 },
  { name: 'ankle_l', x: 38, y: 86 }, { name: 'ankle_r', x: 62, y: 86 },
];
const BONES = [
  ['head','shoulder_l'],['head','shoulder_r'],['shoulder_l','shoulder_r'],
  ['shoulder_l','elbow_l'],['shoulder_r','elbow_r'],
  ['elbow_l','wrist_l'],['elbow_r','wrist_r'],
  ['shoulder_l','hip_l'],['shoulder_r','hip_r'],['hip_l','hip_r'],
  ['hip_l','knee_l'],['hip_r','knee_r'],
  ['knee_l','ankle_l'],['knee_r','ankle_r'],
];

function PoseSkeleton({ phase, exerciseId }) {
  const offset = phase === 'down' ? 8 : 0;
  const kpMap = Object.fromEntries(KEYPOINTS.map(k => [k.name, { x: k.x, y: k.y + (k.name.includes('knee') || k.name.includes('ankle') ? offset : 0) }]));
  return (
    <svg viewBox="0 0 100 100" style={{ width: '60%', height: '60%', position: 'absolute' }}>
      {BONES.map(([a, b]) => (
        <line key={a+b} x1={kpMap[a].x} y1={kpMap[a].y} x2={kpMap[b].x} y2={kpMap[b].y}
          stroke="rgba(108,99,255,0.7)" strokeWidth="2.5" strokeLinecap="round" />
      ))}
      {KEYPOINTS.map(k => (
        <circle key={k.name} cx={kpMap[k.name].x} cy={kpMap[k.name].y} r="2.5"
          fill={k.name === 'head' ? 'var(--accent2)' : 'var(--accent)'} />
      ))}
    </svg>
  );
}

export default function CameraWorkoutPage() {
  const navigate = useNavigate();
  const { planId = 'dorm_blast_20', exerciseId = 'squat' } = useParams();
  const [exercise, setExercise] = useState(null);
  const [tip, setTip] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [started, setStarted] = useState(false);
  const [reps, setReps] = useState(0);
  const [formScore, setFormScore] = useState(87);
  const [feedback, setFeedback] = useState(['📱 Position your device 2-3m away so your full body is in frame.']);
  const [phase, setPhase] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [stopping, setStopping] = useState(false);
  const timerRef = useRef(null);
  const repTimerRef = useRef(null);

  useEffect(() => {
    api.getExercise(exerciseId).then(r => setExercise(r.data)).catch(console.error);
    api.getCoachingTip(exerciseId).then(r => setTip(r.tip)).catch(console.error);
  }, [exerciseId]);

  const startSession = async () => {
    try {
      const r = await api.startSession({ exerciseId, planId });
      setSessionId(r.data.sessionId);
      setStarted(true);
      // Start timer
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      // Start simulated rep detection
      simulateReps();
    } catch (e) { console.error(e); }
  };

  const simulateReps = () => {
    let repCount = 0;
    let currentPhase = 'idle';
    const phases = ['down', 'up'];
    let phaseIdx = 0;
    repTimerRef.current = setInterval(async () => {
      currentPhase = phases[phaseIdx % 2];
      setPhase(currentPhase);
      if (currentPhase === 'up') {
        repCount++;
        setReps(repCount);
        // Analyze form every rep
        try {
          const r = await api.analyzeForm({ exerciseId, timestamp: Date.now() });
          setFormScore(r.data.formScore);
          setFeedback(r.data.feedback);
        } catch (_) {}
      }
      phaseIdx++;
    }, 1800);
  };

  const stopWorkout = useCallback(async () => {
    clearInterval(timerRef.current);
    clearInterval(repTimerRef.current);
    setStopping(true);
    try {
      const r = await api.completeSession(sessionId || 'demo_session', {
        exerciseId, totalReps: reps, averageFormScore: formScore, durationSeconds: elapsed
      });
      navigate('/result', { state: { result: r.data } });
    } catch (e) {
      console.error(e);
      navigate('/result', { state: { result: { totalReps: reps, averageFormScore: formScore, xpEarned: reps * 10 + 100, caloriesBurned: Math.round(elapsed / 60 * 8), currentStreak: 1 } } });
    }
  }, [sessionId, reps, formScore, elapsed, exerciseId, navigate]);

  // Auto-stop at 50 reps for demo
  useEffect(() => { if (reps >= 50 && started) stopWorkout(); }, [reps]);

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const formColor = formScore >= 85 ? 'var(--accent4)' : formScore >= 70 ? 'var(--accent3)' : 'var(--accent2)';

  return (
    <div className="section">
      <div className="flex justify-between items-center">
        <div>
          <h2>{exercise?.name || exerciseId}</h2>
          <p style={{ fontSize: 13 }}>{exercise?.category?.replace('_', ' ')}</p>
        </div>
        <span className="stat-pill">⏱️ {fmt(elapsed)}</span>
      </div>

      {/* Camera View */}
      <div className="camera-view">
        {started ? (
          <>
            <PoseSkeleton phase={phase} exerciseId={exerciseId} />
            {/* Rep flash overlay */}
            <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ background: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: '8px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PHASE</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>{PHASE_LABELS[phase]}</div>
              </div>
              <div className="form-score-ring" style={{ borderColor: formColor, background: 'rgba(0,0,0,0.7)', color: formColor, width: 64, height: 64 }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{formScore}</div>
                <div style={{ fontSize: 9 }}>FORM</div>
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
              <div className="rep-counter" style={{ textShadow: '0 0 30px var(--accent-glow)' }}>{reps}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>reps</div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>📸</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Position yourself in frame</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Stand 2-3 metres from device</div>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback.length > 0 && (
        <div style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
          {feedback.map((f, i) => <p key={i} style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>{f}</p>)}
        </div>
      )}

      {/* Coaching Tip */}
      {tip && (
        <div style={{ background: 'rgba(255,217,61,0.08)', border: '1px solid rgba(255,217,61,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
          <p style={{ fontSize: 13, color: 'var(--accent3)', margin: 0 }}>{tip}</p>
        </div>
      )}

      {/* Instructions */}
      {exercise && !started && (
        <div className="card">
          <h4 style={{ marginBottom: 8 }}>How to do {exercise.name}</h4>
          {exercise.instructions.map((step, i) => (
            <div key={i} className="flex gap-8" style={{ marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, minWidth: 18 }}>{i + 1}.</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      {!started ? (
        <button className="btn btn-primary btn-full" style={{ fontSize: 17 }} onClick={startSession}>
          🎬 Start AI Workout
        </button>
      ) : (
        <button className="btn btn-danger btn-full" style={{ fontSize: 17 }} onClick={stopWorkout} disabled={stopping}>
          {stopping ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : '⏹️ Stop & Save Workout'}
        </button>
      )}
    </div>
  );
}
