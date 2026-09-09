/**
 * SportX — Vision Integration Module (Phase 3 Foundation)
 * Defines structured contracts for Computer Vision (Python/MediaPipe/OpenCV) -> Backend integration.
 */

export interface VisionFormError {
  code: string;
  severity: 'low' | 'medium' | 'high';
}

export interface VisionResultPayload {
  sessionId: string;
  exerciseId: string;
  reps: number;
  formScore: number;
  errors: VisionFormError[];
  confidence: number;
}
