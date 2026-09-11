/**
 * SportX Computer Vision — Data Contract & Validators (Phase 3)
 * Enforces standardized JSON structure between Computer Vision system and SportX backend.
 * 
 * Rules:
 * 1. Computer Vision detects pose/reps/errors; backend validates and stores.
 * 2. Strict type, range, and bounds checking.
 * 3. Never trust client/external payloads without validation.
 */

export type ErrorSeverity = 'low' | 'medium' | 'high';

export interface VisionFormError {
  code: string;
  severity: ErrorSeverity;
  description?: string;
}

export interface VisionResultPayload {
  sessionId: string;
  exerciseId: string;
  reps: number;
  formScore: number;
  confidence: number;
  errors: VisionFormError[];
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface ValidatedVisionResult extends VisionResultPayload {
  validatedAt: string;
}

export interface VisionValidationResult {
  isValid: boolean;
  data?: ValidatedVisionResult;
  errors: string[];
}

const VALID_SEVERITIES = new Set<ErrorSeverity>(['low', 'medium', 'high']);

// Known exercises in SportX catalogue
const VALID_EXERCISES = new Set<string>([
  'squat',
  'pushup',
  'bicep_curl',
  'plank',
  'jumping_jacks',
  'lunge',
  'burpee'
]);

/**
 * Validates an incoming Vision Result JSON payload against the Phase 3 contract.
 */
export function validateVisionResult(raw: unknown): VisionValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      isValid: false,
      errors: ['Vision result payload must be a non-null JSON object']
    };
  }

  const obj = raw as Record<string, any>;

  // 1. Validate sessionId
  if (!obj.sessionId || typeof obj.sessionId !== 'string' || obj.sessionId.trim().length === 0) {
    errors.push('Field "sessionId" is required and must be a non-empty string');
  }

  // 2. Validate exerciseId
  if (!obj.exerciseId || typeof obj.exerciseId !== 'string' || obj.exerciseId.trim().length === 0) {
    errors.push('Field "exerciseId" is required and must be a non-empty string');
  } else {
    const cleanExercise = obj.exerciseId.trim().toLowerCase();
    if (!VALID_EXERCISES.has(cleanExercise)) {
      // Allow custom exercises but enforce formatting (alphanumeric + underscore)
      if (!/^[a-z0-9_-]{2,30}$/i.test(cleanExercise)) {
        errors.push(`Field "exerciseId" contains invalid characters: "${obj.exerciseId}"`);
      }
    }
  }

  // 3. Validate reps
  if (typeof obj.reps !== 'number' || !Number.isInteger(obj.reps) || obj.reps < 0) {
    errors.push('Field "reps" is required and must be a non-negative integer');
  } else if (obj.reps > 1000) {
    errors.push('Field "reps" exceeds realistic single-session limit of 1000');
  }

  // 4. Validate formScore (0 to 100)
  if (typeof obj.formScore !== 'number' || isNaN(obj.formScore) || obj.formScore < 0 || obj.formScore > 100) {
    errors.push('Field "formScore" is required and must be a number between 0 and 100');
  }

  // 5. Validate confidence
  let normalizedConfidence = obj.confidence;
  if (typeof obj.confidence !== 'number' || isNaN(obj.confidence)) {
    errors.push('Field "confidence" is required and must be a number');
  } else {
    // If sent as percentage 0-100, normalize to 0-1
    if (obj.confidence > 1 && obj.confidence <= 100) {
      normalizedConfidence = Number((obj.confidence / 100).toFixed(2));
    } else if (obj.confidence < 0 || obj.confidence > 1) {
      errors.push('Field "confidence" must be between 0.0 and 1.0 (or 0 and 100%)');
    }
  }

  // 6. Validate errors array
  const validatedErrors: VisionFormError[] = [];
  if (!Array.isArray(obj.errors)) {
    errors.push('Field "errors" is required and must be an array of detected form errors');
  } else {
    for (let i = 0; i < obj.errors.length; i++) {
      const item = obj.errors[i];
      if (typeof item === 'string') {
        // String shorthand: convert to { code, severity: 'medium' }
        if (item.trim().length === 0) {
          errors.push(`Error code at index ${i} cannot be an empty string`);
        } else {
          validatedErrors.push({
            code: item.trim().toLowerCase(),
            severity: 'medium'
          });
        }
      } else if (item && typeof item === 'object') {
        if (!item.code || typeof item.code !== 'string' || item.code.trim().length === 0) {
          errors.push(`Error at index ${i} requires a non-empty "code" string`);
        } else {
          const code = item.code.trim().toLowerCase();
          let rawSeverity = item.severity ? String(item.severity).toLowerCase() : 'medium';
          if (rawSeverity === 'moderate') rawSeverity = 'medium';
          const severity = rawSeverity as ErrorSeverity;
          if (!VALID_SEVERITIES.has(severity)) {
            errors.push(`Error "${code}" has invalid severity "${item.severity}". Must be "low", "medium", or "high"`);
          } else {
            validatedErrors.push({
              code,
              severity,
              ...(item.description ? { description: String(item.description).trim() } : {})
            });
          }
        }
      } else {
        errors.push(`Error item at index ${i} must be an object or error code string`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  const validatedData: ValidatedVisionResult = {
    sessionId: String(obj.sessionId).trim(),
    exerciseId: String(obj.exerciseId).trim().toLowerCase(),
    reps: obj.reps,
    formScore: Math.round(obj.formScore * 10) / 10,
    confidence: Math.round(normalizedConfidence * 100) / 100,
    errors: validatedErrors,
    timestamp: obj.timestamp ? String(obj.timestamp) : new Date().toISOString(),
    validatedAt: new Date().toISOString(),
    ...(obj.metadata && typeof obj.metadata === 'object' ? { metadata: obj.metadata } : {})
  };

  return {
    isValid: true,
    data: validatedData,
    errors: []
  };
}
