/**
 * SportX Rate Limiting Middleware
 * Protects sensitive endpoints (auth, account changes, media upload, completion) from abuse and brute-force.
 * Emits audit logs upon limit violation and returns standard 429 Too Many Requests with Retry-After.
 */
import { Request, Response, NextFunction } from 'express';
import { AuditLogger } from '../services/auditLogger';
import { AuthenticatedRequest } from '../auth';

export interface RateLimitOptions {
  windowMs: number; // Duration of window in milliseconds
  max: number;      // Maximum allowed requests in window
  message?: string; // Custom error message
  keyGenerator?: (req: Request) => string;
}

interface RateLimitRecord {
  timestamps: number[];
}

// Global in-memory storage for rate limits
const rateLimitStore: Map<string, RateLimitRecord> = new Map();

/**
 * Clean expired timestamps from record
 */
function purgeExpired(record: RateLimitRecord, now: number, windowMs: number): void {
  const threshold = now - windowMs;
  record.timestamps = record.timestamps.filter((t) => t > threshold);
}

/**
 * Clear the rate limit store (useful for automated testing)
 */
export function resetRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Factory for Express rate limiting middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests. Please try again later.',
    keyGenerator = (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown_ip';
      return uid ? `user_${uid}` : `ip_${ip}`;
    },
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // In automated testing, skip unless explicitly testing rate limits
    if (process.env.NODE_ENV === 'test' && (req.headers['x-test-bypass-ratelimit'] === 'true')) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { timestamps: [] });
    }

    const record = rateLimitStore.get(key)!;
    purgeExpired(record, now, windowMs);

    const currentCount = record.timestamps.length;
    const remaining = Math.max(0, max - currentCount);
    const resetTime = record.timestamps.length > 0
      ? Math.ceil((record.timestamps[0] + windowMs) / 1000)
      : Math.ceil((now + windowMs) / 1000);

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());

    if (currentCount >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.timestamps[0] + windowMs - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds.toString());

      AuditLogger.logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        userId: (req as AuthenticatedRequest).user?.uid,
        ip: req.ip || String(req.headers['x-forwarded-for'] || ''),
        status: 'denied',
        details: {
          key,
          currentCount,
          max,
          path: req.path,
          retryAfterSeconds,
        },
      });

      res.status(429).json({
        success: false,
        error: message,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    record.timestamps.push(now);
    next();
  };
}

// ── Preconfigured Rate Limiters ───────────────────────────────────────────────

// Auth routes (login, signup, password reset): 10 requests per minute
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please wait a minute before trying again.',
});

// Security-critical routes (password change, email change, account deletion): 5 requests per 15 minutes
export const securityRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Security action rate limit exceeded. Please wait 15 minutes before trying again.',
});

// Media upload / delete (profile avatars): 15 requests per 10 minutes
export const mediaRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: 'Too many media upload or modification requests. Please slow down.',
});

// Workout session completion: 30 requests per minute
export const workoutCompletionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many workout completions submitted in a short period.',
});
