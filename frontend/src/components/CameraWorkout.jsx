import React, { useState, useEffect, useRef, useCallback } from 'react';
import { calculateAngle, validateCameraPositioning } from '../utils/poseMath.js';
import { RepCounterFSM } from '../utils/repCounterFSM.js';
import {
  initializePoseLandmarker,
  detectPose,
  isPoseLandmarkerReady
} from '../services/poseLandmarker.js';
import {
  mapPoseLandmarksToSportX,
  applyPoseSmoothing,
  filterOutliers,
  validatePoseConfidence
} from '../utils/mediapipeLandmarks.js';

const BONES = [
  ['head', 'shoulder_l'], ['head', 'shoulder_r'], ['shoulder_l', 'shoulder_r'],
  ['shoulder_l', 'elbow_l'], ['shoulder_r', 'elbow_r'],
  ['elbow_l', 'wrist_l'], ['elbow_r', 'wrist_r'],
  ['shoulder_l', 'hip_l'], ['shoulder_r', 'hip_r'], ['hip_l', 'hip_r'],
  ['hip_l', 'knee_l'], ['hip_r', 'knee_r'],
  ['knee_l', 'ankle_l'], ['knee_r', 'ankle_r'],
];

// Inference throttle interval in milliseconds (~25-30 FPS)
const INFERENCE_INTERVAL_MS = 35;

