/**
 * SportX MediaPipe Landmark Adapter & Biomechanical Coordinate Normalizer
 *
 * Converts MediaPipe 33-point PoseLandmarker normalized landmarks
 * into SportX's anatomical named keypoints format.
 * Includes temporal EMA smoothing, outlier jump filtering, and confidence validation.
 */

// MediaPipe Pose 33-point Landmark Indices:
// 0: nose, 11: left_shoulder, 12: right_shoulder, 13: left_elbow, 14: right_elbow,
// 15: left_wrist, 16: right_wrist, 23: left_hip, 24: right_hip,
// 25: left_knee, 26: right_knee, 27: left_ankle, 28: right_ankle.
export const MEDIAPIPE_SPORTX_MAPPING = {
  head: 0,
  shoulder_l: 11,
  shoulder_r: 12,
  elbow_l: 13,
  elbow_r: 14,
  wrist_l: 15,
  wrist_r: 16,
  hip_l: 23,
  hip_r: 24,
  knee_l: 25,
  knee_r: 26,
  ankle_l: 27,
  ankle_r: 28
};

export const POSE_SMOOTHING_ALPHA = 0.45;
export const MAX_OUTLIER_JUMP_RATIO = 0.35; // Maximum jump as % of canvas diagonal per frame

/**
 * Maps raw MediaPipe normalized landmarks array (33 items) to SportX named keypoint map.
 * 
 * @param {Array<{x: number, y: number, z: number, visibility?: number, presence?: number}>} landmarks
 * @param {number} canvasWidth Width of rendering canvas (e.g. 640)
 * @param {number} canvasHeight Height of rendering canvas (e.g. 480)
 * @returns {Record<string, {name: string, x: number, y: number, z: number, score: number}>}
 */
export function mapPoseLandmarksToSportX(landmarks, canvasWidth = 640, canvasHeight = 480) {
  if (!landmarks || landmarks.length === 0) {
    return null;
  }

  const kpMap = {};

  for (const [sportxName, mpIndex] of Object.entries(MEDIAPIPE_SPORTX_MAPPING)) {
    const rawPoint = landmarks[mpIndex];
    if (!rawPoint) continue;

    const score = typeof rawPoint.visibility === 'number'
      ? rawPoint.visibility
      : typeof rawPoint.presence === 'number'
      ? rawPoint.presence
      : 1.0;

    kpMap[sportxName] = {
      name: sportxName,
      x: rawPoint.x * canvasWidth,
      y: rawPoint.y * canvasHeight,
      z: rawPoint.z ?? 0,
      score: Math.round(score * 100) / 100
    };
  }

  return kpMap;
}

/**
 * Applies Exponential Moving Average (EMA) smoothing between current and previous frame landmarks.
 * 
 * @param {Record<string, {x: number, y: number, z: number, score: number}>} currentMap
 * @param {Record<string, {x: number, y: number, z: number, score: number}>|null} previousMap
 * @param {number} alpha Smoothing factor (0.0 to 1.0; higher = more responsive, lower = smoother)
 * @returns {Record<string, {name: string, x: number, y: number, z: number, score: number}>}
 */
export function applyPoseSmoothing(currentMap, previousMap, alpha = POSE_SMOOTHING_ALPHA) {
  if (!currentMap) return previousMap || null;
  if (!previousMap) return currentMap;

  const smoothed = {};

  for (const [name, currentKp] of Object.entries(currentMap)) {
    const prevKp = previousMap[name];
    if (!prevKp) {
      smoothed[name] = currentKp;
      continue;
    }

    smoothed[name] = {
      ...currentKp,
      x: alpha * currentKp.x + (1 - alpha) * prevKp.x,
      y: alpha * currentKp.y + (1 - alpha) * prevKp.y,
      z: alpha * (currentKp.z ?? 0) + (1 - alpha) * (prevKp.z ?? 0),
      score: currentKp.score
    };
  }

  return smoothed;
}

/**
 * Filters out physically impossible joint teleportation jumps between consecutive frames.
 * If a joint moves further than maxJumpPixels in a single frame, the previous coordinate is kept.
 * 
 * @param {Record<string, {x: number, y: number, score: number}>} currentMap
 * @param {Record<string, {x: number, y: number, score: number}>|null} previousMap
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {Record<string, {x: number, y: number, score: number}>}
 */
export function filterOutliers(currentMap, previousMap, canvasWidth = 640, canvasHeight = 480) {
  if (!currentMap || !previousMap) return currentMap;

  const maxAllowedDist = Math.hypot(canvasWidth, canvasHeight) * MAX_OUTLIER_JUMP_RATIO;
  const filtered = {};

  for (const [name, currentKp] of Object.entries(currentMap)) {
    const prevKp = previousMap[name];
    if (!prevKp) {
      filtered[name] = currentKp;
      continue;
    }

    const dist = Math.hypot(currentKp.x - prevKp.x, currentKp.y - prevKp.y);
    if (dist > maxAllowedDist) {
      // Reject impossible jump; retain previous stable joint position with degraded score
      filtered[name] = {
        ...prevKp,
        score: Math.min(prevKp.score, 0.4)
      };
    } else {
      filtered[name] = currentKp;
    }
  }

  return filtered;
}

/**
 * Validates tracking confidence of critical anatomical joints for a specific exercise.
 * 
 * @param {Record<string, {score: number}>} kpMap
 * @param {string} exerciseId
 * @param {number} minConfidence
 * @returns {{isValid: boolean, missingJoints: string[]}}
 */
export function validatePoseConfidence(kpMap, exerciseId = 'squat', minConfidence = 0.45) {
  if (!kpMap) {
    return { isValid: false, missingJoints: ['all'] };
  }

  const criticalJointsByExercise = {
    squat: ['hip_l', 'hip_r', 'knee_l', 'knee_r', 'ankle_l', 'ankle_r'],
    pushup: ['shoulder_l', 'shoulder_r', 'elbow_l', 'elbow_r', 'wrist_l', 'wrist_r', 'hip_l'],
    jumping_jacks: ['shoulder_l', 'shoulder_r', 'wrist_l', 'wrist_r', 'ankle_l', 'ankle_r']
  };

  const required = criticalJointsByExercise[exerciseId] || ['hip_l', 'knee_l', 'ankle_l'];
  const missingJoints = required.filter(j => !kpMap[j] || kpMap[j].score < minConfidence);

  return {
    isValid: missingJoints.length === 0,
    missingJoints
  };
}
