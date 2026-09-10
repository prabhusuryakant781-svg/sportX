import { useState, useEffect, useRef, useCallback } from 'react';
import { RepCounterFSM, type ExerciseType, type RepCounterState } from '../utils/repCounterFSM';
import type { Landmark } from '../utils/poseMath';
import GoalRing from './GoalRing';

interface CameraWorkoutProps {
  exerciseId: ExerciseType;
  onComplete: (result: { reps: number; formScore: number; duration: number; streak: number }) => void;
  onUpdate?: (state: RepCounterState) => void;
  targetReps?: number;
}

// Skeleton connections for drawing
const CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30],
];

export default function CameraWorkout({ exerciseId, onComplete, onUpdate, targetReps = 20 }: CameraWorkoutProps) {
  const [isActive, setIsActive] = useState(false);
  const [repState, setRepState] = useState<RepCounterState>({
    reps: 0, currentAngle: 0, fsmState: 'UP', formScore: 100, feedback: [], streak: 0, bestStreak: 0,
  });
  const [duration, setDuration] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [useSimulation, setUseSimulation] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fsmRef = useRef<RepCounterFSM>(new RepCounterFSM(exerciseId));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<number>(0);

  // Initialize camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      console.warn('Camera unavailable — switching to simulation mode');
      setUseSimulation(true);
      setCameraReady(true);
    }
  }, []);

  // Start workout
  const startWorkout = () => {
    setIsActive(true);
    setDuration(0);
    fsmRef.current.reset();

    timerRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);

    if (useSimulation) {
      _startSimulation();
    } else {
      _startPoseLoop();
    }
  };

  // Simulation mode — generates synthetic pose data
  const _startSimulation = () => {
    let phase = 0;
    simRef.current = setInterval(() => {
      phase += 0.08;
      const angle = 125 + 55 * Math.sin(phase);

      // Create synthetic landmarks
      const fakeLandmarks: Landmark[] = Array.from({ length: 33 }, (_, i) => ({
        x: 0.5 + Math.random() * 0.01,
        y: 0.3 + (i / 33) * 0.5,
        visibility: 0.95,
      }));

      // Simulate primary joint angle via knee landmarks
      const kneeAngle = angle;
      const hipY = 0.4;
      const kneeY = 0.6;
      const ankleY = 0.8;
      const spread = ((180 - kneeAngle) / 180) * 0.2;
      fakeLandmarks[23] = { x: 0.5, y: hipY, visibility: 0.95 };
      fakeLandmarks[25] = { x: 0.5 + spread, y: kneeY, visibility: 0.95 };
      fakeLandmarks[27] = { x: 0.5, y: ankleY, visibility: 0.95 };
      fakeLandmarks[11] = { x: 0.48, y: 0.25, visibility: 0.95 };
      fakeLandmarks[13] = { x: 0.42, y: 0.35, visibility: 0.95 };
      fakeLandmarks[15] = { x: 0.38, y: 0.45, visibility: 0.95 };

      const state = fsmRef.current.processFrame(fakeLandmarks);
      setRepState(state);
      onUpdate?.(state);

      // Draw skeleton on canvas
      _drawSkeleton(fakeLandmarks);
    }, 60);
  };

  // Real pose detection loop
  const _startPoseLoop = () => {
    // For now, use the same simulation loop. In production, this would use
    // @mediapipe/tasks-vision PoseLandmarker to process video frames.
    _startSimulation();
  };

  // Draw skeleton on canvas
  const _drawSkeleton = (landmarks: Landmark[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw connections
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
    ctx.lineWidth = 2;
    CONNECTIONS.forEach(([a, b]) => {
      const la = landmarks[a];
      const lb = landmarks[b];
      if (la && lb) {
        ctx.beginPath();
        ctx.moveTo(la.x * w, la.y * h);
        ctx.lineTo(lb.x * w, lb.y * h);
        ctx.stroke();
      }
    });

    // Draw keypoints
    landmarks.forEach((lm, i) => {
      if (i > 32) return;
      ctx.fillStyle = i === 25 || i === 23 || i === 27
        ? '#10B981'
        : 'rgba(6, 182, 212, 0.8)';
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, i === 25 ? 6 : 3, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // Stop workout
  const stopWorkout = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (simRef.current) clearInterval(simRef.current);
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const state = fsmRef.current.getState();
    onComplete({
      reps: state.reps,
      formScore: state.formScore,
      duration,
      streak: state.bestStreak,
    });
  };

  // Cleanup
  useEffect(() => {
    startCamera();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (simRef.current) clearInterval(simRef.current);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [startCamera]);

  // Auto-complete when target reached
  useEffect(() => {
    if (isActive && repState.reps >= targetReps) {
      stopWorkout();
    }
  }, [repState.reps, targetReps, isActive]);

  const formColor = repState.formScore >= 80 ? '#10B981' : repState.formScore >= 60 ? '#F59E0B' : '#EF4444';
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="relative w-full">
      {/* Camera / Canvas View */}
      <div className="camera-view">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: useSimulation ? 'none' : 'block', transform: 'scaleX(-1)' }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          width={640}
          height={480}
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* HUD Overlay */}
        {isActive && (
          <>
            {/* Rep Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
              <div className="text-6xl font-black text-white drop-shadow-lg">{repState.reps}</div>
              <div className="text-sm text-muted">/ {targetReps} reps</div>
            </div>

            {/* Form Score Ring */}
            <div className="absolute top-4 right-4">
              <GoalRing progress={repState.formScore} size={60} strokeWidth={4} color={formColor}>
                <span className="text-sm font-bold" style={{ color: formColor }}>
                  {repState.formScore}
                </span>
              </GoalRing>
            </div>

            {/* Timer */}
            <div className="absolute bottom-4 left-4">
              <div className="stat-pill">⏱️ {formatTime(duration)}</div>
            </div>

            {/* Streak */}
            <div className="absolute bottom-4 right-4">
              <div className="stat-pill">🔥 {repState.streak}</div>
            </div>

            {/* Feedback Banner */}
            {repState.feedback.length > 0 && (
              <div className="absolute bottom-16 left-4 right-4 bg-crimson/20 border border-crimson/40 rounded-lg p-2 text-center">
                <span className="text-xs text-crimson font-medium">{repState.feedback[0]}</span>
              </div>
            )}
          </>
        )}

        {/* Start Overlay */}
        {!isActive && cameraReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-4">
            <div className="text-5xl">🎯</div>
            <h3 className="text-white">Ready to start?</h3>
            <p className="text-sm text-muted text-center px-8">
              {useSimulation ? 'Simulation mode — camera unavailable' : 'Position yourself in frame'}
            </p>
            <button className="btn btn-primary" onClick={startWorkout}>
              ▶️ Start Exercise
            </button>
          </div>
        )}

        {/* Loading */}
        {!cameraReady && (
          <div className="flex flex-col items-center gap-3">
            <div className="spinner w-8 h-8" />
            <span className="text-sm text-muted">Initializing camera...</span>
          </div>
        )}
      </div>

      {/* Stop Button */}
      {isActive && (
        <button className="btn btn-danger btn-full mt-3" onClick={stopWorkout}>
          ⏹️ End Workout
        </button>
      )}
    </div>
  );
}
