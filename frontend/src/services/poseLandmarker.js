/**
 * SportX MediaPipe Pose Landmarker Service
 * Encapsulates the lifecycle, WASM loading, singleton reuse,
 * and real-time frame inference for MediaPipe Tasks Vision.
 */

import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

const WASM_CDN_PRIMARY = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const WASM_CDN_FALLBACK = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const MODEL_ASSET_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

let poseLandmarkerInstance = null;
let initPromise = null;
let isInitializing = false;
let lastInferenceTimestamp = 0;

/**
 * Initializes or returns the singleton PoseLandmarker instance.
 * Reuses existing instance across renders and avoids redundant network fetches.
 * @returns {Promise<PoseLandmarker>}
 */
export async function initializePoseLandmarker() {
  if (poseLandmarkerInstance) {
    return poseLandmarkerInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      // 1. Resolve WASM runtime binaries (primary with fallback)
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks(WASM_CDN_PRIMARY);
      } catch (cdnErr) {
        console.warn('[PoseLandmarker] Primary WASM CDN failed, trying fallback:', cdnErr);
        vision = await FilesetResolver.forVisionTasks(WASM_CDN_FALLBACK);
      }

      // 2. Initialize PoseLandmarker with GPU delegate and fallback to CPU
      try {
        poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (gpuError) {
        console.warn('[PoseLandmarker] GPU delegate unavailable, falling back to CPU:', gpuError);
        poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }

      lastInferenceTimestamp = 0;
      return poseLandmarkerInstance;
    } catch (err) {
      console.error('[PoseLandmarker] Initialization failed:', err);
      poseLandmarkerInstance = null;
      throw new Error(`MediaPipe Pose Landmarker initialization failed: ${err.message}`);
    } finally {
      isInitializing = false;
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Detects 3D pose landmarks for a specific video element at a given timestamp.
 * In VIDEO runningMode, timestamp must monotonically increase.
 *
 * @param {HTMLVideoElement} videoElement
 * @param {number} timestamp Timestamp in milliseconds (e.g. performance.now())
 * @returns {Array<{x: number, y: number, z: number, visibility?: number, presence?: number}>|null}
 */
export function detectPose(videoElement, timestamp) {
  if (!poseLandmarkerInstance) {
    return null;
  }

  // Guard: Ensure video has current data and non-zero dimensions
  if (
    !videoElement ||
    videoElement.readyState < 2 ||
    videoElement.videoWidth === 0 ||
    videoElement.videoHeight === 0
  ) {
    return null;
  }

  // Guarantee strictly monotonically increasing timestamp for MediaPipe VIDEO mode
  let ts = typeof timestamp === 'number' && !isNaN(timestamp) ? timestamp : performance.now();
  if (ts <= lastInferenceTimestamp) {
    ts = lastInferenceTimestamp + 1;
  }
  lastInferenceTimestamp = ts;

  try {
    const result = poseLandmarkerInstance.detectForVideo(videoElement, ts);
    return result && result.landmarks && result.landmarks.length > 0
      ? result.landmarks[0]
      : null;
  } catch (err) {
    // Gracefully handle occasional frame glitches without crashing
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[PoseLandmarker] Inference frame warning:', err);
    }
    return null;
  }
}

/**
 * Closes the active PoseLandmarker instance and frees memory.
 */
export function closePoseLandmarker() {
  if (poseLandmarkerInstance) {
    try {
      poseLandmarkerInstance.close();
    } catch (err) {
      console.warn('[PoseLandmarker] Error during close:', err);
    }
    poseLandmarkerInstance = null;
  }
  initPromise = null;
  isInitializing = false;
  lastInferenceTimestamp = 0;
}

/**
 * Returns true if the PoseLandmarker is already loaded and ready for inference.
 */
export function isPoseLandmarkerReady() {
  return poseLandmarkerInstance !== null;
}
