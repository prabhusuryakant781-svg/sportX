/**
 * SportX Production Safety & Persistence Policy Engine
 * Enforces production invariants:
 * 1. Zero demo/synthetic tokens in production
 * 2. Zero in-memory or mock data fallbacks in production
 * 3. Immediate, safe failure if Firebase services are unreachable in production
 */

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isFallbackAllowed(): boolean {
  return !isProduction();
}

/**
 * Throw error if an in-memory or demo fallback is attempted in production
 */
export function assertProductionSafe(operation: string): void {
  if (isProduction()) {
    throw new Error(
      `[Production Invariant Violation] Fallback/mock data is strictly prohibited in production for operation: ${operation}`
    );
  }
}

/**
 * Validate that a token is not a synthetic test or demo token when in production
 */
export function assertTokenSafe(token?: string): void {
  if (!token) return;

  if (isProduction()) {
    if (token.startsWith('test_user_') || token.startsWith('demo_') || token.includes('mock')) {
      throw new Error(
        '[Production Security Violation] Demo and synthetic test tokens are strictly prohibited in production'
      );
    }
  }
}
