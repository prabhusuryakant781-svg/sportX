import { useState, useEffect, useRef, useCallback } from 'react';
import { RepCounterFSM, type ExerciseType, type RepCounterState } from '../utils/repCounterFSM';
import { initializePoseLandmarker, detectPose } from '../services/poseLandmarker';
import type { Landmark } from '../utils/poseMath';
import GoalRing from './GoalRing';
import { Clock, Flame, Play, Square, AlertTriangle, RefreshCw, Activity, CheckCircle2 } from 'lucide-react';

export interface WorkoutCompletionResult {
  reps: number;
  formScore: number;
  duration: number;
  streak: number;
  validFormReps?: number;
  minAngle?: number | null;
  averageAngle?: number | null;
  cadenceRepsPerMinute?: number | null;
  detectedErrors?: any[];
  confidence?: number | null;
  feedbackLog?: string[];
  exerciseId?: string;
  visionVersion?: string;
  [key: string]: any;
}

interface CameraWorkoutProps {
  exerciseId: ExerciseType;
  onComplete: (result: WorkoutCompletionResult) => void;
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
    validFormReps: 0,
    currentAngle: 0,
    fsmState: exerciseId === 'pushup' ? 'PLANK' : exerciseId === 'jumping_jacks' ? 'NEUTRAL' : 'UP',
    state: exerciseId === 'pushup' ? 'PLANK' : exerciseId === 'jumping_jacks' ? 'NEUTRAL' : 'UP',
    formScore: 100,
    feedback: [],
    feedbackLog: [],
    streak: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalScore: 0,
  });
  const [duration, setDuration] = useState(0);

  // Camera status: "requesting" | "ready" | "denied" | "unavailable" | "error"
  const [cameraStatus, setCameraStatus] = useState<'requesting' | 'ready' | 'denied' | 'unavailable' | 'error'>('requesting');
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);

  // MediaPipe status: "initializing" | "ready" | "error"
  const [mediaPipeStatus, setMediaPipeStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');

  const [positioningFeedback, setPositioningFeedback] = useState<string | null>(null);
  const [isBodyDetected, setIsBodyDetected] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fsmRef = useRef<RepCounterFSM>(new RepCounterFSM(exerciseId));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastStateUpdateRef = useRef<number>(0);
  const isCompletingRef = useRef(false);

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);
  const lastRepsRef = useRef(0);

  // Keep isActiveRef synced with state
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Update FSM exercise when prop changes
  useEffect(() => {
    fsmRef.current = new RepCounterFSM(exerciseId);
  }, [exerciseId]);

  // Check landmark positioning based on exercise requirements
  const checkPositioning = useCallback((landmarks: Landmark[]): { isAcceptable: boolean; message: string | null } => {
    if (!landmarks || landmarks.length < 33) {
      return { isAcceptable: false, message: 'Body not detected. Step in front of the camera.' };
    }

    const minVis = 0.4;
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];

    if (exerciseId === 'squat') {
      const hipsVisible = (leftHip?.visibility ?? 1) > minVis || (rightHip?.visibility ?? 1) > minVis;
      const kneesVisible = (leftKnee?.visibility ?? 1) > minVis || (rightKnee?.visibility ?? 1) > minVis;
      const anklesVisible = (leftAnkle?.visibility ?? 1) > minVis || (rightAnkle?.visibility ?? 1) > minVis;

      if (!hipsVisible && !kneesVisible) {
        return { isAcceptable: false, message: 'Step back so your hips and legs are visible.' };
      }
      if (!anklesVisible) {
        // Soft cue: Feet not in view, but hips/knees can still be tracked
        return { isAcceptable: true, message: 'Step back slightly to ensure your full legs are in frame.' };
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

    if (exerciseId === 'jumping_jacks') {
      const shouldersVisible = (leftShoulder?.visibility ?? 1) > minVis || (rightShoulder?.visibility ?? 1) > minVis;
      const anklesVisible = (leftAnkle?.visibility ?? 1) > minVis || (rightAnkle?.visibility ?? 1) > minVis;

      if (!shouldersVisible) {
        return { isAcceptable: false, message: 'Step back so your full body is in frame.' };
      }
      if (!anklesVisible) {
        return { isAcceptable: true, message: 'Step back so your feet are clearly visible.' };
      }
      return { isAcceptable: true, message: null };
    }

    return { isAcceptable: true, message: null };
  }, [exerciseId]);

  // Render real detected 2D skeleton onto overlay canvas
  const drawRealSkeleton = useCallback((landmarks: Landmark[], width: number, height: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sync internal canvas coordinate space with video feed dimensions
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length === 0) return;

    // 1. Draw connections
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    SKELETON_CONNECTIONS.forEach(([startIdx, endIdx]: [number, number]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (!start || !end) return;
      if ((start.visibility ?? 1) < 0.35 || (end.visibility ?? 1) < 0.35) return;

      ctx.beginPath();
      ctx.moveTo(start.x * width, start.y * height);
      ctx.lineTo(end.x * width, end.y * height);
      ctx.stroke();
    });

    // 2. Draw landmarks
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;

    landmarks.forEach((lm) => {
      if ((lm.visibility ?? 1) < 0.35) return;
      const x = lm.x * width;
      const y = lm.y * height;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  }, []);

  // Main real-time computer vision inference loop
  const runVisionLoop = useCallback(() => {
    if (!isMountedRef.current) return;

    const video = videoRef.current;
    // Only begin MediaPipe inference after video is ready and has valid dimensions
    if (
      !video ||
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      animFrameIdRef.current = requestAnimationFrame(runVisionLoop);
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    try {
      const now = performance.now();
      // Execute MediaPipe Pose inference strictly on client device
      const realLandmarks = detectPose(video, now);

      if (realLandmarks && realLandmarks.length >= 33) {
        setIsBodyDetected(true);

        // Validate positioning
        const posCheck = checkPositioning(realLandmarks);
        setPositioningFeedback(posCheck.message);

        // Draw live skeleton overlay
        drawRealSkeleton(realLandmarks, vw, vh);

        // Process rep counting via RepCounterFSM when workout is active
        if (isActiveRef.current && posCheck.isAcceptable) {
          const newState = fsmRef.current.processFrame(realLandmarks);

          // Throttle React state updates to avoid unnecessary render spam (max 20fps UI update)
          const currentTime = Date.now();
          if (currentTime - lastStateUpdateRef.current >= 45 || newState.reps !== lastRepsRef.current) {
            lastRepsRef.current = newState.reps;
            lastStateUpdateRef.current = currentTime;
            setRepState(newState);
            onUpdateRef.current?.(newState);
          }
        }
      } else {
        setIsBodyDetected(false);
        setPositioningFeedback('Move into the camera frame so your body is visible.');
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    } catch (inferErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[CameraWorkout] Pose inference error:', inferErr);
      }
    }

    if (isMountedRef.current) {
      animFrameIdRef.current = requestAnimationFrame(runVisionLoop);
    }
  }, [checkPositioning, drawRealSkeleton]);

  // 1. Initialize Real Camera Stream
  const initializeCamera = useCallback(async () => {
    setCameraStatus('requesting');
    setCameraErrorMessage(null);

    // Check secure context (HTTPS or localhost)
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
      setCameraStatus('unavailable');
      setCameraErrorMessage('Camera tracking unavailable: Camera access requires a secure HTTPS connection.');
      return;
    }

    // Check browser mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('unavailable');
      setCameraErrorMessage('Camera tracking unavailable: Your browser does not support webcam capture.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (!isMountedRef.current) {
        // Component unmounted while waiting for user to accept camera dialog
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('[CameraWorkout] video.play() notice:', playErr);
        }
      }

      setCameraStatus('ready');
    } catch (err: any) {
      console.error('[CameraWorkout] Camera access failed:', err);
      if (!isMountedRef.current) return;

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setCameraErrorMessage('Camera permission denied: Please allow camera access in your browser settings to track workout form.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('unavailable');
        setCameraErrorMessage('Camera unavailable: No camera device was found on this system.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraStatus('unavailable');
        setCameraErrorMessage('Camera unavailable: Another application is currently using the camera.');
      } else {
        setCameraStatus('error');
        setCameraErrorMessage(`Camera unavailable: ${err.message || 'Could not start webcam stream.'}`);
      }
    }
  }, []);

  // 2. Initialize MediaPipe PoseLandmarker in parallel
  const initializeMediaPipe = useCallback(async () => {
    setMediaPipeStatus('initializing');
    try {
      await initializePoseLandmarker();
      if (isMountedRef.current) {
        setMediaPipeStatus('ready');
      }
    } catch (err: any) {
      console.error('[CameraWorkout] MediaPipe initialization failed:', err);
      if (isMountedRef.current) {
        setMediaPipeStatus('error');
      }
    }
  }, []);

  // Launch camera & MediaPipe on mount with strict cleanup
  useEffect(() => {
    isMountedRef.current = true;
    initializeCamera();
    initializeMediaPipe();

    return () => {
      isMountedRef.current = false;

      // Cancel animation frame
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      // Clear interval timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Stop and release all webcam tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [initializeCamera, initializeMediaPipe]);

  // Start inference loop when both Camera and MediaPipe are ready
  useEffect(() => {
    if (cameraStatus === 'ready' && mediaPipeStatus === 'ready') {
      animFrameIdRef.current = requestAnimationFrame(runVisionLoop);
    }
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraStatus, mediaPipeStatus, runVisionLoop]);

  // Start Workout
  const startWorkout = () => {
    setIsActive(true);
    setDuration(0);
    fsmRef.current.reset();
    isCompletingRef.current = false;
    onStartWorkout?.();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
  };

  // Stop Workout
  const stopWorkout = () => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;

    setIsActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const state = fsmRef.current.getState();
    const telemetry = fsmRef.current.getTelemetry(duration);
    onComplete({
      reps: state.reps,
      formScore: state.formScore,
      duration,
      streak: state.bestStreak,
      validFormReps: telemetry.validFormReps,
      minAngle: telemetry.minAngle,
      averageAngle: telemetry.averageAngle,
      cadenceRepsPerMinute: telemetry.cadenceRepsPerMinute,
      detectedErrors: telemetry.detectedErrors,
      feedbackLog: telemetry.feedbackLog,
      confidence: telemetry.confidence,
      exerciseId: telemetry.exerciseId,
      visionVersion: telemetry.visionVersion,
    });
  };

  // Auto-complete when target reps achieved
  useEffect(() => {
    if (isActive && repState.reps >= targetReps && targetReps > 0 && !isCompletingRef.current) {
      stopWorkout();
    }
  }, [repState.reps, targetReps, isActive]);

  const formColor = repState.formScore >= 80 ? '#10B981' : repState.formScore >= 60 ? '#F59E0B' : '#EF4444';
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // If camera error / permission denied
  if (cameraStatus === 'denied' || cameraStatus === 'unavailable' || cameraStatus === 'error') {
    return (
      <div className="w-full card-glass bg-obsidian/90 border border-rose-500/40 p-6 flex flex-col items-center text-center gap-4 animate-fade-in shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center text-2xl border border-rose-500/30">
          <AlertTriangle size={28} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            {cameraStatus === 'denied' ? 'Camera Permission Denied' : 'Camera Feed Unavailable'}
          </h3>
          <p className="text-xs text-rose-300/90 max-w-[340px] leading-relaxed mt-1">
            {cameraErrorMessage || 'Unable to access your camera device. Please ensure browser permissions are enabled.'}
          </p>
        </div>
        <button
          onClick={initializeCamera}
          className="btn btn-primary text-xs px-5 py-2.5 mt-2 flex items-center gap-2"
        >
          <RefreshCw size={14} />
          <span>Retry Camera Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* ── Camera & Canvas Viewport ─────────────────────────── */}
      <div className="relative w-full aspect-[4/3] max-w-[480px] bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Real Webcam Stream */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
        />

        {/* Real MediaPipe Skeleton Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          width={640}
          height={480}
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* ── Live Positioning Cues Banner ──────────────────── */}
        {positioningFeedback && cameraStatus === 'ready' && (
          <div className="absolute top-3 left-3 right-3 z-30 bg-black/80 backdrop-blur-md border border-amber-500/40 rounded-xl px-3 py-2 flex items-center justify-center gap-2 shadow-lg animate-slide-up">
            <span className="text-xs">📐</span>
            <span className="text-[11px] font-semibold text-amber-300">{positioningFeedback}</span>
          </div>
        )}

        {/* ── Real-Time HUD Overlay ─────────────────────────── */}
        {isActive && (
          <>
            {/* Center Massive Rep Counter */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center pointer-events-none z-20 flex flex-col items-center">
              <div className="text-7xl font-black text-white drop-shadow-lg tracking-tight tabular-nums font-outfit">
                {repState.reps}
              </div>
              <div className="text-xs font-bold text-slate-200 px-3 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 mt-0.5 tracking-wider uppercase tabular-nums">
                Target: {targetReps} reps
              </div>
            </div>

            {/* Form Score Ring Top-Right */}
            <div className="absolute top-3 right-3 z-20">
              <div className="p-1 rounded-2xl bg-black/65 backdrop-blur-md border border-white/10 shadow-lg">
                <GoalRing progress={repState.formScore} size={54} strokeWidth={4} color={formColor}>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-black tabular-nums font-outfit" style={{ color: formColor }}>
                      {repState.formScore}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">FORM</span>
                  </div>
                </GoalRing>
              </div>
            </div>

            {/* Joint Angle Telemetry Pill Top-Left */}
            <div className="absolute top-3 left-3 z-20">
              <div className="px-3 py-1.5 rounded-xl bg-black/65 backdrop-blur-md border border-white/10 text-[11px] font-mono font-bold text-cyan flex items-center gap-1.5 shadow-lg">
                <Activity size={13} className="text-cyan animate-pulse" />
                <span className="tabular-nums">
                  {exerciseId === 'jumping_jacks' ? `Ratio: ${(repState.currentAngle / 100).toFixed(2)}` : `${repState.currentAngle}°`}
                </span>
              </div>
            </div>

            {/* Timer & Streak Status Bottom-Left */}
            <div className="absolute bottom-3 left-3 z-20 flex gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg tabular-nums">
                <Clock size={13} className="text-slate-400" />
                <span>{formatTime(duration)}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-amber-500/40 text-xs font-bold text-amber-400 flex items-center gap-1.5 shadow-lg tabular-nums">
                <Flame size={13} className="fill-amber-400/20 text-amber-400" />
                <span>{repState.streak} Streak</span>
              </div>
            </div>

            {/* Biomechanical Form Feedback Banner */}
            {repState.feedback.length > 0 && (
              <div className="absolute bottom-16 left-3 right-3 z-20 bg-rose-950/85 backdrop-blur-md border border-rose-500/50 rounded-xl px-3.5 py-2 text-center shadow-xl animate-slide-up">
                <span className="text-xs text-rose-200 font-semibold">{repState.feedback[0]}</span>
              </div>
            )}
          </>
        )}

        {/* ── Ready / Start Overlay ─────────────────────────── */}
        {!isActive && cameraStatus === 'ready' && mediaPipeStatus === 'ready' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/65 backdrop-blur-xs gap-3 p-6 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-neon/15 text-neon flex items-center justify-center border border-neon/30 shadow-glow-sm">
              <Activity size={28} />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Vision Tracking Active</h3>
              <p className="text-xs text-slate-300 max-w-[280px] mt-1 leading-relaxed">
                {isBodyDetected
                  ? 'Biomechanical landmarks acquired. Step back and click start.'
                  : 'Position yourself so your full body is framed inside the camera.'}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/50 border border-white/10">
              <span className={`w-2 h-2 rounded-full ${isBodyDetected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={isBodyDetected ? 'text-emerald-400' : 'text-amber-400'}>
                {isBodyDetected ? 'Body in Frame' : 'Awaiting Full Body'}
              </span>
            </div>

            <button
              onClick={startWorkout}
              className="btn btn-primary px-7 py-3 text-sm font-black rounded-xl shadow-glow mt-2 cursor-pointer flex items-center gap-2"
            >
              <Play size={16} className="fill-current" />
              <span>Start {exerciseId.replace(/_/g, ' ')}</span>
            </button>
          </div>
        )}

        {/* ── Initialization State ─────────────────────────── */}
        {(cameraStatus === 'requesting' || mediaPipeStatus === 'initializing') && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 gap-3">
            <div className="spinner w-9 h-9 border-neon" />
            <span className="text-xs text-slate-300 font-semibold animate-pulse tracking-wide">
              {cameraStatus === 'requesting' ? 'Requesting Camera Feed…' : 'Calibrating MediaPipe Models…'}
            </span>
          </div>
        )}

        {/* ── Development Diagnostics Pill / Overlay ──────────── */}
        <div className="absolute bottom-2 right-2 z-40">
          <button
            onClick={() => setShowDiagnostics(v => !v)}
            className="text-[10px] px-2 py-0.5 rounded bg-black/70 text-slate-400 border border-white/10 hover:text-white"
          >
            {showDiagnostics ? '✕ Close' : '🛠 Telemetry'}
          </button>
          {showDiagnostics && (
            <div className="mt-1 p-2.5 rounded-xl bg-black/95 border border-white/20 text-[10px] font-mono text-left text-slate-200 flex flex-col gap-1 shadow-2xl">
              <div>Camera: <span className={cameraStatus === 'ready' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{cameraStatus.toUpperCase()}</span></div>
              <div>MediaPipe: <span className={mediaPipeStatus === 'ready' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{mediaPipeStatus.toUpperCase()}</span></div>
              <div>Pose: <span className={isBodyDetected ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{isBodyDetected ? 'DETECTED' : 'NOT DETECTED'}</span></div>
              <div>Exercise: <span className="text-cyan font-bold">{exerciseId.toUpperCase()}</span></div>
              <div>FSM: <span className="text-amber-400 font-bold">{repState.fsmState}</span></div>
              <div>REP: <span className="text-white font-bold">{repState.reps}</span></div>
            </div>
          )}
        </div>
      </div>

      {/* ── Workout Control Button ─────────────────────────── */}
      {isActive && (
        <button
          className="btn btn-danger w-full max-w-[480px] py-3.5 text-xs font-black rounded-2xl mt-4 cursor-pointer shadow-lg flex items-center justify-center gap-2"
          onClick={stopWorkout}
        >
          <Square size={14} className="fill-current" />
          <span>Finish Workout Session</span>
        </button>
      )}
    </div>
  );
}
