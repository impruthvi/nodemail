import { SmtpProvider } from '../../src/providers/SmtpProvider';
import { SmtpConfig, MailOptions } from '../../src/types';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('SmtpProvider', () => {
  let provider: SmtpProvider;
  let mockTransporter: {
    sendMail: jest.Mock;
    verify: jest.Mock;
  };

  const mockConfig: SmtpConfig = {
    driver: 'smtp',
    host: 'smtp.test.com',
    port: 587,
    secure: false,
    auth: {
      user: 'test@test.com',
      pass: 'password123',
    },
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
    };

    // Mock createTransport to return our mock transporter
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Create provider instance
    provider = new SmtpProvider(mockConfig);
  });

  describe('constructor', () => {
    it('should create transporter with correct config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: mockConfig.host,
        port: mockConfig.port,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'password123',
        },
      });
    });

    it('should handle config without auth', () => {
      const configNoAuth: SmtpConfig = {
        driver: 'smtp',
        host: 'smtp.test.com',
        port: 587,
      };

      new SmtpProvider(configNoAuth);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: undefined,
        })
      );
    });
  });

  describe('send', () => {
    it('should send email successfully with basic options', async () => {
      const mailOptions: MailOptions = {
        to: 'recipient@test.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: '<test-message-id>',
        response: '250 OK',
      });

      const result = await provider.send(mailOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('<test-message-id>');
      expect(result.response).toBe('250 OK');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple recipients (array)', async () => {
      const mailOptions: MailOptions = {
        to: ['user1@test.com', 'user2@test.com'],
        subject: 'Test',
        html: '<p>Test</p>',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-id',
        response: 'OK',
      });

      await provider.send(mailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user1@test.com, user2@test.com',
        })
      );
    });

    it('should format email addresses with names', async () => {
      const mailOptions: MailOptions = {
        to: { address: 'user@test.com', name: 'John Doe' },
        from: { address: 'sender@test.com', name: 'Jane Smith' },
        subject: 'Test',
        html: '<p>Test</p>',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-id',
        response: 'OK',
      });

      await provider.send(mailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '"John Doe" <user@test.com>',
          from: '"Jane Smith" <sender@test.com>',
        })
      );
    });

    it('should handle CC and BCC recipients', async () => {
      const mailOptions: MailOptions = {
        to: 'recipient@test.com',
        cc: ['cc1@test.com', 'cc2@test.com'],
        bcc: 'bcc@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-id',
        response: 'OK',
      });

      await provider.send(mailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: 'cc1@test.com, cc2@test.com',
          bcc: 'bcc@test.com',
        })
      );
    });

    it('should handle attachments', async () => {
      const mailOptions: MailOptions = {
        to: 'recipient@test.com',
        subject: 'Test with attachment',
        html: '<p>Test</p>',
        attachments: [
          {
            filename: 'test.txt',
            content: Buffer.from('test content'),
            contentType: 'text/plain',
          },
        ],
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-id',
        response: 'OK',
      });

      await provider.send(mailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              filename: 'test.txt',
              content: expect.any(Buffer),
              contentType: 'text/plain',
              path: undefined,
            },
          ],
        })
      );
    });

    it('should handle reply-to and headers', async () => {
      const mailOptions: MailOptions = {
        to: 'recipient@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
        replyTo: 'reply@test.com',
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-id',
        response: 'OK',
      });

      await provider.send(mailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'reply@test.com',
          headers: {
            'X-Custom-Header': 'custom-value',
          },
        })
      );
    });

    it('should handle send errors', async () => {
      const mailOptions: MailOptions = {
        to: 'recipient@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP connection failed'));

      const result = await provider.send(mailOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP connection failed');
      expect(result.messageId).toBeUndefined();
    });

    it('should handle unknown errors', async () => {
      const mailOptions: MailOptions = {
        to: 'recipient@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      mockTransporter.sendMail.mockRejectedValue('Unknown error');

      const result = await provider.send(mailOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('verify', () => {
    it('should return true when verification succeeds', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await provider.verify();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalledTimes(1);
    });

    it('should return false when verification fails', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      // Mock console.error to avoid test output pollution
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await provider.verify();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
