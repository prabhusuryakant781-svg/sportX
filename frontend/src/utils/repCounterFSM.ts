/**
 * SportX RepCounter Finite State Machine
 * Tracks exercise repetitions via joint angles from MediaPipe landmarks.
 * Supports: squat, pushup, bicep_curl
 */

import { calculate3PointAngle, type Landmark } from './poseMath';

export type ExerciseType = 'squat' | 'pushup' | 'bicep_curl';
type FSMState = 'UP' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING';

interface ExerciseConfig {
  primaryAngle: (lm: Landmark[]) => number;
  thresholds: { up: number; down: number };
  formChecks: (lm: Landmark[]) => { score: number; feedback: string[] };
}

/** Anti-cheat cadence: minimum ms between counted reps */
const MIN_REP_INTERVAL_MS = 600;

/** Exercise-specific configurations */
const EXERCISE_CONFIGS: Record<ExerciseType, ExerciseConfig> = {
  squat: {
    primaryAngle: (lm) => {
      const hip = lm[23], knee = lm[25], ankle = lm[27];
      return calculate3PointAngle(hip, knee, ankle);
    },
    thresholds: { up: 160, down: 90 },
    formChecks: (lm) => {
      const feedback: string[] = [];
      let score = 100;

      // Check knee alignment
      const hip = lm[23], knee = lm[25], ankle = lm[27];
      const kneeAngle = calculate3PointAngle(hip, knee, ankle);
      if (kneeAngle < 70) { feedback.push('Too deep — watch your knees'); score -= 15; }

      // Check spine
      const shoulder = lm[11], hipL = lm[23];
      const spineAngle = Math.abs(Math.atan2(shoulder.x - hipL.x, -(shoulder.y - hipL.y)) * (180 / Math.PI));
      if (spineAngle > 35) { feedback.push('Keep your back straight'); score -= 20; }

      return { score: Math.max(0, score), feedback };
    },
  },

  pushup: {
    primaryAngle: (lm) => {
      const shoulder = lm[11], elbow = lm[13], wrist = lm[15];
      return calculate3PointAngle(shoulder, elbow, wrist);
    },
    thresholds: { up: 160, down: 80 },
    formChecks: (lm) => {
      const feedback: string[] = [];
      let score = 100;

      // Check body alignment (shoulder-hip-ankle should be ~straight)
      const shoulder = lm[11], hip = lm[23], ankle = lm[27];
      const bodyAngle = calculate3PointAngle(shoulder, hip, ankle);
      if (bodyAngle < 150) { feedback.push('Keep hips aligned — no sagging'); score -= 20; }
      if (bodyAngle > 190) { feedback.push('Lower your hips'); score -= 15; }

      return { score: Math.max(0, score), feedback };
    },
  },

  bicep_curl: {
    primaryAngle: (lm) => {
      const shoulder = lm[11], elbow = lm[13], wrist = lm[15];
      return calculate3PointAngle(shoulder, elbow, wrist);
    },
    thresholds: { up: 150, down: 50 },
    formChecks: (lm) => {
      const feedback: string[] = [];
      let score = 100;

      // Check elbow stays near torso
      const elbow = lm[13], hip = lm[23];
      const elbowDrift = Math.abs(elbow.x - hip.x);
      if (elbowDrift > 0.15) { feedback.push('Keep elbows close to body'); score -= 15; }

      // Check for body swing/cheat
      const shoulder = lm[11];
      const spineAngle = Math.abs(Math.atan2(shoulder.x - hip.x, -(shoulder.y - hip.y)) * (180 / Math.PI));
      if (spineAngle > 20) { feedback.push('Don\'t swing your body'); score -= 20; }

      return { score: Math.max(0, score), feedback };
    },
  },
};

export interface RepCounterState {
  reps: number;
  currentAngle: number;
  fsmState: FSMState;
  formScore: number;
  feedback: string[];
  streak: number;
  bestStreak: number;
}

export class RepCounterFSM {
  private exerciseType: ExerciseType;
  private config: ExerciseConfig;
  private state: FSMState = 'UP';
  private reps = 0;
  private currentAngle = 0;
  private formScores: number[] = [];
  private lastRepTime = 0;
  private streak = 0;
  private bestStreak = 0;
  private lastFeedback: string[] = [];
  private lastSpeechTime = 0;

  constructor(exerciseType: ExerciseType) {
    this.exerciseType = exerciseType;
    this.config = EXERCISE_CONFIGS[exerciseType];
    if (!this.config) {
      throw new Error(`Unsupported exercise type: ${exerciseType}`);
    }
  }

  /** Process a new frame of pose landmarks */
  processFrame(landmarks: Landmark[]): RepCounterState {
    if (!landmarks || landmarks.length < 33) {
      return this.getState();
    }

    const angle = this.config.primaryAngle(landmarks);
    this.currentAngle = angle;
    const { up, down } = this.config.thresholds;

    const now = Date.now();

    switch (this.state) {
      case 'UP':
        if (angle < down) {
          this.state = 'BOTTOM';
        } else if (angle < up) {
          this.state = 'DESCENDING';
        }
        break;

      case 'DESCENDING':
        if (angle < down) {
          this.state = 'BOTTOM';
        }
        break;

      case 'BOTTOM':
        if (angle > down + 15) {
          this.state = 'ASCENDING';
        }
        break;

      case 'ASCENDING':
        if (angle > up) {
          // Rep completed — apply cadence check
          if (now - this.lastRepTime >= MIN_REP_INTERVAL_MS) {
            this.reps++;
            this.lastRepTime = now;

            // Run form checks
            const { score, feedback } = this.config.formChecks(landmarks);
            this.formScores.push(score);
            this.lastFeedback = feedback;

            if (score >= 80) {
              this.streak++;
              if (this.streak > this.bestStreak) this.bestStreak = this.streak;
            } else {
              this.streak = 0;
            }

            // Throttled audio feedback
            this._speakFeedback(score, feedback);
          }
          this.state = 'UP';
        }
        break;
    }

    return this.getState();
  }

  getState(): RepCounterState {
    return {
      reps: this.reps,
      currentAngle: Math.round(this.currentAngle),
      fsmState: this.state,
      formScore: this.getAverageFormScore(),
      feedback: this.lastFeedback,
      streak: this.streak,
      bestStreak: this.bestStreak,
    };
  }

  getAverageFormScore(): number {
    if (this.formScores.length === 0) return 100;
    const sum = this.formScores.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.formScores.length);
  }

  reset() {
    this.state = 'UP';
    this.reps = 0;
    this.currentAngle = 0;
    this.formScores = [];
    this.lastRepTime = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.lastFeedback = [];
  }

  private _speakFeedback(score: number, feedback: string[]) {
    const now = Date.now();
    if (now - this.lastSpeechTime < 3000) return; // throttle to every 3s
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    let msg = '';
    if (this.reps % 5 === 0 && this.reps > 0) {
      msg = `${this.reps} reps!`;
    } else if (score < 70 && feedback.length > 0) {
      msg = feedback[0];
    } else if (this.streak >= 5 && this.streak % 5 === 0) {
      msg = `${this.streak} in a row! Great form!`;
    }

    if (msg) {
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.rate = 1.1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
      this.lastSpeechTime = now;
    }
  }
}
