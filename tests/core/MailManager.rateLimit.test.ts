import { MailManager } from '../../src/core/MailManager';
import type { MailConfig, MailOptions, MailResponse, RateLimitEvent } from '../../src/types';

// Mock the providers
jest.mock('../../src/providers/SmtpProvider');
jest.mock('../../src/providers/SendGridProvider');

describe('MailManager Rate Limiting', () => {
  let mockSend: jest.Mock;

  const baseOptions: MailOptions = {
    to: 'user@example.com',
    subject: 'Test',
    html: '<p>Hello</p>',
  };

  const successResponse: MailResponse = {
    success: true,
    messageId: 'test-id-123',
    accepted: ['user@example.com'],
    rejected: [],
  };

  function createManager(config: MailConfig): MailManager {
    const manager = new MailManager(config);
    const { SmtpProvider } = require('../../src/providers/SmtpProvider');
    mockSend = jest.fn().mockResolvedValue(successResponse);
    SmtpProvider.prototype.send = mockSend;

    const { SendGridProvider } = require('../../src/providers/SendGridProvider');
    SendGridProvider.prototype.send = jest.fn().mockResolvedValue(successResponse);

    return manager;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends succeed within rate limit', async () => {
    const manager = createManager({
      default: 'smtp',
      from: { address: 'noreply@test.com', name: 'Test' },
      mailers: {
        smtp: { driver: 'smtp', host: 'localhost', port: 587 },
      },
      rateLimit: { maxPerWindow: 3, windowMs: 1000 },
    });

    const r1 = await manager.send(baseOptions);
    const r2 = await manager.send(baseOptions);
    const r3 = await manager.send(baseOptions);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('returns { success: false } when rate limit exceeded', async () => {
    const manager = createManager({
      default: 'smtp',
      from: { address: 'noreply@test.com', name: 'Test' },
      mailers: {
        smtp: { driver: 'smtp', host: 'localhost', port: 587 },
      },
      rateLimit: { maxPerWindow: 2, windowMs: 1000 },
    });

    await manager.send(baseOptions);
    await manager.send(baseOptions);
    const result = await manager.send(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Rate limit exceeded for mailer "smtp"/);
    expect(result.error).toMatch(/Try again in \d+ms/);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('per-mailer config overrides global config', async () => {
    const manager = createManager({
      default: 'smtp',
      from: { address: 'noreply@test.com', name: 'Test' },
      mailers: {
        smtp: {
          driver: 'smtp',
          host: 'localhost',
          port: 587,
          rateLimit: { maxPerWindow: 1, windowMs: 1000 },
        },
      },
      rateLimit: { maxPerWindow: 100, windowMs: 1000 },
    });

    const r1 = await manager.send(baseOptions);
    const r2 = await manager.send(baseOptions);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(false);
    expect(r2.error).toMatch(/Rate limit exceeded/);
  });

  it('onRateLimited callback fires when limit exceeded', async () => {
    const onRateLimited = jest.fn();
    const manager = createManager({
      default: 'smtp',
      from: { address: 'noreply@test.com', name: 'Test' },
      mailers: {
        smtp: { driver: 'smtp', host: 'localhost', port: 587 },
      },
      rateLimit: { maxPerWindow: 1, windowMs: 1000, onRateLimited },
    });

    await manager.send(baseOptions);
    await manager.send(baseOptions);

    expect(onRateLimited).toHaveBeenCalledTimes(1);
    const event: RateLimitEvent = onRateLimited.mock.calls[0][0];
    expect(event.mailer).toBe('smtp');
    expect(event.retryAfterMs).toBeGreaterThanOrEqual(1);
    expect(event.options).toBeDefined();
    expect(event.timestamp).toBeDefined();
  });

  it('callback errors do not break the flow', async () => {
    const onRateLimited = jest.fn().mockImplementation(() => {
      throw new Error('callback boom');
    });
    const manager = createManager({
      default: 'smtp',
      from: { address: 'noreply@test.com', name: 'Test' },
      mailers: {
        smtp: { driver: 'smtp', host: 'localhost', port: 587 },
      },
      rateLimit: { maxPerWindow: 1, windowMs: 1000, onRateLimited },
    });

    await manager.send(baseOptions);
    const result = await manager.send(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Rate limit exceeded/);
    expect(onRateLimited).toHaveBeenCalled();
  });

  it('rate-limited sends do NOT fire sending/sent/failed events', async () => {
    const manager = createManager({
      default: 'smtp',
      from: { address: 'noreply@test.com', name: 'Test' },
      mailers: {
        smtp: { driver: 'smtp', host: 'localhost', port: 587 },
      },
      rateLimit: { maxPerWindow: 1, windowMs: 1000 },
    });

    const events: string[] = [];
    manager.onSending(() => { events.push('sending'); });
    manager.onSent(() => { events.push('sent'); });
    manager.onFailed(() => { events.push('failed'); });

    await manager.send(baseOptions); // allowed — fires sending + sent
    await manager.send(baseOptions); // rate limited — should NOT fire any events

    expect(events).toEqual(['sending', 'sent']);
  });

  it('works normally when no rate limit is configured (regression)', async () => {
    const manager = createManager({
      default: 'smtp',
      from: { address: 'noreply@test.com', name: 'Test' },
      mailers: {
        smtp: { driver: 'smtp', host: 'localhost', port: 587 },
      },
    });

    // Send many — all should succeed
    for (let i = 0; i < 10; i++) {
      const result = await manager.send(baseOptions);
      expect(result.success).toBe(true);
    }
    expect(mockSend).toHaveBeenCalledTimes(10);
  });

  it('getRateLimiter() returns the rate limiter instance', () => {
    const manager = createManager({
      default: 'smtp',
      from: { address: 'noreply@test.com', name: 'Test' },
      mailers: {
        smtp: { driver: 'smtp', host: 'localhost', port: 587 },
      },
    });

    const limiter = manager.getRateLimiter();
    expect(limiter).toBeDefined();
    expect(typeof limiter.check).toBe('function');
    expect(typeof limiter.reset).toBe('function');
  });

  it('rate limit resets after window expires', async () => {
    const manager = createManager({
      default: 'smtp',
      from: { address: 'noreply@test.com', name: 'Test' },
      mailers: {
        smtp: { driver: 'smtp', host: 'localhost', port: 587 },
      },
      rateLimit: { maxPerWindow: 1, windowMs: 50 },
    });

    const r1 = await manager.send(baseOptions);
    expect(r1.success).toBe(true);

    const r2 = await manager.send(baseOptions);
    expect(r2.success).toBe(false);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60));

    const r3 = await manager.send(baseOptions);
    expect(r3.success).toBe(true);
  });
});
