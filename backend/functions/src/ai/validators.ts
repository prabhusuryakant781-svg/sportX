/**
 * SportX AI Coach — Response Validators (Phase 2)
 * Validates AI responses before returning them to the client.
 * 
 * Rules:
 * 1. Validate every AI response before returning it.
 * 2. Check existence, types, non-empty arrays, non-empty text.
 * 3. Log errors server-side and never blindly return malformed output.
 */

export interface AICoachResponse {
  summary: string;
  strengths: string[];
  recommendations: string[];
  nextFocus: string;
}

export interface ValidationResult {
  isValid: boolean;
  data?: AICoachResponse;
  errors: string[];
}

/**
 * Validates an unknown object against the AICoachResponse contract.
 * Ensures all required fields are present, correctly typed, and meaningful.
 */
export function validateCoachResponse(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      isValid: false,
      errors: ['AI response must be a non-null JSON object']
    };
  }

  const obj = raw as Record<string, any>;

  // 1. Validate summary
  if (typeof obj.summary !== 'string') {
    errors.push('Field "summary" is required and must be a string');
  } else if (obj.summary.trim().length < 5) {
    errors.push('Field "summary" must be at least 5 characters long and not just whitespace');
  }

  // 2. Validate strengths
  if (!Array.isArray(obj.strengths)) {
    errors.push('Field "strengths" is required and must be an array');
  } else if (obj.strengths.length === 0) {
    errors.push('Field "strengths" array must contain at least one observation');
  } else {
    for (let i = 0; i < obj.strengths.length; i++) {
      const item = obj.strengths[i];
      if (typeof item !== 'string' || item.trim().length === 0) {
        errors.push(`Strength item at index ${i} must be a non-empty string`);
      }
    }
  }

  // 3. Validate recommendations
  if (!Array.isArray(obj.recommendations)) {
    errors.push('Field "recommendations" is required and must be an array');
  } else if (obj.recommendations.length === 0) {
    errors.push('Field "recommendations" array must contain at least one actionable recommendation');
  } else {
    for (let i = 0; i < obj.recommendations.length; i++) {
      const item = obj.recommendations[i];
      if (typeof item !== 'string' || item.trim().length === 0) {
        errors.push(`Recommendation item at index ${i} must be a non-empty string`);
      }
    }
  }

  // 4. Validate nextFocus
  if (typeof obj.nextFocus !== 'string') {
    errors.push('Field "nextFocus" is required and must be a string');
  } else if (obj.nextFocus.trim().length < 2) {
    errors.push('Field "nextFocus" must be a non-empty string');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  // Clean and sanitize string values
  const sanitized: AICoachResponse = {
    summary: obj.summary.trim(),
    strengths: obj.strengths.map((s: string) => s.trim()),
    recommendations: obj.recommendations.map((r: string) => r.trim()),
    nextFocus: obj.nextFocus.trim(),
  };

  return {
    isValid: true,
    data: sanitized,
    errors: []
  };
}

/**
 * Type guard helper for AICoachResponse.
 */
export function isAICoachResponse(data: unknown): data is AICoachResponse {
  return validateCoachResponse(data).isValid;
}

// ── AI Form Feedback (Phase 3) ────────────────────────────────────────────────

export interface AIFormFeedbackResponse {
  summary: string;
  doneWell: string[];
  areasToImprove: string[];
  actionableCues: string[];
  nextFocus: string;
}

export interface FormFeedbackValidationResult {
  isValid: boolean;
  data?: AIFormFeedbackResponse;
  errors: string[];
}

/**
 * Validates AI Form Feedback responses generated from Computer Vision data.
 * Enforces summary, doneWell, areasToImprove, actionableCues, and nextFocus.
 */
export function validateFormFeedbackResponse(raw: unknown): FormFeedbackValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      isValid: false,
      errors: ['Form feedback response must be a non-null JSON object']
    };
  }

  const obj = raw as Record<string, any>;

  // 1. Validate summary
  if (typeof obj.summary !== 'string') {
    errors.push('Field "summary" is required and must be a string');
  } else if (obj.summary.trim().length < 5) {
    errors.push('Field "summary" must be at least 5 characters long');
  }

  // 2. Validate doneWell
  if (!Array.isArray(obj.doneWell)) {
    errors.push('Field "doneWell" is required and must be an array');
  } else if (obj.doneWell.length === 0) {
    errors.push('Field "doneWell" array must contain at least one observation');
  } else {
    for (let i = 0; i < obj.doneWell.length; i++) {
      if (typeof obj.doneWell[i] !== 'string' || obj.doneWell[i].trim().length === 0) {
        errors.push(`Item at doneWell[${i}] must be a non-empty string`);
      }
    }
  }

  // 3. Validate areasToImprove
  if (!Array.isArray(obj.areasToImprove)) {
    errors.push('Field "areasToImprove" is required and must be an array');
  } else {
    for (let i = 0; i < obj.areasToImprove.length; i++) {
      if (typeof obj.areasToImprove[i] !== 'string' || obj.areasToImprove[i].trim().length === 0) {
        errors.push(`Item at areasToImprove[${i}] must be a non-empty string`);
      }
    }
  }

  // 4. Validate actionableCues
  if (!Array.isArray(obj.actionableCues)) {
    errors.push('Field "actionableCues" is required and must be an array');
  } else if (obj.actionableCues.length === 0) {
    errors.push('Field "actionableCues" array must contain at least one actionable coaching cue');
  } else {
    for (let i = 0; i < obj.actionableCues.length; i++) {
      if (typeof obj.actionableCues[i] !== 'string' || obj.actionableCues[i].trim().length === 0) {
        errors.push(`Item at actionableCues[${i}] must be a non-empty string`);
      }
    }
  }

  // 5. Validate nextFocus
  if (typeof obj.nextFocus !== 'string') {
    errors.push('Field "nextFocus" is required and must be a string');
  } else if (obj.nextFocus.trim().length < 2) {
    errors.push('Field "nextFocus" must be a non-empty string');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  return {
    isValid: true,
    data: {
      summary: obj.summary.trim(),
      doneWell: obj.doneWell.map((s: string) => s.trim()),
      areasToImprove: obj.areasToImprove.map((s: string) => s.trim()),
      actionableCues: obj.actionableCues.map((s: string) => s.trim()),
      nextFocus: obj.nextFocus.trim()
    },
    errors: []
  };
}
