/**
 * SportX Rep Counter Finite State Machine (FSM)
 * Tracks exercise repetitions via real-time biomechanical joint angles & landmarks.
 * Supports: squat, pushup, jumping_jacks
 */

import { calculate3PointAngle, calculateSpineAngle, type Landmark } from './poseMath';

export type ExerciseType = 'squat' | 'pushup' | 'jumping_jacks' | 'bicep_curl';
export type FSMState = 'UP' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING' | 'PLANK' | 'INFLECTION' | 'NEUTRAL' | 'EXTENDED';

export interface RepCounterState {
  reps: number;
  currentAngle: number;
  fsmState: FSMState;
  state: FSMState; // alias for compatibility
  formScore: number;
  feedback: string[];
  feedbackLog: string[]; // alias for compatibility
  streak: number;
  currentStreak: number; // alias for compatibility
  bestStreak: number;
  validFormReps: number;
  totalScore: number;
}

export interface DetectedBiomechanicalError {
  code: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SessionTelemetry {
  reps: number;
  validFormReps: number;
  formScore: number;
  minAngle: number | null;
  averageAngle: number | null;
  cadenceRepsPerMinute: number | null;
  detectedErrors: DetectedBiomechanicalError[];
  feedbackLog: string[];
  confidence: number | null;
  exerciseId: string;
  durationSeconds: number;
  visionVersion: string;
}

/** Anti-cheat cadence: minimum ms between counted reps */
const MIN_REP_INTERVAL_MS = 600;

// Audio Voice Coach (Web Speech API)
let lastSpokenTime = 0;
export function speakFeedback(text: string) {
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

/** Helper to extract a landmark from either a MediaPipe 33-array or a named keypoint map */
function getJoint(lm: any, index: number, name: string): Landmark | null {
  if (!lm) return null;
  if (Array.isArray(lm)) {
    return lm[index] || null;
  }
  if (typeof lm === 'object') {
    return lm[name] || null;
  }
  return null;
}

/** Verify segment is non-degenerate and has sufficient confidence score */
function isValidJointSegment(a: Landmark | null, b: Landmark | null): boolean {
  if (!a || !b) return false;
  const scoreA = (a as any).score ?? a.visibility ?? 1.0;
  const scoreB = (b as any).score ?? b.visibility ?? 1.0;
  if (scoreA < 0.35 || scoreB < 0.35) return false;
  return Math.abs(a.x - b.x) > 0.005 || Math.abs(a.y - b.y) > 0.005;
}

export class RepCounterFSM {
  public exerciseType: ExerciseType;
  public state: FSMState;
  public reps = 0;
  public validFormReps = 0;
  public currentAngle = 0;
  public currentFormScore = 100;
  public scores: number[] = [];
  public feedbackLog: string[] = [];
  public minAngleReached = 180;
  public lastRepTime = 0;
  public repDurations: number[] = [];
  public streak = 0;
  public bestStreak = 0;
  public detectedErrors: DetectedBiomechanicalError[] = [];
  public angles: number[] = [];
  public confidenceScores: number[] = [];

  constructor(exerciseType: ExerciseType = 'squat') {
    this.exerciseType = exerciseType;
    if (exerciseType === 'pushup') {
      this.state = 'PLANK';
    } else if (exerciseType === 'jumping_jacks') {
      this.state = 'NEUTRAL';
    } else {
      this.state = 'UP';
    }
  }

  recordError(code: string, severity: 'low' | 'medium' | 'high' = 'medium') {
    if (!this.detectedErrors.some(e => e.code === code)) {
      this.detectedErrors.push({ code, severity });
    }
  }

  /** Process a new frame of pose landmarks */
  processFrame(landmarks: any): RepCounterState {
    if (!landmarks) return this.getState();

    // Track landmark confidence if available
    if (Array.isArray(landmarks)) {
      const valid = landmarks.filter((l: any) => l && (typeof l.visibility === 'number' || typeof l.score === 'number'));
      if (valid.length > 0) {
        const sum = valid.reduce((acc: number, l: any) => acc + (l.visibility ?? l.score ?? 1.0), 0);
        this.confidenceScores.push(sum / valid.length);
      }
    }

    switch (this.exerciseType) {
      case 'squat':
        this._processSquat(landmarks);
        break;
      case 'pushup':
        this._processPushup(landmarks);
        break;
      case 'jumping_jacks':
        this._processJumpingJacks(landmarks);
        break;
      default:
        this._processSquat(landmarks);
        break;
    }

    return this.getState();
  }

  private _processSquat(lm: any) {
    const hipL = getJoint(lm, 23, 'hip_l');
    const hipR = getJoint(lm, 24, 'hip_r');
    const kneeL = getJoint(lm, 25, 'knee_l');
    const kneeR = getJoint(lm, 26, 'knee_r');
    const ankleL = getJoint(lm, 27, 'ankle_l');
    const ankleR = getJoint(lm, 28, 'ankle_r');
    const shoulderL = getJoint(lm, 11, 'shoulder_l');

    if (!kneeL && !kneeR) return;

    // Calculate bilateral knee angles for valid, separated limbs
    const angles: number[] = [];
    if (hipL && kneeL && ankleL && isValidJointSegment(hipL, kneeL) && isValidJointSegment(kneeL, ankleL)) {
      angles.push(calculate3PointAngle(hipL, kneeL, ankleL));
    }
    if (hipR && kneeR && ankleR && isValidJointSegment(hipR, kneeR) && isValidJointSegment(kneeR, ankleR)) {
      angles.push(calculate3PointAngle(hipR, kneeR, ankleR));
    }

    if (angles.length === 0) {
      // Fallback if ankles obscured: use vertical axis below knee
      if (hipL && kneeL && isValidJointSegment(hipL, kneeL)) {
        const fakeAnkle = { x: kneeL.x, y: kneeL.y + 0.3 };
        angles.push(calculate3PointAngle(hipL, kneeL, fakeAnkle));
      } else if (hipR && kneeR && isValidJointSegment(hipR, kneeR)) {
        const fakeAnkle = { x: kneeR.x, y: kneeR.y + 0.3 };
        angles.push(calculate3PointAngle(hipR, kneeR, fakeAnkle));
      }
    }

    if (angles.length === 0) return;

    const kneeAngle = Math.min(...angles);
    this.currentAngle = Math.round(kneeAngle);
    this.angles.push(this.currentAngle);

    if (this.state === 'DESCENDING' || this.state === 'BOTTOM') {
      this.minAngleReached = Math.min(this.minAngleReached, kneeAngle);
    }

    // Check knee valgus (knees caving inward)
    if (hipL && hipR && kneeL && kneeR && ankleL && ankleR) {
      const kneeWidth = Math.abs(kneeR.x - kneeL.x);
      const hipWidth = Math.abs(hipR.x - hipL.x);
      const ankleWidth = Math.abs(ankleR.x - ankleL.x);
      if (kneeAngle < 120 && (kneeWidth < ankleWidth * 0.78 || kneeWidth < hipWidth * 0.7)) {
        this.recordError('knees_inward', 'medium');
        this.addFeedback('Push knees outward over toes', -10);
      }
    }

    // Spine check if shoulder & hip visible
    if (shoulderL && hipL && isValidJointSegment(shoulderL, hipL)) {
      const spine = calculateSpineAngle(shoulderL, hipL);
      if (spine > 35) {
        this.recordError('chest_collapse', 'medium');
        this.addFeedback('Keep your back straight', -10);
      }
    }

    // FSM State transitions: UP -> DESCENDING -> BOTTOM -> ASCENDING -> UP
    if (this.state === 'UP') {
      if (kneeAngle < 150) {
        this.state = 'DESCENDING';
        this.minAngleReached = kneeAngle;
      }
    } else if (this.state === 'DESCENDING') {
      if (kneeAngle <= 95) {
        this.state = 'BOTTOM';
      } else if (kneeAngle > 165) {
        // User stood back up without reaching depth
        this.state = 'UP';
        this.recordError('shallow_depth', 'low');
        this.addFeedback('Go lower for a valid squat rep', -15);
      }
    } else if (this.state === 'BOTTOM') {
      if (kneeAngle > 105) {
        this.state = 'ASCENDING';
      }
    } else if (this.state === 'ASCENDING') {
      if (kneeAngle >= 160) {
        const now = Date.now();
        if (now - this.lastRepTime >= MIN_REP_INTERVAL_MS) {
          const isDeep = this.minAngleReached <= 95;
          this._onRepComplete(isDeep ? 100 : 70, 'Great depth! Squeeze glutes at top');
        }
        this.state = 'UP';
        this.minAngleReached = 180;
      }
    }
  }

  private _processPushup(lm: any) {
    const shoulderL = getJoint(lm, 11, 'shoulder_l');
    const shoulderR = getJoint(lm, 12, 'shoulder_r');
    const elbowL = getJoint(lm, 13, 'elbow_l');
    const elbowR = getJoint(lm, 14, 'elbow_r');
    const wristL = getJoint(lm, 15, 'wrist_l');
    const wristR = getJoint(lm, 16, 'wrist_r');
    const hipL = getJoint(lm, 23, 'hip_l');

    if (!elbowL && !elbowR) return;

    // Calculate bilateral elbow angles
    const angles: number[] = [];
    if (shoulderL && elbowL && wristL && isValidJointSegment(shoulderL, elbowL) && isValidJointSegment(elbowL, wristL)) {
      angles.push(calculate3PointAngle(shoulderL, elbowL, wristL));
    }
    if (shoulderR && elbowR && wristR && isValidJointSegment(shoulderR, elbowR) && isValidJointSegment(elbowR, wristR)) {
      angles.push(calculate3PointAngle(shoulderR, elbowR, wristR));
    }

    if (angles.length === 0) return;

    const elbowAngle = Math.min(...angles);
    this.currentAngle = Math.round(elbowAngle);
    this.angles.push(this.currentAngle);

    // Spine check if hip & shoulder available
    if (shoulderL && hipL && isValidJointSegment(shoulderL, hipL)) {
      const spine = calculateSpineAngle(shoulderL, hipL);
      if (spine > 25) {
        this.recordError('hip_sag', 'medium');
        this.addFeedback('Keep your core tight! Avoid sagging hips.', -5);
      }
    }

    // FSM State transitions: PLANK -> DESCENDING -> INFLECTION -> ASCENDING -> PLANK
    if (this.state === 'PLANK' || (this.state as string) === 'UP') {
      if (elbowAngle < 150) {
        this.state = 'DESCENDING';
        this.minAngleReached = elbowAngle;
      }
    } else if (this.state === 'DESCENDING') {
      this.minAngleReached = Math.min(this.minAngleReached, elbowAngle);
      if (elbowAngle <= 95) {
        this.state = 'INFLECTION';
      } else if (elbowAngle > 155) {
        this.state = 'PLANK';
        this.recordError('shallow_depth', 'low');
        this.addFeedback('Lower chest closer to ground for full rep', -15);
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

  private _processJumpingJacks(lm: any) {
    const shoulderL = getJoint(lm, 11, 'shoulder_l');
    const shoulderR = getJoint(lm, 12, 'shoulder_r');
    const wristL = getJoint(lm, 15, 'wrist_l');
    const wristR = getJoint(lm, 16, 'wrist_r');
    const ankleL = getJoint(lm, 27, 'ankle_l');
    const ankleR = getJoint(lm, 28, 'ankle_r');

    if (!shoulderL || !shoulderR || !ankleL || !ankleR || !wristL || !wristR) return;
    if (!isValidJointSegment(shoulderL, shoulderR)) return;

    const shoulderWidth = Math.abs(shoulderR.x - shoulderL.x) || 1;
    const ankleDist = Math.abs(ankleR.x - ankleL.x);
    const feetRatio = ankleDist / shoulderWidth;

    const wristY = (wristL.y + wristR.y) / 2;
    const shoulderY = (shoulderL.y + shoulderR.y) / 2;
    const armsOverhead = wristY < shoulderY;

    this.currentAngle = Math.round(feetRatio * 100);
    this.angles.push(this.currentAngle);

    // FSM State transitions: NEUTRAL -> EXTENDED -> NEUTRAL
    if (this.state === 'NEUTRAL') {
      if (feetRatio > 1.35) {
        if (armsOverhead) {
          this.state = 'EXTENDED';
        } else {
          this.recordError('arms_not_overhead', 'low');
          this.addFeedback('Raise arms fully overhead', -5);
        }
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

  private _onRepComplete(score: number, praiseMsg: string) {
    this.reps += 1;
    const now = Date.now();
    const duration = this.lastRepTime > 0 ? (now - this.lastRepTime) / 1000 : 2.0;
    this.lastRepTime = now;
    if (duration < 10) this.repDurations.push(duration);

    if (score >= 80) {
      this.validFormReps += 1;
      this.streak += 1;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    } else {
      this.streak = 0;
    }

    this.scores.push(score);
    this.currentFormScore = Math.round(this.scores.reduce((a, b) => a + b, 0) / this.scores.length);

    triggerHapticFeedback();
    speakFeedback(`Rep ${this.reps}! ${praiseMsg}`);
  }

  addFeedback(msg: string, scorePenalty = 0) {
    if (!this.feedbackLog.includes(msg)) {
      this.feedbackLog.unshift(msg);
      if (this.feedbackLog.length > 4) this.feedbackLog.pop();
    }
    if (scorePenalty !== 0) {
      this.currentFormScore = Math.max(50, this.currentFormScore + scorePenalty);
    }
  }

  getState(): RepCounterState {
    return {
      reps: this.reps,
      validFormReps: this.validFormReps,
      currentAngle: this.currentAngle,
      fsmState: this.state,
      state: this.state,
      formScore: this.getAverageFormScore(),
      feedback: this.feedbackLog,
      feedbackLog: this.feedbackLog,
      streak: this.streak,
      currentStreak: this.streak,
      bestStreak: this.bestStreak,
      totalScore: Math.round(this.reps * (this.getAverageFormScore() / 100) * 10),
    };
  }

  getStatus(): RepCounterState {
    return this.getState();
  }

  getTelemetry(durationSeconds: number): SessionTelemetry {
    const avgScore = this.getAverageFormScore();
    const avgConfidence = this.confidenceScores.length > 0
      ? Math.round((this.confidenceScores.reduce((a, b) => a + b, 0) / this.confidenceScores.length) * 100) / 100
      : null;
    const avgAngle = this.angles.length > 0
      ? Math.round(this.angles.reduce((a, b) => a + b, 0) / this.angles.length)
      : null;
    const minAngle = this.minAngleReached < 180 ? Math.round(this.minAngleReached) : null;
    const cadence = durationSeconds > 0 ? Math.round((this.reps / durationSeconds) * 60) : null;

    return {
      reps: this.reps,
      validFormReps: this.validFormReps,
      formScore: avgScore,
      minAngle,
      averageAngle: avgAngle,
      cadenceRepsPerMinute: cadence,
      detectedErrors: [...this.detectedErrors],
      feedbackLog: [...this.feedbackLog],
      confidence: avgConfidence,
      exerciseId: this.exerciseType,
      durationSeconds,
      visionVersion: '2.0.0-mediapipe',
    };
  }

  getAverageFormScore(): number {
    if (this.scores.length === 0) return 100;
    const sum = this.scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.scores.length);
  }

  reset() {
    if (this.exerciseType === 'pushup') {
      this.state = 'PLANK';
    } else if (this.exerciseType === 'jumping_jacks') {
      this.state = 'NEUTRAL';
    } else {
      this.state = 'UP';
    }
    this.reps = 0;
    this.validFormReps = 0;
    this.currentAngle = 0;
    this.scores = [];
    this.currentFormScore = 100;
    this.lastRepTime = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.feedbackLog = [];
    this.minAngleReached = 180;
    this.detectedErrors = [];
    this.angles = [];
    this.confidenceScores = [];
  }
}
