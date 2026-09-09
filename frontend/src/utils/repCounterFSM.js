/**
 * SportX Rep Counter Finite State Machine (FSM) & Voice Coach
 * Implements real-time biomechanical heuristics, state transitions, audio feedback, and score calculation.
 */

import { calculateAngle, calculateSpineAngle, checkKneeValgus } from './poseMath.js';

// Audio Voice Coach (Web Speech API)
let lastSpokenTime = 0;
export function speakFeedback(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const now = Date.now();
  if (now - lastSpokenTime < 2500) return; // Throttle TTS announcements
  lastSpokenTime = now;

  window.speechSynthesis.cancel(); // Stop any pending speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;
  utterance.volume = 0.9;
  window.speechSynthesis.speak(utterance);
}

export function triggerHapticFeedback() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate([40, 30, 40]); } catch (_) {}
  }
}

export class RepCounterFSM {
  constructor(exerciseId = 'squat') {
    this.exerciseId = exerciseId;
    this.state = exerciseId === 'pushup' ? 'PLANK' : exerciseId === 'jumping_jacks' ? 'NEUTRAL' : 'UP';
    this.reps = 0;
    this.validFormReps = 0;
    this.currentFormScore = 100;
    this.scores = [];
    this.feedbackLog = [];
    this.minAngleReached = 180;
    this.lastRepTime = Date.now();
    this.repDurations = [];
    this.currentStreak = 0;
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
    const hipL = kp['hip_l'], hipR = kp['hip_r'];
    const kneeL = kp['knee_l'], kneeR = kp['knee_r'];
    const ankleL = kp['ankle_l'], ankleR = kp['ankle_r'];
    const shoulderL = kp['shoulder_l'], shoulderR = kp['shoulder_r'];

    if (!kneeL || !kneeR || !hipL || !hipR || !ankleL || !ankleR) return;

    // Calculate left & right knee angles
    const angleL = calculateAngle(hipL, kneeL, ankleL);
    const angleR = calculateAngle(hipR, kneeR, ankleR);
    const kneeAngle = Math.min(angleL, angleR);

    // Track minimum angle reached during depth
    if (this.state === 'DESCENDING' || this.state === 'BOTTOM') {
      this.minAngleReached = Math.min(this.minAngleReached, kneeAngle);
    }

    // Check Knee Valgus (knees caving in)
    const valgusCheck = checkKneeValgus(hipL, hipR, kneeL, kneeR, ankleL, ankleR);

    // FSM State Logic
    if (this.state === 'UP') {
      if (kneeAngle < 150) {
        this.state = 'DESCENDING';
        this.minAngleReached = kneeAngle;
      }
    } else if (this.state === 'DESCENDING') {
      if (valgusCheck.isValgus) {
        this.addFeedback(valgusCheck.message, -5);
        speakFeedback("Keep your knees outward!");
      }

      if (kneeAngle <= 95) {
        this.state = 'BOTTOM';
      } else if (kneeAngle > 165) {
        // User came back up without reaching depth
        this.state = 'UP';
        this.addFeedback('⚠️ Shallow rep! Squat lower until thighs are parallel to ground.', -15);
        speakFeedback("Go lower for a valid rep!");
      }
    } else if (this.state === 'BOTTOM') {
      if (kneeAngle > 105) {
        this.state = 'ASCENDING';
      }
    } else if (this.state === 'ASCENDING') {
      if (kneeAngle >= 160) {
        // Valid Rep Completed!
        this._onRepComplete(this.minAngleReached <= 95 ? 100 : 70, 'Great depth! Squeeze glutes at top');
        this.state = 'UP';
        this.minAngleReached = 180;
      }
    }
  }

  _processPushup(kp) {
    const shoulderL = kp['shoulder_l'], shoulderR = kp['shoulder_r'];
    const elbowL = kp['elbow_l'], elbowR = kp['elbow_r'];
    const wristL = kp['wrist_l'], wristR = kp['wrist_r'];
    const hipL = kp['hip_l'], hipR = kp['hip_r'];
    const ankleL = kp['ankle_l'], ankleR = kp['ankle_r'];

    if (!elbowL || !elbowR || !shoulderL || !wristL) return;

    const angleL = calculateAngle(shoulderL, elbowL, wristL);
    const angleR = calculateAngle(shoulderR, elbowR, wristR);
    const elbowAngle = Math.min(angleL, angleR);

    // Check spine alignment (sagging hips)
    const spineAngle = calculateSpineAngle(shoulderL, hipL);
    if (spineAngle > 20) {
      this.addFeedback('⚠️ Keep your core tight! Avoid sagging hips.', -5);
      speakFeedback("Keep your core tight!");
    }

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
        this._onRepComplete(this.minAngleReached <= 95 ? 100 : 75, 'Solid chest depth!');
        this.state = 'PLANK';
        this.minAngleReached = 180;
      }
    }
  }

  _processJumpingJacks(kp) {
    const shoulderL = kp['shoulder_l'], shoulderR = kp['shoulder_r'];
    const wristL = kp['wrist_l'], wristR = kp['wrist_r'];
    const ankleL = kp['ankle_l'], ankleR = kp['ankle_r'];

    if (!shoulderL || !shoulderR || !ankleL || !ankleR || !wristL || !wristR) return;

    const shoulderWidth = Math.abs(shoulderR.x - shoulderL.x) || 1;
    const ankleDist = Math.abs(ankleR.x - ankleL.x);
    const feetRatio = ankleDist / shoulderWidth;

    const wristY = (wristL.y + wristR.y) / 2;
    const shoulderY = (shoulderL.y + shoulderR.y) / 2;
    const armsOverhead = wristY < shoulderY;

    if (this.state === 'NEUTRAL') {
      if (feetRatio > 1.35 && armsOverhead) {
        this.state = 'EXTENDED';
      }
    } else if (this.state === 'EXTENDED') {
      if (feetRatio < 1.15 && !armsOverhead) {
        this._onRepComplete(100, 'Rhythm is spot on!');
        this.state = 'NEUTRAL';
      }
    }
  }

  _onRepComplete(score, praiseMsg) {
    this.reps += 1;
    const now = Date.now();
    const duration = (now - this.lastRepTime) / 1000;
    this.lastRepTime = now;
    if (duration < 10) this.repDurations.push(duration);

    if (score >= 80) {
      this.validFormReps += 1;
      this.currentStreak += 1;
    } else {
      this.currentStreak = 0;
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
      reps: this.reps,
      validFormReps: this.validFormReps,
      formScore: this.currentFormScore,
      currentStreak: this.currentStreak,
      avgTempoPacing: avgTempo,
      feedbackLog: this.feedbackLog,
      totalScore: Math.round(this.reps * (this.currentFormScore / 100) * 10)
    };
  }
}
