import { MailManager } from '../../src/core/MailManager';
import { MailConfig } from '../../src/types';
import { SmtpProvider } from '../../src/providers/SmtpProvider';

// Mock the providers
jest.mock('../../src/providers/SmtpProvider');
jest.mock('../../src/providers/SendGridProvider');
jest.mock('../../src/providers/SesProvider');

describe('MailManager', () => {
  let mailManager: MailManager;
  let mockConfig: MailConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      default: 'smtp',
      from: {
        address: 'noreply@test.com',
        name: 'Test App',
      },
      mailers: {
        smtp: {
          driver: 'smtp',
          host: 'smtp.test.com',
          port: 587,
          auth: {
            user: 'test@test.com',
            pass: 'password',
          },
        },
        sendgrid: {
          driver: 'sendgrid',
          apiKey: 'test-api-key',
        },
        ses: {
          driver: 'ses',
          region: 'us-east-1',
        },
      },
    };

    mailManager = new MailManager(mockConfig);
  });

  describe('constructor', () => {
    it('should create instance with config', () => {
      expect(mailManager).toBeInstanceOf(MailManager);
      expect(mailManager.getDefaultMailer()).toBe('smtp');
    });
  });

  describe('to', () => {
    it('should return MessageBuilder with single recipient', () => {
      const builder = mailManager.to('user@test.com');

      expect(builder).toBeDefined();
      expect(builder.options.to).toBe('user@test.com');
    });

    it('should return MessageBuilder with multiple recipients', () => {
      const recipients = ['user1@test.com', 'user2@test.com'];
      const builder = mailManager.to(recipients);

      expect(builder.options.to).toEqual(recipients);
    });
  });

  describe('mailer', () => {
    it('should return new MailManager instance with specific mailer as default', () => {
      const sendgridManager = mailManager.mailer('sendgrid');

      expect(sendgridManager).toBeInstanceOf(MailManager);
      expect(sendgridManager.getDefaultMailer()).toBe('sendgrid');
    });

    it('should throw error for non-existent mailer', () => {
      expect(() => {
        mailManager.mailer('nonexistent');
      }).toThrow("Mailer 'nonexistent' is not configured");
    });
  });

  describe('send', () => {
    it('should create SMTP provider and send email', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-id',
      });

      (SmtpProvider as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const result = await mailManager.send({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(SmtpProvider).toHaveBeenCalledWith(mockConfig.mailers.smtp);
      expect(mockSend).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should cache provider instances', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-id',
      });

      (SmtpProvider as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      // Send two emails
      await mailManager.send({
        to: 'user1@test.com',
        subject: 'Test 1',
        html: '<p>Test 1</p>',
      });

      await mailManager.send({
        to: 'user2@test.com',
        subject: 'Test 2',
        html: '<p>Test 2</p>',
      });

      // Provider should only be created once (cached)
      expect(SmtpProvider).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should throw error for unconfigured mailer', async () => {
      const invalidConfig: MailConfig = {
        default: 'nonexistent',
        from: { address: 'test@test.com', name: 'Test' },
        mailers: {},
      };

      const invalidManager = new MailManager(invalidConfig);

      await expect(
        invalidManager.send({
          to: 'user@test.com',
          subject: 'Test',
          html: '<p>Test</p>',
        })
      ).rejects.toThrow("Mailer 'nonexistent' is not configured");
    });

    it('should throw error for unsupported driver', async () => {
      const unsupportedConfig: MailConfig = {
        default: 'custom',
        from: { address: 'test@test.com', name: 'Test' },
        mailers: {
          custom: {
            driver: 'unsupported' as 'smtp',
          },
        },
      };

      const unsupportedManager = new MailManager(unsupportedConfig);

      await expect(
        unsupportedManager.send({
          to: 'user@test.com',
          subject: 'Test',
          html: '<p>Test</p>',
        })
      ).rejects.toThrow('Unsupported mail driver: unsupported');
    });
  });

  describe('getDefaultMailer', () => {
    it('should return default mailer name', () => {
      expect(mailManager.getDefaultMailer()).toBe('smtp');
    });
  });

  describe('MessageBuilder', () => {
    it('should build email with fluent API', () => {
      const builder = mailManager
        .to('user@test.com')
        .subject('Test Subject')
        .html('<p>HTML content</p>')
        .text('Text content')
        .from('sender@test.com');

      expect(builder.options).toEqual({
        to: 'user@test.com',
        subject: 'Test Subject',
        html: '<p>HTML content</p>',
        text: 'Text content',
        from: 'sender@test.com',
      });
    });

    it('should throw error when sending without subject', async () => {
      const builder = mailManager.to('user@test.com').html('<p>Test</p>');

      await expect(builder.send()).rejects.toThrow('Email subject is required');
    });

    it('should send email through MailManager', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-id',
      });

      (SmtpProvider as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const result = await mailManager
        .to('user@test.com')
        .subject('Test')
        .html('<p>Test</p>')
        .send();

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
    });

    it('should set template with fluent API', () => {
      const builder = mailManager
        .to('user@test.com')
        .subject('Test')
        .template('welcome');

      expect(builder.options).toEqual({
        to: 'user@test.com',
        subject: 'Test',
        template: 'welcome',
      });
    });

    it('should set data with fluent API', () => {
      const builder = mailManager
        .to('user@test.com')
        .subject('Test')
        .template('welcome')
        .data({ name: 'John', email: 'john@example.com' });

      expect(builder.options).toEqual({
        to: 'user@test.com',
        subject: 'Test',
        template: 'welcome',
        data: { name: 'John', email: 'john@example.com' },
      });
    });

    it('should set cc with fluent API', () => {
      const builder = mailManager
        .to('user@test.com')
        .subject('Test')
        .cc('cc@example.com');

      expect(builder.options).toEqual({
        to: 'user@test.com',
        subject: 'Test',
        cc: 'cc@example.com',
      });
    });

    it('should set bcc with fluent API', () => {
      const builder = mailManager
        .to('user@test.com')
        .subject('Test')
        .bcc(['bcc1@example.com', 'bcc2@example.com']);

      expect(builder.options).toEqual({
        to: 'user@test.com',
        subject: 'Test',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
      });
    });

    it('should set replyTo with fluent API', () => {
      const builder = mailManager
        .to('user@test.com')
        .subject('Test')
        .replyTo('reply@example.com');

      expect(builder.options).toEqual({
        to: 'user@test.com',
        subject: 'Test',
        replyTo: 'reply@example.com',
      });
    });

    it('should set attachments with fluent API', () => {
      const attachments = [
        { filename: 'test.pdf', content: Buffer.from('test'), contentType: 'application/pdf' },
      ];
      const builder = mailManager
        .to('user@test.com')
        .subject('Test')
        .attachments(attachments);

      expect(builder.options).toEqual({
        to: 'user@test.com',
        subject: 'Test',
        attachments,
      });
    });

    it('should set headers with fluent API', () => {
      const builder = mailManager
        .to('user@test.com')
        .subject('Test')
        .headers({ 'X-Custom-Header': 'value' });

      expect(builder.options).toEqual({
        to: 'user@test.com',
        subject: 'Test',
        headers: { 'X-Custom-Header': 'value' },
      });
    });
  });
});
