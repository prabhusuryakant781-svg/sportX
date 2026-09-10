/**
 * SportX MediaPipe Pose Landmarker Service
 * Encapsulates the lifecycle, WASM loading, singleton reuse,
 * and real-time frame inference for MediaPipe Tasks Vision.
 */

import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

const WASM_CDN_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const MODEL_ASSET_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

let poseLandmarkerInstance = null;
let initPromise = null;
let isInitializing = false;

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
      // 1. Resolve WASM runtime binaries
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN_URL);

      // 2. Initialize PoseLandmarker with GPU delegate and fallback to CPU
      try {
        poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
      } catch (gpuError) {
        console.warn('GPU delegate unavailable, falling back to CPU for PoseLandmarker:', gpuError);
        poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL,
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
      }

      return poseLandmarkerInstance;
    } catch (err) {
      console.error('Failed to initialize MediaPipe PoseLandmarker:', err);
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

  if (!videoElement || videoElement.readyState < 2) {
    return null;
  }

  try {
    const result = poseLandmarkerInstance.detectForVideo(videoElement, timestamp);
    return result && result.landmarks && result.landmarks.length > 0
      ? result.landmarks[0]
      : null;
  } catch (err) {
    console.warn('PoseLandmarker inference warning:', err);
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
      console.warn('Error during PoseLandmarker close:', err);
    }
    poseLandmarkerInstance = null;
  }
  initPromise = null;
  isInitializing = false;
}

/**
 * Returns true if the PoseLandmarker is already loaded and ready for inference.
 */
export function isPoseLandmarkerReady() {
  return poseLandmarkerInstance !== null;
}