export default function CameraWorkout({
  exerciseId = 'squat',
  onStartWorkout = null,
  onFinishWorkout = null,
  isDuelMode = false,
  onTelemetryUpdate = null
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const fsmRef = useRef(null);

  // Vision Pipeline State Refs (avoid unnecessary re-renders in render loop)
  const lastInferenceTimeRef = useRef(0);
  const inferenceBusyRef = useRef(false);
  const prevKpMapRef = useRef(null);
  const consecutiveLostFramesRef = useRef(0);
  const isComponentMountedRef = useRef(true);

  // Component UI States
  const [streamActive, setStreamActive] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [positioning, setPositioning] = useState({
    isPositioned: false,
    issue: 'Initializing Camera & AI Model…'
  });

  const [hudState, setHudState] = useState({
    reps: 0,
    validFormReps: 0,
    formScore: 100,
    state: exerciseId === 'pushup' ? 'PLANK' : exerciseId === 'jumping_jacks' ? 'NEUTRAL' : 'UP',
    currentStreak: 0,
    avgTempoPacing: '0.0',
    feedbackLog: [],
  });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

  // Initialize FSM instance when exercise changes
  useEffect(() => {
    fsmRef.current = new RepCounterFSM(exerciseId);
  }, [exerciseId]);

  // Workout duration timer
  useEffect(() => {
    let timer = null;
    if (isWorkoutActive) {
      timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isWorkoutActive]);

  // Component unmount lifecycle guard
  useEffect(() => {
    isComponentMountedRef.current = true;
    return () => {
      isComponentMountedRef.current = false;
      stopCamera();
    };
  }, []);

  /**
   * Initializes webcam stream and preloads MediaPipe PoseLandmarker model
   */
  const startCamera = async () => {
    setCameraError(null);
    setModelError(null);

    // 1. Initialize user camera stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current && isComponentMountedRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError(
        'Camera permission was denied or camera is unavailable. Please grant camera access to track your workout.'
      );
      setPositioning({
        isPositioned: false,
        issue: '🚫 Camera unavailable. Enable permissions to continue.'
      });
      return;
    }

    // 2. Pre-load MediaPipe PoseLandmarker model if not already cached
    if (!isPoseLandmarkerReady()) {
      setIsModelLoading(true);
      try {
        await initializePoseLandmarker();
      } catch (err) {
        console.error('MediaPipe Model Loading Error:', err);
        setModelError('Failed to load MediaPipe AI Vision model. Check internet connection.');
        setPositioning({
          isPositioned: false,
          issue: '⚠️ AI Vision model failed to load.'
        });
      } finally {
        if (isComponentMountedRef.current) {
          setIsModelLoading(false);
        }
      }
    }
  };

  /**
   * Stops camera stream and cleans up resources
   */
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    inferenceBusyRef.current = false;
    prevKpMapRef.current = null;
    consecutiveLostFramesRef.current = 0;
    setStreamActive(false);
  }, []);

  /**
   * Main Real-Time Inference & Rendering Animation Loop
   */
  useEffect(() => {
    if (!streamActive) return;

    let isSubscribed = true;

    const renderLoop = (currentTimestamp) => {
      if (!isSubscribed) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // Check that video metadata is loaded and frames are flowing
      if (video.readyState < 2 || video.videoWidth === 0) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      const width = canvas.width = 640;
      const height = canvas.height = 480;

      // Coordinate reflection helper:
      // Video is mirrored via CSS scaleX(-1) for a natural user reflection.
      // Canvas text remains readable (not reversed) by drawing on un-mirrored canvas
      // and translating x coordinates: toScreenX(x) = width - x.
      const toScreenX = (x) => width - x;

      // 1. Throttled MediaPipe Pose Inference
      const timeSinceLastInference = currentTimestamp - lastInferenceTimeRef.current;

      if (timeSinceLastInference >= INFERENCE_INTERVAL_MS && !inferenceBusyRef.current) {
        inferenceBusyRef.current = true;
        lastInferenceTimeRef.current = currentTimestamp;

        try {
          const rawLandmarks = detectPose(video, currentTimestamp);

          if (rawLandmarks && rawLandmarks.length > 0) {
            // Map 33 MediaPipe landmarks to SportX anatomical joints
            const rawKpMap = mapPoseLandmarksToSportX(rawLandmarks, width, height);

            if (rawKpMap) {
              // Apply physical jump rejection and temporal EMA smoothing
              const filteredMap = filterOutliers(rawKpMap, prevKpMapRef.current, width, height);
              const smoothedMap = applyPoseSmoothing(filteredMap, prevKpMapRef.current);

              prevKpMapRef.current = smoothedMap;
              consecutiveLostFramesRef.current = 0;

              // Validate camera positioning using real landmarks
              const keypointList = Object.values(smoothedMap);
              const posCheck = validateCameraPositioning(keypointList, width, height);
              setPositioning(posCheck);

              // Validate pose confidence for active exercise
              const confidence = validatePoseConfidence(smoothedMap, exerciseId, 0.45);

              // Process frame through FSM if workout active and joints visible
              if (isWorkoutActive && fsmRef.current && confidence.isValid) {
                const updated = fsmRef.current.processFrame(smoothedMap);
                setHudState(updated);

                // Broadcast telemetry to multiplayer duel lobby
                if (isDuelMode && onTelemetryUpdate) {
                  onTelemetryUpdate({
                    currentReps: updated.reps,
                    formScore: updated.formScore,
                    currentStreak: updated.currentStreak,
                  });
                }
              }
            }
          } else {
            // No pose detected in this frame
            consecutiveLostFramesRef.current += 1;
            if (consecutiveLostFramesRef.current > 8) {
              // After ~250ms of missing pose, alert user and clear stale skeleton
              prevKpMapRef.current = null;
              setPositioning({
                isPositioned: false,
                issue: '🔍 Searching for body in camera view…'
              });
            }
          }
        } catch (err) {
          console.warn('Inference error in render loop:', err);
        } finally {
          inferenceBusyRef.current = false;
        }
      }

      // 2. Clear canvas overlay
      ctx.clearRect(0, 0, width, height);

      // 3. Render Real Skeleton Overlay from latest valid landmarks
      const currentKpMap = prevKpMapRef.current;

      if (currentKpMap) {
        const isGoodForm = hudState.formScore >= 80;
        const validKeypoints = Object.values(currentKpMap).filter(k => k.score >= 0.4);

        if (validKeypoints.length >= 4) {
          // Bounding Box over detected person (using mirrored screen coordinates)
          const screenXs = validKeypoints.map(k => toScreenX(k.x));
          const screenYs = validKeypoints.map(k => k.y);
          const minX = Math.max(0, Math.min(...screenXs) - 20);
          const maxX = Math.min(width, Math.max(...screenXs) + 20);
          const minY = Math.max(0, Math.min(...screenYs) - 20);
          const maxY = Math.min(height, Math.max(...screenYs) + 20);

          ctx.strokeStyle = isGoodForm ? 'rgba(107,203,119,0.5)' : 'rgba(255,107,107,0.5)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
          ctx.setLineDash([]);

          // Draw Skeleton Bones
          BONES.forEach(([a, b]) => {
            const kpA = currentKpMap[a];
            const kpB = currentKpMap[b];

            if (kpA && kpB && kpA.score >= 0.4 && kpB.score >= 0.4) {
              ctx.beginPath();
              ctx.moveTo(toScreenX(kpA.x), kpA.y);
              ctx.lineTo(toScreenX(kpB.x), kpB.y);
              ctx.strokeStyle = isGoodForm ? 'rgb(108, 99, 255)' : 'rgb(255, 107, 107)';
              ctx.lineWidth = 4;
              ctx.lineCap = 'round';
              ctx.stroke();
            }
          });

          // Draw Joint Dots
          validKeypoints.forEach(k => {
            const sx = toScreenX(k.x);
            ctx.beginPath();
            ctx.arc(sx, k.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = k.name.includes('knee') || k.name.includes('elbow')
              ? '#FFD93D'
              : '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          });

          // Draw Biomechanical Angle Badge (Squat Knee or Pushup Elbow)
          if (exerciseId === 'squat' && currentKpMap['hip_l'] && currentKpMap['knee_l'] && currentKpMap['ankle_l']) {
            const kneeAngle = calculateAngle(currentKpMap['hip_l'], currentKpMap['knee_l'], currentKpMap['ankle_l']);
            const badgeX = toScreenX(currentKpMap['knee_l'].x);
            const badgeY = currentKpMap['knee_l'].y;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(badgeX + 8, badgeY - 12, 44, 20);
            ctx.fillStyle = isGoodForm ? '#6BCB77' : '#FFD93D';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`${Math.round(kneeAngle)}°`, badgeX + 12, badgeY + 2);
          } else if (exerciseId === 'pushup' && currentKpMap['shoulder_l'] && currentKpMap['elbow_l'] && currentKpMap['wrist_l']) {
            const elbowAngle = calculateAngle(currentKpMap['shoulder_l'], currentKpMap['elbow_l'], currentKpMap['wrist_l']);
            const badgeX = toScreenX(currentKpMap['elbow_l'].x);
            const badgeY = currentKpMap['elbow_l'].y;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(badgeX + 8, badgeY - 12, 44, 20);
            ctx.fillStyle = isGoodForm ? '#6BCB77' : '#FFD93D';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`${Math.round(elbowAngle)}°`, badgeX + 12, badgeY + 2);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [streamActive, isWorkoutActive, exerciseId, isDuelMode, hudState.formScore, onTelemetryUpdate]);

  const handleStartWorkout = async () => {
    if (!streamActive) {
      await startCamera();
    }
    setIsWorkoutActive(true);
    if (fsmRef.current) {
      fsmRef.current = new RepCounterFSM(exerciseId);
    }
    if (onStartWorkout) {
      try {
        await onStartWorkout();
      } catch (err) {
        console.warn('onStartWorkout notification warning:', err);
      }
    }
  };

  const handleEndWorkout = () => {
    setIsWorkoutActive(false);
    stopCamera();

    const summaryPayload = {
      exerciseId,
      durationSeconds: elapsedSeconds,
      reps: hudState.reps,
      validFormReps: hudState.validFormReps,
      formScore: hudState.formScore,
      formAccuracyPercentage: hudState.reps > 0 ? Math.round((hudState.validFormReps / hudState.reps) * 100) : 100,
      tempoPacing: hudState.avgTempoPacing,
      feedbackLog: hudState.feedbackLog,
      totalScore: Math.round(hudState.reps * (hudState.formScore / 100) * 10)
    };

    if (onFinishWorkout) {
      onFinishWorkout(summaryPayload);
    }
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const formColor = hudState.formScore >= 85 ? '#6BCB77' : hudState.formScore >= 70 ? '#FFD93D' : '#FF6B6B';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Camera / Model Error Banner */}
      {(cameraError || modelError) && (
        <div style={{
          background: 'rgba(255,107,107,0.12)',
          border: '1px solid rgba(255,107,107,0.4)',
          borderRadius: 12,
          padding: '12px 16px',
          color: '#FF6B6B',
          fontSize: 13
        }}>
          <strong>⚠️ {cameraError ? 'Camera Error' : 'AI Model Error'}:</strong> {cameraError || modelError}
        </div>
      )}

      {/* Model Loading State Banner */}
      {isModelLoading && (
        <div style={{
          background: 'rgba(108,99,255,0.12)',
          border: '1px solid rgba(108,99,255,0.4)',
          borderRadius: 12,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: '#E0E0E0'
        }}>
          <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
          <span>Loading MediaPipe Pose Landmarker AI model (browser-edge inference)…</span>
        </div>
      )}

      {/* Positioning Alert Banner */}
      <div style={{
        background: positioning.isPositioned ? 'rgba(107,203,119,0.12)' : 'rgba(255,217,61,0.12)',
        border: `1px solid ${positioning.isPositioned ? 'rgba(107,203,119,0.4)' : 'rgba(255,217,61,0.4)'}`,
        borderRadius: 12,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 13,
        color: 'var(--text-primary)'
      }}>
        <span>{positioning.issue}</span>
        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>⏱️ {fmt(elapsedSeconds)}</span>
      </div>

      {/* Video & Canvas Overlay Viewport */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 380,
        background: '#0D0E15',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // Mirrored for natural user reflection
            opacity: cameraError ? 0.2 : 0.9
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        />

        {/* Live HUD Header */}
        {isWorkoutActive && (
          <div style={{
            position: 'absolute',
            top: 14,
            left: 14,
            right: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            zIndex: 10
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              borderRadius: 12,
              padding: '8px 14px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>FSM Phase</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#6C63FF' }}>{hudState.state}</div>
            </div>

            <div style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.85)',
              border: `3px solid ${formColor}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: formColor
            }}>
              <span style={{ fontSize: 17, fontWeight: 900 }}>{hudState.formScore}</span>
              <span style={{ fontSize: 8, textTransform: 'uppercase', opacity: 0.8 }}>FORM</span>
            </div>
          </div>
        )}

        {/* Live Rep Counter Display */}
        {isWorkoutActive ? (
          <div style={{ position: 'absolute', bottom: 16, textAlign: 'center', zIndex: 10 }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: '#FFFFFF', textShadow: '0 0 30px rgba(108,99,255,0.8)' }}>
              {hudState.reps}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {exerciseId.replace('_', ' ')} Reps
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', zIndex: 2 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>📸</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>MediaPipe Pose AI Vision Ready</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Stand 2-3m away with your full body in view for automated rep counting & form feedback
            </div>
          </div>
        )}
      </div>

      {/* Real-time Feedback Stream */}
      {hudState.feedbackLog.length > 0 && (
        <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 12, padding: '10px 14px' }}>
          {hudState.feedbackLog.slice(0, 2).map((log, idx) => (
            <p key={idx} style={{ margin: 0, fontSize: 13, color: '#E0E0E0', lineHeight: 1.4 }}>{log}</p>
          ))}
        </div>
      )}

      {/* Control Buttons */}
      {!isWorkoutActive ? (
        <button
          onClick={handleStartWorkout}
          className="btn btn-primary btn-full"
          style={{ fontSize: 16, padding: '14px', borderRadius: 12 }}
        >
          🎬 Start AI Camera Workout
        </button>
      ) : (
        <button
          onClick={handleEndWorkout}
          className="btn btn-danger btn-full"
          style={{ fontSize: 16, padding: '14px', borderRadius: 12 }}
        >
          ⏹️ Complete Workout & Save Stats
        </button>
      )}
    </div>
  );
}
