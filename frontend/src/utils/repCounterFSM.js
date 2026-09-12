/**
 * SportX Rep Counter Finite State Machine (FSM) & Voice Coach
 * Implements real-time biomechanical heuristics, state transitions, audio feedback, and score calculation.
 * Supports: squat, pushup, jumping_jacks
 */

import { calculateAngle, calculateSpineAngle, checkKneeValgus } from './poseMath.js';

// Audio Voice Coach (Web Speech API)
let lastSpokenTime = 0;
export function speakFeedback(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const now = Date.now();
  if (now - lastSpokenTime < 2500) return;
  lastSpokenTime = now;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}

export function triggerHapticFeedback() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate([40, 30, 40]); } catch (_) {}
  }
}

/** Anti-cheat cadence: minimum ms between counted reps */
const MIN_REP_INTERVAL_MS = 600;

function getJoint(lm, index, name) {
  if (!lm) return null;
  if (Array.isArray(lm)) {
    return lm[index] || null;
  }
  if (typeof lm === 'object') {
    return lm[name] || null;
  }
  return null;
}

function isValidJointSegment(a, b) {
  if (!a || !b) return false;
  const scoreA = a.score ?? a.visibility ?? 1.0;
  const scoreB = b.score ?? b.visibility ?? 1.0;
  if (scoreA < 0.35 || scoreB < 0.35) return false;
  return Math.abs(a.x - b.x) > 0.005 || Math.abs(a.y - b.y) > 0.005;
}

export class RepCounterFSM {
  constructor(exerciseId = 'squat') {
    this.exerciseId = exerciseId;
    this.exerciseType = exerciseId;
    this.state = exerciseId === 'pushup' ? 'PLANK' : exerciseId === 'jumping_jacks' ? 'NEUTRAL' : 'UP';
    this.reps = 0;
    this.validFormReps = 0;
    this.currentAngle = 0;
    this.currentFormScore = 100;
    this.scores = [];
    this.feedbackLog = [];
    this.minAngleReached = 180;
    this.lastRepTime = 0;
    this.repDurations = [];
    this.currentStreak = 0;
    this.streak = 0;
    this.bestStreak = 0;
  }

  processFrame(keypointsMap) {
    if (!keypointsMap) return this.getStatus();

    switch (this.exerciseId) {
      case 'squat':
        this._processSquat(keypointsMap);
        break;
      case 'pushup':
        this._processPushup(keypointsMap);
        break;
      case 'jumping_jacks':
        this._processJumpingJacks(keypointsMap);
        break;
      default:
        this._processSquat(keypointsMap);
        break;
    }

    return this.getStatus();
  }

