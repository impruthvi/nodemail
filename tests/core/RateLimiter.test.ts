import { RateLimiter } from '../../src/core/RateLimiter';
import type { RateLimitConfig } from '../../src/types';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  const config: RateLimitConfig = {
    maxPerWindow: 3,
    windowMs: 1000,
  };

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it('allows sends within the limit', () => {
    expect(limiter.check('smtp', config)).toEqual({ allowed: true });
    expect(limiter.check('smtp', config)).toEqual({ allowed: true });
    expect(limiter.check('smtp', config)).toEqual({ allowed: true });
  });

  it('blocks sends when limit is exceeded', () => {
    limiter.check('smtp', config);
    limiter.check('smtp', config);
    limiter.check('smtp', config);

    const result = limiter.check('smtp', config);
    expect(result.allowed).toBe(false);
  });

  it('returns retryAfterMs when blocked', () => {
    limiter.check('smtp', config);
    limiter.check('smtp', config);
    limiter.check('smtp', config);

    const result = limiter.check('smtp', config);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThanOrEqual(1);
      expect(result.retryAfterMs).toBeLessThanOrEqual(config.windowMs);
    }
  });

  it('allows sends after the window slides', async () => {
    const shortConfig: RateLimitConfig = { maxPerWindow: 2, windowMs: 50 };

    limiter.check('smtp', shortConfig);
    limiter.check('smtp', shortConfig);

    // Should be blocked
    expect(limiter.check('smtp', shortConfig).allowed).toBe(false);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60));

    // Should be allowed again
    expect(limiter.check('smtp', shortConfig).allowed).toBe(true);
  });

  it('tracks mailers independently', () => {
    limiter.check('smtp', config);
    limiter.check('smtp', config);
    limiter.check('smtp', config);

    // smtp is exhausted
    expect(limiter.check('smtp', config).allowed).toBe(false);

    // sendgrid should still be allowed
    expect(limiter.check('sendgrid', config).allowed).toBe(true);
  });

  it('reset() clears all state', () => {
    limiter.check('smtp', config);
    limiter.check('smtp', config);
    limiter.check('smtp', config);
    expect(limiter.check('smtp', config).allowed).toBe(false);

    limiter.reset();

    expect(limiter.check('smtp', config).allowed).toBe(true);
  });

  it('retryAfterMs is at least 1ms', () => {
    // Fill window instantly
    for (let i = 0; i < config.maxPerWindow; i++) {
      limiter.check('smtp', config);
    }
    const result = limiter.check('smtp', config);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThanOrEqual(1);
    }
  });

  it('handles single-send limit', () => {
    const singleConfig: RateLimitConfig = { maxPerWindow: 1, windowMs: 1000 };
    expect(limiter.check('smtp', singleConfig).allowed).toBe(true);
    expect(limiter.check('smtp', singleConfig).allowed).toBe(false);
  });
});
