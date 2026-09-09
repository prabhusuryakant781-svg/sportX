/**
 * SportX Pose Math Utility
 * High-performance vector geometry and biomechanical angle calculations for client-side CV pose estimation.
 */

/**
 * Calculates 3-point interior angle in degrees at vertex joint B (e.g., Hip - Knee - Ankle)
 * @param {{x: number, y: number}} a Start joint (e.g., Hip)
 * @param {{x: number, y: number}} b Vertex joint (e.g., Knee)
 * @param {{x: number, y: number}} c End joint (e.g., Ankle)
 * @returns {number} Angle in degrees (0 - 180)
 */
export function calculateAngle(a, b, c) {
  if (!a || !b || !c) return 180;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return Math.round(angle * 10) / 10;
}

/**
 * Calculates spine angle relative to vertical axis (0° = perfectly upright)
 * @param {{x: number, y: number}} shoulder Midpoint or single shoulder
 * @param {{x: number, y: number}} hip Midpoint or single hip
 * @returns {number} Deviation angle in degrees
 */
export function calculateSpineAngle(shoulder, hip) {
  if (!shoulder || !hip) return 0;
  const dx = hip.x - shoulder.x;
  const dy = hip.y - shoulder.y;
  const rad = Math.atan2(dx, dy);
  const deg = Math.abs((rad * 180.0) / Math.PI);
  return Math.round(deg * 10) / 10;
}

/**
 * Checks for Knee Valgus (knees caving inward) during Squat depth
 * @param {{x: number}} hipL Left hip
 * @param {{x: number}} hipR Right hip
 * @param {{x: number}} kneeL Left knee
 * @param {{x: number}} kneeR Right knee
 * @param {{x: number}} ankleL Left ankle
 * @param {{x: number}} ankleR Right ankle
 * @returns {{isValgus: boolean, message: string}}
 */
export function checkKneeValgus(hipL, hipR, kneeL, kneeR, ankleL, ankleR) {
  if (!kneeL || !kneeR || !ankleL || !ankleR) return { isValgus: false, message: '' };
  
  const hipWidth = Math.abs(hipR.x - hipL.x) || 0.1;
  const kneeWidth = Math.abs(kneeR.x - kneeL.x);
  const ankleWidth = Math.abs(ankleR.x - ankleL.x);

  // If knees are significantly narrower than ankles during squat descent
  if (kneeWidth < ankleWidth * 0.78 || kneeWidth < hipWidth * 0.7) {
    return { isValgus: true, message: '⚠️ Push your knees outward! Avoid caving in.' };
  }
  return { isValgus: false, message: '' };
}

/**
 * Validates body visibility and camera positioning (Full body frame check)
 * @param {Array<{name: string, x: number, y: number, score?: number}>} keypoints
 * @param {number} width Canvas/video width
 * @param {number} height Canvas/video height
 * @returns {{isPositioned: boolean, issue: string}}
 */
export function validateCameraPositioning(keypoints, width = 640, height = 480) {
  if (!keypoints || keypoints.length === 0) {
    return { isPositioned: false, issue: '🔍 Searching for body in camera view…' };
  }

  const kpMap = Object.fromEntries(keypoints.map(k => [k.name, k]));
  const requiredJoints = ['head', 'shoulder_l', 'shoulder_r', 'hip_l', 'hip_r', 'knee_l', 'knee_r', 'ankle_l', 'ankle_r'];

  const missingJoints = requiredJoints.filter(j => !kpMap[j] || (kpMap[j].score && kpMap[j].score < 0.45));
  if (missingJoints.length > 2) {
    return { isPositioned: false, issue: '📱 Step back! Full body (head to feet) must be visible.' };
  }

  // Edge clipping check
  const marginX = width * 0.03;
  const marginY = height * 0.03;

  const head = kpMap['head'];
  const ankleL = kpMap['ankle_l'];
  const ankleR = kpMap['ankle_r'];

  if (head && head.y < marginY) {
    return { isPositioned: false, issue: '⬆️ Adjust camera! Head is clipped at top.' };
  }
  if ((ankleL && ankleL.y > height - marginY) || (ankleR && ankleR.y > height - marginY)) {
    return { isPositioned: false, issue: '⬇️ Adjust camera! Feet are clipped at bottom.' };
  }

  return { isPositioned: true, issue: '🟢 Perfect positioning! Ready to start.' };
}
