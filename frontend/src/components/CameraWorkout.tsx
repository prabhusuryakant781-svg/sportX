import { useState, useEffect, useRef, useCallback } from 'react';
import { RepCounterFSM, type ExerciseType, type RepCounterState } from '../utils/repCounterFSM';
import { initializePoseLandmarker, detectPose, closePoseLandmarker } from '../services/poseLandmarker';
import type { Landmark } from '../utils/poseMath';
import GoalRing from './GoalRing';

interface CameraWorkoutProps {
  exerciseId: ExerciseType;
  onComplete: (result: { reps: number; formScore: number; duration: number; streak: number }) => void;
  onUpdate?: (state: RepCounterState) => void;
  onStartWorkout?: () => void;
  targetReps?: number;
}

// MediaPipe 33-point pose landmark connections for full-body skeleton rendering
const SKELETON_CONNECTIONS: [number, number][] = [
  // Upper body & torso
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  // Lower body
  [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]
];

export default function CameraWorkout({
  exerciseId,
  onComplete,
  onUpdate,
  onStartWorkout,
  targetReps = 20,
}: CameraWorkoutProps) {
  const [isActive, setIsActive] = useState(false);
  const [repState, setRepState] = useState<RepCounterState>({
    reps: 0,
    currentAngle: 0,
    fsmState: 'UP',
    formScore: 100,
    feedback: [],
    streak: 0,
    bestStreak: 0,
  });
  const [duration, setDuration] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [mediaPipeReady, setMediaPipeReady] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [positioningFeedback, setPositioningFeedback] = useState<string | null>(null);
  const [isBodyDetected, setIsBodyDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fsmRef = useRef<RepCounterFSM>(new RepCounterFSM(exerciseId));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  // Sync ref for animation loop
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Check landmark positioning based on exercise requirements
  const checkPositioning = useCallback((landmarks: Landmark[]): { isAcceptable: boolean; message: string | null } => {
    if (!landmarks || landmarks.length < 33) {
      return { isAcceptable: false, message: 'Body not detected. Step in front of the camera.' };
    }

    // Key landmark visibility checks
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];

    const minVis = 0.45;

    if (exerciseId === 'squat') {
      const hipsVisible = (leftHip?.visibility ?? 1) > minVis || (rightHip?.visibility ?? 1) > minVis;
      const kneesVisible = (leftKnee?.visibility ?? 1) > minVis || (rightKnee?.visibility ?? 1) > minVis;
      const anklesVisible = (leftAnkle?.visibility ?? 1) > minVis || (rightAnkle?.visibility ?? 1) > minVis;

      if (!hipsVisible && !kneesVisible) {
        return { isAcceptable: false, message: 'Step back so your full body is visible.' };
      }
      if (!kneesVisible || !anklesVisible) {
        return { isAcceptable: false, message: 'Step back to ensure your knees and feet are in frame.' };
      }
      return { isAcceptable: true, message: null };
    }

    if (exerciseId === 'pushup') {
      const shouldersVisible = (leftShoulder?.visibility ?? 1) > minVis || (rightShoulder?.visibility ?? 1) > minVis;
      const elbowsVisible = (leftElbow?.visibility ?? 1) > minVis || (rightElbow?.visibility ?? 1) > minVis;
      const wristsVisible = (leftWrist?.visibility ?? 1) > minVis || (rightWrist?.visibility ?? 1) > minVis;

      if (!shouldersVisible || !elbowsVisible || !wristsVisible) {
        return { isAcceptable: false, message: 'Position camera so upper body and arms are clearly visible.' };
      }
      return { isAcceptable: true, message: null };
    }

    if (exerciseId === 'bicep_curl') {
      const elbowsVisible = (leftElbow?.visibility ?? 1) > minVis || (rightElbow?.visibility ?? 1) > minVis;
      const wristsVisible = (leftWrist?.visibility ?? 1) > minVis || (rightWrist?.visibility ?? 1) > minVis;
      const shouldersVisible = (leftShoulder?.visibility ?? 1) > minVis || (rightShoulder?.visibility ?? 1) > minVis;

      if (!shouldersVisible || !elbowsVisible || !wristsVisible) {
        return { isAcceptable: false, message: 'Step back so your torso and arms are in frame.' };
      }
      return { isAcceptable: true, message: null };
    }

    return { isAcceptable: true, message: null };
  }, [exerciseId]);

  // Render real detected 2D skeleton onto overlay canvas
  const drawRealSkeleton = useCallback((landmarks: Landmark[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!landmarks || landmarks.length === 0) return;

    // 1. Draw connections
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#10B981';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [a, b] of SKELETON_CONNECTIONS) {
      const p1 = landmarks[a];
      const p2 = landmarks[b];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.4 && (p2.visibility ?? 1) > 0.4) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
    }

    // 2. Draw anatomical landmarks
    for (let i = 0; i < landmarks.length; i++) {
      if (i > 32) break;
      const lm = landmarks[i];
      if (!lm || (lm.visibility ?? 1) <= 0.4) continue;

      const isKeyJoint = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(i);
      ctx.fillStyle = isKeyJoint ? '#06B6D4' : 'rgba(255, 255, 255, 0.7)';

      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, isKeyJoint ? 5 : 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, []);

  // Main real-time computer vision inference loop
  const runVisionLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      animFrameIdRef.current = requestAnimationFrame(runVisionLoop);
      return;
    }

    try {
      const now = performance.now();
      // Execute MediaPipe Pose inference strictly on client device
      const realLandmarks = detectPose(video, now);

      if (realLandmarks && realLandmarks.length >= 33) {
        setIsBodyDetected(true);

        // Validate positioning and body visibility
        const posCheck = checkPositioning(realLandmarks);
        setPositioningFeedback(posCheck.message);

        // Draw live skeleton
        drawRealSkeleton(realLandmarks);

        // Update Rep Counter FSM only when workout is active and positioning is acceptable
        if (isActiveRef.current && posCheck.isAcceptable) {
          const newState = fsmRef.current.processFrame(realLandmarks);
          setRepState(newState);
          onUpdate?.(newState);
        }
      } else {
        setIsBodyDetected(false);
        setPositioningFeedback('Body not detected. Position yourself in front of the camera.');
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    } catch (inferErr) {
      console.warn('[CameraWorkout] Pose inference error:', inferErr);
    }

    animFrameIdRef.current = requestAnimationFrame(runVisionLoop);
  }, [checkPositioning, drawRealSkeleton, onUpdate]);

  // Initialize MediaPipe model and webcam
  const startCameraAndMediaPipe = useCallback(async () => {
    setTrackingError(null);
    setCameraReady(false);
    setMediaPipeReady(false);

    // 1. Check browser mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setTrackingError('Camera tracking unavailable: Your browser does not support webcam media capture.');
      return;
    }

    // 2. Load real MediaPipe PoseLandmarker (GPU with CPU fallback)
    try {
      await initializePoseLandmarker();
      setMediaPipeReady(true);
    } catch (mpErr: any) {
      console.error('[CameraWorkout] MediaPipe initialization failed:', mpErr);
      setTrackingError('Camera tracking unavailable: Failed to load MediaPipe pose recognition model.');
      return;
    }

    // 3. Request webcam video stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (camErr: any) {
      console.error('[CameraWorkout] Camera access failed:', camErr);
      if (camErr.name === 'NotAllowedError' || camErr.name === 'PermissionDeniedError') {
        setTrackingError('Camera permission denied: Please allow camera access in your browser settings to track workout form.');
      } else if (camErr.name === 'NotFoundError' || camErr.name === 'DevicesNotFoundError') {
        setTrackingError('Camera tracking unavailable: No webcam device was found on this system.');
      } else {
        setTrackingError(`Camera tracking unavailable: ${camErr.message || 'Could not start webcam stream.'}`);
      }
    }
  }, []);

  // Launch camera & vision loop on mount
  useEffect(() => {
    startCameraAndMediaPipe();

    return () => {
      // Clean up animation frame
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      // Clean up interval timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Clean up webcam tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      closePoseLandmarker();
    };
  }, [startCameraAndMediaPipe]);

  // Start inference loop when camera & MediaPipe are ready
  useEffect(() => {
    if (cameraReady && mediaPipeReady) {
      animFrameIdRef.current = requestAnimationFrame(runVisionLoop);
    }
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraReady, mediaPipeReady, runVisionLoop]);

  // Start Workout
  const startWorkout = () => {
    setIsActive(true);
    setDuration(0);
    fsmRef.current.reset();
    onStartWorkout?.();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
  };

  // Stop Workout
  const stopWorkout = () => {
    setIsActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const state = fsmRef.current.getState();
    onComplete({
      reps: state.reps,
      formScore: state.formScore,
      duration,
      streak: state.bestStreak,
    });
  };

  // Auto-complete when target reps achieved
  useEffect(() => {
    if (isActive && repState.reps >= targetReps && targetReps > 0) {
      stopWorkout();
    }
  }, [repState.reps, targetReps, isActive]);

  const formColor = repState.formScore >= 80 ? '#10B981' : repState.formScore >= 60 ? '#F59E0B' : '#EF4444';
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // If tracking failed or permission was denied
  if (trackingError) {
    return (
      <div className="w-full card bg-gray-900 border border-rose-500/30 p-6 flex flex-col items-center text-center gap-4 animate-in">
        <div className="text-4xl">⚠️</div>
        <h3 className="text-base font-bold text-white">Camera Tracking Unavailable</h3>
        <p className="text-xs text-rose-300 max-w-[340px] leading-relaxed">
          {trackingError}
        </p>
        <button
          onClick={startCameraAndMediaPipe}
          className="btn btn-primary text-xs px-5 py-2.5 mt-2"
        >
          🔄 Retry Camera
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* ── Camera & Canvas Viewport ─────────────────────────── */}
      <div className="relative w-full aspect-[4/3] max-w-[480px] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Real Webcam Stream */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
        />

        {/* Real MediaPipe Skeleton Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          width={640}
          height={480}
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* ── Live Positioning Cues Banner ──────────────────── */}
        {positioningFeedback && (cameraReady && mediaPipeReady) && (
          <div className="absolute top-3 left-3 right-3 z-30 bg-black/75 backdrop-blur-sm border border-amber-500/40 rounded-xl px-3 py-1.5 flex items-center justify-center gap-2">
            <span className="text-xs">📐</span>
            <span className="text-[11px] font-medium text-amber-300">{positioningFeedback}</span>
          </div>
        )}

        {/* ── Real-Time HUD Overlay ─────────────────────────── */}
        {isActive && (
          <>
            {/* Rep Counter */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center pointer-events-none z-20">
              <div className="text-6xl font-black text-white drop-shadow-md tracking-tight">
                {repState.reps}
              </div>
              <div className="text-xs font-semibold text-slate-300 drop-shadow">
                / {targetReps} reps
              </div>
            </div>

            {/* Form Score Ring */}
            <div className="absolute top-4 right-4 z-20">
              <GoalRing progress={repState.formScore} size={54} strokeWidth={4} color={formColor}>
                <span className="text-xs font-bold" style={{ color: formColor }}>
                  {repState.formScore}
                </span>
              </GoalRing>
            </div>

            {/* Current Joint Angle Pill */}
            <div className="absolute top-4 left-4 z-20">
              <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[11px] font-mono text-cyan-300">
                {repState.currentAngle}°
              </div>
            </div>

            {/* Timer & Streak Pills */}
            <div className="absolute bottom-4 left-4 z-20 flex gap-2">
              <div className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-[11px] font-semibold text-white">
                ⏱️ {formatTime(duration)}
              </div>
              <div className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm border border-amber-500/30 text-[11px] font-semibold text-amber-300">
                🔥 {repState.streak}
              </div>
            </div>

            {/* Biomechanical Form Feedback Banner */}
            {repState.feedback.length > 0 && (
              <div className="absolute bottom-16 left-3 right-3 z-20 bg-rose-950/80 backdrop-blur-sm border border-rose-500/40 rounded-xl px-3 py-1.5 text-center">
                <span className="text-[11px] text-rose-200 font-medium">{repState.feedback[0]}</span>
              </div>
            )}
          </>
        )}

        {/* ── Ready / Start Overlay ─────────────────────────── */}
        {!isActive && cameraReady && mediaPipeReady && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm gap-3 p-6 text-center">
            <div className="text-4xl">📸</div>
            <h3 className="text-base font-bold text-white">Pose Tracking Ready</h3>
            <p className="text-xs text-muted max-w-[280px]">
              {isBodyDetected
                ? 'Full body recognized. Stand in position and begin.'
                : 'Position yourself so your full body is visible in the camera frame.'}
            </p>
            <button
              onClick={startWorkout}
              className="btn btn-primary px-6 py-3 text-sm font-semibold rounded-xl shadow-lg mt-2"
            >
              ▶️ Start {exerciseId.replace(/_/g, ' ')}
            </button>
          </div>
        )}

        {/* ── Initialization State ─────────────────────────── */}
        {(!cameraReady || !mediaPipeReady) && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 gap-3">
            <div className="spinner w-8 h-8 border-neon" />
            <span className="text-xs text-muted animate-pulse">
              {!mediaPipeReady ? 'Loading MediaPipe PoseLandmarker model…' : 'Connecting webcam video…'}
            </span>
          </div>
        )}
      </div>

      {/* ── Workout Control Button ─────────────────────────── */}
      {isActive && (
        <button
          className="btn btn-danger w-full max-w-[480px] py-3 text-xs font-semibold rounded-xl mt-4"
          onClick={stopWorkout}
        >
          ⏹️ End Workout Session
        </button>
      )}
    </div>
  );
}
