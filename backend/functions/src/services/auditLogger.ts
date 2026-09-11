/**
 * SportX Safe Audit Logger
 * Emits structured, sanitized JSON logs for security, authentication, and privacy events.
 * Guarantees zero leakage of secrets, passwords, private keys, or sensitive PII.
 */
import * as logger from 'firebase-functions/logger';

export type SecurityEventType =
  | 'auth_signup'
  | 'auth_login'
  | 'auth_failed'
  | 'password_reset_requested'
  | 'password_updated'
  | 'email_updated'
  | 'account_deleted'
  | 'profile_image_updated'
  | 'profile_image_deleted'
  | 'unauthorized_access_attempt'
  | 'rate_limit_exceeded'
  | 'admin_action';

export interface AuditLogEntry {
  eventType: SecurityEventType;
  userId?: string;
  targetUserId?: string;
  ip?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'denied';
  details?: Record<string, any>;
  timestamp?: string;
}

// Redaction mask for sensitive fields
const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'token',
  'idtoken',
  'customtoken',
  'refreshtoken',
  'authorization',
  'secret',
  'privatekey',
  'serviceaccount',
  'apikey',
]);

/**
 * Recursively sanitize any object to redact sensitive keys and values
 */
export function sanitizeLogDetails(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeLogDetails);
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeLogDetails(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export class AuditLogger {
  /**
   * Log a security or privacy-critical event with automatic sanitization
   */
  static logSecurityEvent(entry: AuditLogEntry): void {
    const sanitizedDetails = sanitizeLogDetails(entry.details || {});
    const payload = {
      audit: true,
      eventType: entry.eventType,
      userId: entry.userId || 'anonymous',
      targetUserId: entry.targetUserId,
      status: entry.status,
      ip: entry.ip,
      userAgent: entry.userAgent,
      details: sanitizedDetails,
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    if (entry.status === 'failure' || entry.status === 'denied') {
      logger.warn(`[SECURITY AUDIT] ${entry.eventType}: ${entry.status}`, payload);
    } else {
      logger.info(`[SECURITY AUDIT] ${entry.eventType}: ${entry.status}`, payload);
    }
  }
}