  _processSquat(kp) {
    const hipL = getJoint(kp, 23, 'hip_l');
    const hipR = getJoint(kp, 24, 'hip_r');
    const kneeL = getJoint(kp, 25, 'knee_l');
    const kneeR = getJoint(kp, 26, 'knee_r');
    const ankleL = getJoint(kp, 27, 'ankle_l');
    const ankleR = getJoint(kp, 28, 'ankle_r');

    if (!kneeL && !kneeR) return;

    // Calculate left & right knee angles for valid, non-degenerate joints
    const angles = [];
    if (hipL && kneeL && ankleL && isValidJointSegment(hipL, kneeL) && isValidJointSegment(kneeL, ankleL)) {
      angles.push(calculateAngle(hipL, kneeL, ankleL));
    }
    if (hipR && kneeR && ankleR && isValidJointSegment(hipR, kneeR) && isValidJointSegment(kneeR, ankleR)) {
      angles.push(calculateAngle(hipR, kneeR, ankleR));
    }

    if (angles.length === 0) {
      if (hipL && kneeL && isValidJointSegment(hipL, kneeL)) {
        angles.push(calculateAngle(hipL, kneeL, { x: kneeL.x, y: kneeL.y + 100 }));
      } else if (hipR && kneeR && isValidJointSegment(hipR, kneeR)) {
        angles.push(calculateAngle(hipR, kneeR, { x: kneeR.x, y: kneeR.y + 100 }));
      }
    }

    if (angles.length === 0) return;

    const kneeAngle = Math.min(...angles);
    this.currentAngle = Math.round(kneeAngle);

    // Track minimum angle reached during depth
    if (this.state === 'DESCENDING' || this.state === 'BOTTOM') {
      this.minAngleReached = Math.min(this.minAngleReached, kneeAngle);
    }

    // Check Knee Valgus (knees caving in)
    if (hipL && hipR && kneeL && kneeR && ankleL && ankleR && isValidJointSegment(hipL, hipR)) {
      const valgusCheck = checkKneeValgus(hipL, hipR, kneeL, kneeR, ankleL, ankleR);
      if (this.state === 'DESCENDING' && valgusCheck.isValgus) {
        this.addFeedback(valgusCheck.message, -5);
        speakFeedback("Keep your knees outward!");
      }
    }

    // FSM State Logic: UP -> DESCENDING -> BOTTOM -> ASCENDING -> UP
    if (this.state === 'UP') {
      if (kneeAngle < 150) {
        this.state = 'DESCENDING';
        this.minAngleReached = kneeAngle;
      }
    } else if (this.state === 'DESCENDING') {
      if (kneeAngle <= 95) {
        this.state = 'BOTTOM';
      } else if (kneeAngle > 165) {
        this.state = 'UP';
        this.addFeedback('Shallow rep! Squat lower until thighs are parallel to ground.', -15);
        speakFeedback("Go lower for a valid rep!");
      }
    } else if (this.state === 'BOTTOM') {
      if (kneeAngle > 105) {
        this.state = 'ASCENDING';
      }
    } else if (this.state === 'ASCENDING') {
      if (kneeAngle >= 160) {
        const now = Date.now();
        if (now - this.lastRepTime >= MIN_REP_INTERVAL_MS) {
          this._onRepComplete(this.minAngleReached <= 95 ? 100 : 70, 'Great depth! Squeeze glutes at top');
        }
        this.state = 'UP';
        this.minAngleReached = 180;
      }
    }
  }

  _processPushup(kp) {
    const shoulderL = getJoint(kp, 11, 'shoulder_l');
    const shoulderR = getJoint(kp, 12, 'shoulder_r');
    const elbowL = getJoint(kp, 13, 'elbow_l');
    const elbowR = getJoint(kp, 14, 'elbow_r');
    const wristL = getJoint(kp, 15, 'wrist_l');
    const wristR = getJoint(kp, 16, 'wrist_r');
    const hipL = getJoint(kp, 23, 'hip_l');

    if (!elbowL && !elbowR) return;

    const angles = [];
    if (shoulderL && elbowL && wristL && isValidJointSegment(shoulderL, elbowL) && isValidJointSegment(elbowL, wristL)) {
      angles.push(calculateAngle(shoulderL, elbowL, wristL));
    }
    if (shoulderR && elbowR && wristR && isValidJointSegment(shoulderR, elbowR) && isValidJointSegment(elbowR, wristR)) {
      angles.push(calculateAngle(shoulderR, elbowR, wristR));
    }

    if (angles.length === 0) return;

    const elbowAngle = Math.min(...angles);
    this.currentAngle = Math.round(elbowAngle);

    // Check spine alignment
    if (shoulderL && hipL && isValidJointSegment(shoulderL, hipL)) {
      const spineAngle = calculateSpineAngle(shoulderL, hipL);
      if (spineAngle > 20) {
        this.addFeedback('Keep your core tight! Avoid sagging hips.', -5);
        speakFeedback("Keep your core tight!");
      }
    }

    // FSM State Logic: PLANK -> DESCENDING -> INFLECTION -> ASCENDING -> PLANK
    if (this.state === 'PLANK' || this.state === 'UP') {
      if (elbowAngle < 150) {
        this.state = 'DESCENDING';
        this.minAngleReached = elbowAngle;
      }
    } else if (this.state === 'DESCENDING') {
      this.minAngleReached = Math.min(this.minAngleReached, elbowAngle);
      if (elbowAngle <= 95) {
        this.state = 'INFLECTION';
      }
    } else if (this.state === 'INFLECTION') {
      if (elbowAngle > 105) {
        this.state = 'ASCENDING';
      }
    } else if (this.state === 'ASCENDING') {
      if (elbowAngle >= 155) {
        const now = Date.now();
        if (now - this.lastRepTime >= MIN_REP_INTERVAL_MS) {
          this._onRepComplete(this.minAngleReached <= 95 ? 100 : 75, 'Solid chest depth!');
        }
        this.state = 'PLANK';
        this.minAngleReached = 180;
      }
    }
  }

