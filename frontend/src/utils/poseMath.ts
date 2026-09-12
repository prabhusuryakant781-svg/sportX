/**
 * SportX Pose Mathematics Utilities
 * Vector angle calculations, spine validation, camera health checks.
 */

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** Calculate 3-point angle in degrees (vertex at pointB) */
export function calculate3PointAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle * 10) / 10;
}

/** Canonical alias for calculate3PointAngle */
export const calculateAngle = calculate3PointAngle;

/** Calculate spine angle relative to vertical (0° = perfectly upright) */
export function calculateSpineAngle(
  shoulder: Landmark,
  hip: Landmark
): number {
  const dx = shoulder.x - hip.x;
  const dy = shoulder.y - hip.y;
  const angleFromVertical = Math.abs(Math.atan2(dx, -dy) * (180 / Math.PI));
  return Math.round(angleFromVertical * 10) / 10;
}

/** Detect knee valgus (knees caving inward) */
export function detectKneeValgus(
  leftHip: Landmark,
  leftKnee: Landmark,
  leftAnkle: Landmark,
  rightHip: Landmark,
  rightKnee: Landmark,
  rightAnkle: Landmark
): { leftValgus: boolean; rightValgus: boolean; severity: 'none' | 'mild' | 'severe' } {
  const leftAngle = calculate3PointAngle(leftHip, leftKnee, leftAnkle);
  const rightAngle = calculate3PointAngle(rightHip, rightKnee, rightAnkle);
  const threshold = 160;
  const severeThreshold = 150;

  const leftValgus = leftAngle < threshold;
  const rightValgus = rightAngle < threshold;

  let severity: 'none' | 'mild' | 'severe' = 'none';
  if (leftAngle < severeThreshold || rightAngle < severeThreshold) severity = 'severe';
  else if (leftValgus || rightValgus) severity = 'mild';

  return { leftValgus, rightValgus, severity };
}

/** Checks for Knee Valgus (knees caving inward) during Squat depth */
export function checkKneeValgus(
  hipL: Landmark | null,
  hipR: Landmark | null,
  kneeL: Landmark | null,
  kneeR: Landmark | null,
  ankleL: Landmark | null,
  ankleR: Landmark | null
): { isValgus: boolean; message: string } {
  if (!kneeL || !kneeR || !ankleL || !ankleR) return { isValgus: false, message: '' };
  const kneeWidth = Math.abs(kneeR.x - kneeL.x);
  const ankleWidth = Math.abs(ankleR.x - ankleL.x);
  const hipWidth = hipL && hipR ? Math.abs(hipR.x - hipL.x) : ankleWidth;

  if (kneeWidth < ankleWidth * 0.78 || kneeWidth < hipWidth * 0.7) {
    return { isValgus: true, message: '❗ Push your knees outward! Avoid caving in.' };
  }
  return { isValgus: false, message: '' };
}

/** Validate camera position and framing (canonical keypoint array) */
export function validateCameraPositioning(
  keypoints: any[],
  width = 640,
  height = 480
): { isPositioned: boolean; issue: string } {
  if (!keypoints || keypoints.length === 0) {
    return { isPositioned: false, issue: '🔍 Searching for body in camera view...' };
  }

  const kpMap: Record<string, any> = {};
  if (Array.isArray(keypoints)) {
    for (let i = 0; i < keypoints.length; i++) {
      const k = keypoints[i];
      if (k && k.name) kpMap[k.name] = k;
      else kpMap[String(i)] = k;
    }
  }

  const requiredJoints = ['head', 'shoulder_l', 'shoulder_r', 'hip_l', 'hip_r', 'knee_l', 'knee_r', 'ankle_l', 'ankle_r'];
  const missingJoints = requiredJoints.filter(j => !kpMap[j] || (kpMap[j].score && kpMap[j].score < 0.45));
  if (missingJoints.length > 2) {
    return { isPositioned: false, issue: '⚠️ Step back! Full body (head to feet) must be visible.' };
  }

  const marginY = height * 0.03;
  const head = kpMap['head'];
  const ankleL = kpMap['ankle_l'];
  const ankleR = kpMap['ankle_r'];

  if (head && head.y < marginY) {
    return { isPositioned: false, issue: '⚠️ Adjust camera! Head is clipped at top.' };
  }
  if ((ankleL && ankleL.y > height - marginY) || (ankleR && ankleR.y > height - marginY)) {
    return { isPositioned: false, issue: '⚠️ Adjust camera! Feet are clipped at bottom.' };
  }

  return { isPositioned: true, issue: '✅ Perfect positioning! Ready to start.' };
}

/** Validate camera position and framing */
export function validateCameraPosition(landmarks: Landmark[]): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!landmarks || landmarks.length < 33) {
    return { isValid: false, issues: ['No pose detected'] };
  }

  // Check visibility of key landmarks
  const keyPoints = [11, 12, 23, 24, 25, 26]; // shoulders, hips, knees
  const lowVisCount = keyPoints.filter(
    (i) => (landmarks[i]?.visibility ?? 0) < 0.5
  ).length;

  if (lowVisCount > 2) {
    issues.push('Step back so your full body is visible');
  }

  // Check if person is centered
  const nose = landmarks[0];
  if (nose) {
    if (nose.x < 0.2) issues.push('Move to the right');
    if (nose.x > 0.8) issues.push('Move to the left');
    if (nose.y < 0.1) issues.push('Step back from camera');
  }

  return { isValid: issues.length === 0, issues };
}

/** Get average position between two landmarks */
export function getMidpoint(a: Landmark, b: Landmark): Landmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: a.z !== undefined && b.z !== undefined ? (a.z + b.z) / 2 : undefined,
  };
}

/** Calculate Euclidean distance between two 2D points */
export function distance2D(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
