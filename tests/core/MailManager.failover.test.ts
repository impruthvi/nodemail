import { MailManager } from '../../src/core/MailManager';
import type { MailConfig } from '../../src/types';
import { SmtpProvider } from '../../src/providers/SmtpProvider';
import { SendGridProvider } from '../../src/providers/SendGridProvider';
import { SesProvider } from '../../src/providers/SesProvider';

// Mock the providers
jest.mock('../../src/providers/SmtpProvider');
jest.mock('../../src/providers/SendGridProvider');
jest.mock('../../src/providers/SesProvider');

describe('MailManager failover integration', () => {
  const mailOptions = {
    to: 'user@test.com',
    subject: 'Test',
    html: '<p>Hello</p>',
  };

  function setupProviderMock(
    MockClass: jest.Mock,
    sendFn: jest.Mock,
  ) {
    MockClass.mockImplementation(() => ({ send: sendFn }));
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('backward compatibility (no failover config)', () => {
    it('should work exactly as before when no failover is configured', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'test@test.com', name: 'Test' },
        mailers: {
          smtp: { driver: 'smtp', host: 'localhost', port: 587 },
        },
      };

      const mockSend = jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' });
      setupProviderMock(SmtpProvider as jest.Mock, mockSend);

      const manager = new MailManager(config);
      const result = await manager.send(mailOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-1');
      // No failover metadata
      expect(result.provider).toBeUndefined();
      expect(result.failoverUsed).toBeUndefined();
    });
  });

  describe('global failover config', () => {
    it('should failover to chain provider when primary fails', async () => {
      const smtpSend = jest.fn().mockResolvedValue({ success: false, error: 'SMTP down' });
      const sesSend = jest.fn().mockResolvedValue({ success: true, messageId: 'ses-1' });

      setupProviderMock(SmtpProvider as jest.Mock, smtpSend);
      setupProviderMock(SesProvider as jest.Mock, sesSend);

      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'test@test.com', name: 'Test' },
        mailers: {
          smtp: { driver: 'smtp', host: 'localhost', port: 587 },
          ses: { driver: 'ses', region: 'us-east-1' },
        },
        failover: {
          chain: ['ses'],
        },
      };

      const manager = new MailManager(config);
      const result = await manager.send(mailOptions);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('ses');
      expect(result.failoverUsed).toBe(true);
      expect(result.failoverAttempts).toHaveLength(2);
    });

    it('should not failover when primary succeeds', async () => {
      const smtpSend = jest.fn().mockResolvedValue({ success: true, messageId: 'smtp-1' });
      setupProviderMock(SmtpProvider as jest.Mock, smtpSend);

      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'test@test.com', name: 'Test' },
        mailers: {
          smtp: { driver: 'smtp', host: 'localhost', port: 587 },
          ses: { driver: 'ses', region: 'us-east-1' },
        },
        failover: {
          chain: ['ses'],
        },
      };

      const manager = new MailManager(config);
      const result = await manager.send(mailOptions);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('smtp');
      expect(result.failoverUsed).toBe(false);
    });
  });

  describe('per-mailer failover overrides global', () => {
    it('should use per-mailer failover config when set', async () => {
      const sendgridSend = jest.fn().mockResolvedValue({ success: false, error: 'SG down' });
      const smtpSend = jest.fn().mockResolvedValue({ success: true, messageId: 'smtp-1' });
      const sesSend = jest.fn().mockResolvedValue({ success: true, messageId: 'ses-1' });

      setupProviderMock(SendGridProvider as jest.Mock, sendgridSend);
      setupProviderMock(SmtpProvider as jest.Mock, smtpSend);
      setupProviderMock(SesProvider as jest.Mock, sesSend);

      const config: MailConfig = {
        default: 'sendgrid',
        from: { address: 'test@test.com', name: 'Test' },
        mailers: {
          sendgrid: {
            driver: 'sendgrid',
            apiKey: 'test-key',
            // Per-mailer override: only try smtp
            failover: { chain: ['smtp'] },
          },
          smtp: { driver: 'smtp', host: 'localhost', port: 587 },
          ses: { driver: 'ses', region: 'us-east-1' },
        },
        // Global config would use ses
        failover: {
          chain: ['ses'],
        },
      };

      const manager = new MailManager(config);
      const result = await manager.send(mailOptions);

      expect(result.success).toBe(true);
      // Should use smtp (per-mailer chain), not ses (global chain)
      expect(result.provider).toBe('smtp');
      expect(sesSend).not.toHaveBeenCalled();
    });
  });

  describe('empty chain = backward compatible', () => {
    it('should behave as if no failover when chain is empty', async () => {
      const smtpSend = jest.fn().mockResolvedValue({ success: false, error: 'SMTP down' });
      setupProviderMock(SmtpProvider as jest.Mock, smtpSend);

      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'test@test.com', name: 'Test' },
        mailers: {
          smtp: { driver: 'smtp', host: 'localhost', port: 587 },
        },
        failover: {
          chain: [],
        },
      };

      const manager = new MailManager(config);
      const result = await manager.send(mailOptions);

      // Behaves like no failover — returns raw provider result
      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP down');
      expect(result.provider).toBeUndefined();
    });
  });
});
