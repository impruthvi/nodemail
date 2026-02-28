/**
 * Sliding window rate limiter for per-mailer email throttling.
 * Tracks send timestamps in memory and prunes expired entries.
 */

import type { RateLimitConfig } from '../types';

export class RateLimiter {
  private windows: Map<string, number[]> = new Map();

  /**
   * Check if a send is allowed for the given mailer.
   * If allowed, records the timestamp and returns { allowed: true }.
   * If not, returns { allowed: false, retryAfterMs }.
   */
  check(
    mailerName: string,
    config: RateLimitConfig,
  ): { allowed: true } | { allowed: false; retryAfterMs: number } {
    const now = Date.now();
    const timestamps = this.windows.get(mailerName) || [];

    // Prune timestamps outside the current window
    const windowStart = now - config.windowMs;
    const active = timestamps.filter((t) => t > windowStart);

    if (active.length >= config.maxPerWindow) {
      const retryAfterMs = (active[0] as number) - windowStart;
      this.windows.set(mailerName, active);
      return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1) };
    }

    // Record this send
    active.push(now);
    this.windows.set(mailerName, active);
    return { allowed: true };
  }

  /** Reset all limiter state (useful for testing). */
  reset(): void {
    this.windows.clear();
  }
}