  _processJumpingJacks(kp) {
    const shoulderL = getJoint(kp, 11, 'shoulder_l');
    const shoulderR = getJoint(kp, 12, 'shoulder_r');
    const wristL = getJoint(kp, 15, 'wrist_l');
    const wristR = getJoint(kp, 16, 'wrist_r');
    const ankleL = getJoint(kp, 27, 'ankle_l');
    const ankleR = getJoint(kp, 28, 'ankle_r');

    if (!shoulderL || !shoulderR || !ankleL || !ankleR || !wristL || !wristR) return;
    if (!isValidJointSegment(shoulderL, shoulderR)) return;

    const shoulderWidth = Math.abs(shoulderR.x - shoulderL.x) || 1;
    const ankleDist = Math.abs(ankleR.x - ankleL.x);
    const feetRatio = ankleDist / shoulderWidth;

    const wristY = (wristL.y + wristR.y) / 2;
    const shoulderY = (shoulderL.y + shoulderR.y) / 2;
    const armsOverhead = wristY < shoulderY;

    this.currentAngle = Math.round(feetRatio * 100);

    // FSM State Logic: NEUTRAL -> EXTENDED -> NEUTRAL
    if (this.state === 'NEUTRAL') {
      if (feetRatio > 1.35 && armsOverhead) {
        this.state = 'EXTENDED';
      }
    } else if (this.state === 'EXTENDED') {
      if (feetRatio < 1.15 && !armsOverhead) {
        const now = Date.now();
        if (now - this.lastRepTime >= MIN_REP_INTERVAL_MS) {
          this._onRepComplete(100, 'Rhythm is spot on!');
        }
        this.state = 'NEUTRAL';
      }
    }
  }

  _onRepComplete(score, praiseMsg) {
    this.reps += 1;
    const now = Date.now();
    const duration = this.lastRepTime > 0 ? (now - this.lastRepTime) / 1000 : 2.0;
    this.lastRepTime = now;
    if (duration < 10) this.repDurations.push(duration);

    if (score >= 80) {
      this.validFormReps += 1;
      this.currentStreak += 1;
      this.streak += 1;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    } else {
      this.currentStreak = 0;
      this.streak = 0;
    }

    this.scores.push(score);
    this.currentFormScore = Math.round(this.scores.reduce((a, b) => a + b, 0) / this.scores.length);

    triggerHapticFeedback();
    speakFeedback(`Rep ${this.reps}! ${praiseMsg}`);
  }

  addFeedback(msg, scorePenalty = 0) {
    if (!this.feedbackLog.includes(msg)) {
      this.feedbackLog.unshift(msg);
      if (this.feedbackLog.length > 4) this.feedbackLog.pop();
    }
    if (scorePenalty !== 0) {
      this.currentFormScore = Math.max(50, this.currentFormScore + scorePenalty);
    }
  }

  getStatus() {
    const avgTempo = this.repDurations.length > 0
      ? (this.repDurations.reduce((a, b) => a + b, 0) / this.repDurations.length).toFixed(1)
      : '0.0';

    return {
      state: this.state,
      fsmState: this.state,
      reps: this.reps,
      validFormReps: this.validFormReps,
      formScore: this.currentFormScore,
      currentAngle: this.currentAngle,
      currentStreak: this.currentStreak,
      streak: this.streak,
      bestStreak: this.bestStreak,
      avgTempoPacing: avgTempo,
      feedback: this.feedbackLog,
      feedbackLog: this.feedbackLog,
      totalScore: Math.round(this.reps * (this.currentFormScore / 100) * 10)
    };
  }

  getState() {
    return this.getStatus();
  }

  reset() {
    this.state = this.exerciseId === 'pushup' ? 'PLANK' : this.exerciseId === 'jumping_jacks' ? 'NEUTRAL' : 'UP';
    this.reps = 0;
    this.validFormReps = 0;
    this.currentAngle = 0;
    this.currentFormScore = 100;
    this.scores = [];
    this.feedbackLog = [];
    this.minAngleReached = 180;
    this.lastRepTime = 0;
    this.repDurations = [];
    this.currentStreak = 0;
    this.streak = 0;
    this.bestStreak = 0;
  }
}
