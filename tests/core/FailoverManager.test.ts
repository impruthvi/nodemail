import { FailoverManager } from '../../src/core/FailoverManager';
import type { MailOptions, MailProvider, MailResponse, FailoverConfig, FailoverEvent } from '../../src/types';

describe('FailoverManager', () => {
  let failoverManager: FailoverManager;
  let mailOptions: MailOptions;

  beforeEach(() => {
    failoverManager = new FailoverManager();
    mailOptions = {
      to: 'user@test.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    };
  });

  function createProvider(response: MailResponse): MailProvider {
    return { send: jest.fn().mockResolvedValue(response) };
  }

  function createFailingProvider(error: string): MailProvider {
    return { send: jest.fn().mockResolvedValue({ success: false, error }) };
  }

  function createThrowingProvider(error: string): MailProvider {
    return { send: jest.fn().mockRejectedValue(new Error(error)) };
  }

  describe('primary succeeds (no failover)', () => {
    it('should return success with provider metadata', async () => {
      const primary = createProvider({ success: true, messageId: 'msg-1' });
      const config: FailoverConfig = { chain: ['ses', 'smtp'] };

      const result = await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        () => { throw new Error('should not be called'); },
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('sendgrid');
      expect(result.failoverUsed).toBe(false);
      expect(result.failoverAttempts).toHaveLength(1);
      expect(result.failoverAttempts![0].mailer).toBe('sendgrid');
      expect(result.failoverAttempts![0].success).toBe(true);
    });
  });

  describe('primary fails, secondary succeeds (failover triggered)', () => {
    it('should fall back to the first working chain provider', async () => {
      const primary = createFailingProvider('SendGrid is down');
      const sesProvider = createProvider({ success: true, messageId: 'ses-1' });
      const config: FailoverConfig = { chain: ['ses', 'smtp'] };

      const result = await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        (name) => {
          if (name === 'ses') return sesProvider;
          throw new Error('unknown');
        },
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('ses');
      expect(result.failoverUsed).toBe(true);
      expect(result.failoverAttempts).toHaveLength(2);
      expect(result.failoverAttempts![0]).toMatchObject({ mailer: 'sendgrid', success: false });
      expect(result.failoverAttempts![1]).toMatchObject({ mailer: 'ses', success: true });
    });
  });

  describe('all providers fail (full chain exhausted)', () => {
    it('should return failure with all attempts logged', async () => {
      const primary = createFailingProvider('Primary down');
      const ses = createFailingProvider('SES down');
      const smtp = createFailingProvider('SMTP down');
      const config: FailoverConfig = { chain: ['ses', 'smtp'] };

      const result = await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        (name) => {
          if (name === 'ses') return ses;
          if (name === 'smtp') return smtp;
          throw new Error('unknown');
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('All providers failed');
      expect(result.failoverUsed).toBe(true);
      expect(result.failoverAttempts).toHaveLength(3);
      expect(result.failoverAttempts!.every(a => !a.success)).toBe(true);
    });
  });

  describe('maxRetriesPerProvider > 1', () => {
    it('should retry the primary before failover', async () => {
      let callCount = 0;
      const mockSend = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ success: false, error: 'Temporary error' });
        }
        return Promise.resolve({ success: true, messageId: 'retry-ok' });
      });
      const primary: MailProvider = { send: mockSend };

      const config: FailoverConfig = { chain: ['ses'], maxRetriesPerProvider: 3 };

      const result = await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        () => { throw new Error('should not be called'); },
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('sendgrid');
      expect(result.failoverUsed).toBe(false);
      expect(result.failoverAttempts).toHaveLength(3);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should retry chain providers too', async () => {
      const primary = createFailingProvider('Primary down');
      let sesCallCount = 0;
      const ses: MailProvider = {
        send: jest.fn().mockImplementation(() => {
          sesCallCount++;
          if (sesCallCount < 2) {
            return Promise.resolve({ success: false, error: 'SES temp error' });
          }
          return Promise.resolve({ success: true, messageId: 'ses-retry-ok' });
        }),
      };

      const config: FailoverConfig = { chain: ['ses'], maxRetriesPerProvider: 2 };

      const result = await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        (name) => {
          if (name === 'ses') return ses;
          throw new Error('unknown');
        },
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('ses');
      expect(result.failoverUsed).toBe(true);
      // 2 primary retries + 2 ses retries
      expect(result.failoverAttempts).toHaveLength(4);
    });
  });

  describe('onFailover callback', () => {
    it('should receive correct event data', async () => {
      const primary = createFailingProvider('SendGrid error');
      const ses = createProvider({ success: true, messageId: 'ses-1' });
      const events: FailoverEvent[] = [];

      const config: FailoverConfig = {
        chain: ['ses'],
        onFailover: (event) => events.push(event),
      };

      await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        (name) => {
          if (name === 'ses') return ses;
          throw new Error('unknown');
        },
      );

      expect(events).toHaveLength(1);
      expect(events[0].failedMailer).toBe('sendgrid');
      expect(events[0].error).toBe('SendGrid error');
      expect(events[0].nextMailer).toBe('ses');
      expect(events[0].attemptIndex).toBe(1);
      expect(events[0].timestamp).toBeDefined();
    });

    it('should not abort failover when callback throws', async () => {
      const primary = createFailingProvider('SendGrid error');
      const ses = createProvider({ success: true, messageId: 'ses-1' });

      const config: FailoverConfig = {
        chain: ['ses'],
        onFailover: () => {
          throw new Error('Logging service crashed');
        },
      };

      const result = await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        (name) => {
          if (name === 'ses') return ses;
          throw new Error('unknown');
        },
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('ses');
      expect(result.failoverUsed).toBe(true);
    });

    it('should fire for each failover transition', async () => {
      const primary = createFailingProvider('Primary down');
      const ses = createFailingProvider('SES down');
      const smtp = createProvider({ success: true, messageId: 'smtp-1' });
      const events: FailoverEvent[] = [];

      const config: FailoverConfig = {
        chain: ['ses', 'smtp'],
        onFailover: (event) => events.push(event),
      };

      await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        (name) => {
          if (name === 'ses') return ses;
          if (name === 'smtp') return smtp;
          throw new Error('unknown');
        },
      );

      expect(events).toHaveLength(2);
      expect(events[0].failedMailer).toBe('sendgrid');
      expect(events[0].nextMailer).toBe('ses');
      expect(events[1].failedMailer).toBe('ses');
      expect(events[1].nextMailer).toBe('smtp');
    });
  });

  describe('chain entry matching primary is skipped', () => {
    it('should skip chain entries that match the primary name', async () => {
      const primary = createFailingProvider('Primary down');
      const smtp = createProvider({ success: true, messageId: 'smtp-1' });

      const config: FailoverConfig = { chain: ['sendgrid', 'smtp'] };

      const result = await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        (name) => {
          if (name === 'smtp') return smtp;
          throw new Error('should not resolve sendgrid again');
        },
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('smtp');
      // Only primary attempt + smtp attempt (sendgrid in chain skipped)
      expect(result.failoverAttempts).toHaveLength(2);
    });
  });

  describe('unresolvable provider in chain is skipped gracefully', () => {
    it('should skip providers that throw on resolution', async () => {
      const primary = createFailingProvider('Primary down');
      const smtp = createProvider({ success: true, messageId: 'smtp-1' });

      const config: FailoverConfig = { chain: ['nonexistent', 'smtp'] };

      const result = await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        (name) => {
          if (name === 'nonexistent') throw new Error("Mailer 'nonexistent' is not configured");
          if (name === 'smtp') return smtp;
          throw new Error('unknown');
        },
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('smtp');
    });
  });

  describe('response metadata', () => {
    it('should include provider, failoverUsed, and failoverAttempts on success', async () => {
      const primary = createProvider({ success: true, messageId: 'msg-1' });
      const config: FailoverConfig = { chain: ['ses'] };

      const result = await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        () => { throw new Error('unused'); },
      );

      expect(result).toHaveProperty('provider', 'sendgrid');
      expect(result).toHaveProperty('failoverUsed', false);
      expect(result).toHaveProperty('failoverAttempts');
      expect(Array.isArray(result.failoverAttempts)).toBe(true);
    });

    it('should include durationMs in each attempt', async () => {
      const primary = createFailingProvider('Down');
      const ses = createProvider({ success: true, messageId: 'ses-1' });
      const config: FailoverConfig = { chain: ['ses'] };

      const result = await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        (name) => {
          if (name === 'ses') return ses;
          throw new Error('unknown');
        },
      );

      for (const attempt of result.failoverAttempts!) {
        expect(typeof attempt.durationMs).toBe('number');
        expect(attempt.durationMs).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('provider throwing exceptions', () => {
    it('should catch thrown errors and treat as failure', async () => {
      const primary = createThrowingProvider('Network timeout');
      const ses = createProvider({ success: true, messageId: 'ses-1' });
      const config: FailoverConfig = { chain: ['ses'] };

      const result = await failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        (name) => {
          if (name === 'ses') return ses;
          throw new Error('unknown');
        },
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('ses');
      expect(result.failoverAttempts![0].error).toBe('Network timeout');
    });
  });

  describe('delays', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should respect retryDelay between retries', async () => {
      let callCount = 0;
      const mockSend = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) return Promise.resolve({ success: false, error: 'fail' });
        return Promise.resolve({ success: true, messageId: 'ok' });
      });
      const primary: MailProvider = { send: mockSend };

      const config: FailoverConfig = {
        chain: ['ses'],
        maxRetriesPerProvider: 2,
        retryDelay: 100,
      };

      const promise = failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        () => { throw new Error('unused'); },
      );

      // Advance past the retry delay
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should respect failoverDelay between providers', async () => {
      const primary = createFailingProvider('Down');
      const ses = createProvider({ success: true, messageId: 'ses-1' });

      const config: FailoverConfig = {
        chain: ['ses'],
        failoverDelay: 200,
      };

      const promise = failoverManager.sendWithFailover(
        mailOptions, 'sendgrid', primary, config,
        (name) => {
          if (name === 'ses') return ses;
          throw new Error('unknown');
        },
      );

      // Advance past the failover delay
      await jest.advanceTimersByTimeAsync(200);

      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.provider).toBe('ses');
    });
  });
});
