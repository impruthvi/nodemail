import { MailgunProvider } from '../../src/providers/MailgunProvider';
import type { MailOptions } from '../../src/types';

// Mock mailgun.js and form-data modules
const mockCreate = jest.fn().mockResolvedValue({ id: 'test-message-id' });
const mockClient = jest.fn().mockReturnValue({
  messages: {
    create: mockCreate,
  },
});

jest.mock('mailgun.js', () => {
  return jest.fn().mockImplementation(() => ({
    client: mockClient,
  }));
}, { virtual: true });

jest.mock('form-data', () => jest.fn(), { virtual: true });

describe('MailgunProvider', () => {
  let provider: MailgunProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new MailgunProvider({
      apiKey: 'test-api-key',
      domain: 'test.mailgun.org',
    });
  });

  describe('constructor', () => {
    it('should throw error if API key is missing', () => {
      expect(() => {
        new MailgunProvider({
          apiKey: '',
          domain: 'test.mailgun.org',
        });
      }).toThrow('Mailgun API key is required');
    });

    it('should throw error if domain is missing', () => {
      expect(() => {
        new MailgunProvider({
          apiKey: 'test-key',
          domain: '',
        });
      }).toThrow('Mailgun domain is required');
    });

    it('should create provider with US region by default', () => {
      expect(() => {
        new MailgunProvider({
          apiKey: 'test-key',
          domain: 'test.mailgun.org',
        });
      }).not.toThrow();
    });

    it('should create provider with EU region', () => {
      expect(() => {
        new MailgunProvider({
          apiKey: 'test-key',
          domain: 'test.mailgun.org',
          region: 'eu',
        });
      }).not.toThrow();
    });
  });

  describe('send', () => {
    it('should send a basic email', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      const result = await provider.send(options);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockCreate).toHaveBeenCalledWith(
        'test.mailgun.org',
        expect.objectContaining({
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
        }),
      );
    });

    it('should send email with text content', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test plain text',
      };

      await provider.send(options);

      expect(mockCreate).toHaveBeenCalledWith(
        'test.mailgun.org',
        expect.objectContaining({
          text: 'Test plain text',
        }),
      );
    });

    it('should send email with CC recipients', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        cc: ['cc1@example.com', 'cc2@example.com'],
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      await provider.send(options);

      expect(mockCreate).toHaveBeenCalledWith(
        'test.mailgun.org',
        expect.objectContaining({
          cc: ['cc1@example.com', 'cc2@example.com'],
        }),
      );
    });

    it('should send email with BCC recipients', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        bcc: 'bcc@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      await provider.send(options);

      expect(mockCreate).toHaveBeenCalledWith(
        'test.mailgun.org',
        expect.objectContaining({
          bcc: 'bcc@example.com',
        }),
      );
    });

    it('should format MailAddress objects correctly', async () => {
      const options: MailOptions = {
        to: { address: 'recipient@example.com', name: 'John Doe' },
        from: { address: 'sender@example.com', name: 'Jane Smith' },
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      await provider.send(options);

      expect(mockCreate).toHaveBeenCalledWith(
        'test.mailgun.org',
        expect.objectContaining({
          from: 'Jane Smith <sender@example.com>',
          to: 'John Doe <recipient@example.com>',
        }),
      );
    });

    it('should handle reply-to header', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        replyTo: 'reply@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      await provider.send(options);

      expect(mockCreate).toHaveBeenCalledWith(
        'test.mailgun.org',
        expect.objectContaining({
          'h:Reply-To': 'reply@example.com',
        }),
      );
    });

    it('should handle custom headers', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        headers: {
          'X-Custom-Header': 'custom-value',
          'X-Another-Header': 'another-value',
        },
      };

      await provider.send(options);

      expect(mockCreate).toHaveBeenCalledWith(
        'test.mailgun.org',
        expect.objectContaining({
          'h:X-Custom-Header': 'custom-value',
          'h:X-Another-Header': 'another-value',
        }),
      );
    });

    it('should handle attachments', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        attachments: [
          {
            filename: 'test.txt',
            content: Buffer.from('test content'),
          },
        ],
      };

      await provider.send(options);

      expect(mockCreate).toHaveBeenCalledWith(
        'test.mailgun.org',
        expect.objectContaining({
          attachment: expect.arrayContaining([
            expect.objectContaining({
              filename: 'test.txt',
              data: expect.any(Buffer),
            }),
          ]),
        }),
      );
    });

    it('should handle multiple recipients as array', async () => {
      const options: MailOptions = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      await provider.send(options);

      expect(mockCreate).toHaveBeenCalledWith(
        'test.mailgun.org',
        expect.objectContaining({
          to: ['user1@example.com', 'user2@example.com'],
        }),
      );
    });

    it('should return error response on failure', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      const options: MailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      const result = await provider.send(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Mailgun send failed');
    });

    it('should handle both HTML and text content', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test plain text',
      };

      await provider.send(options);

      expect(mockCreate).toHaveBeenCalledWith(
        'test.mailgun.org',
        expect.objectContaining({
          html: '<p>Test HTML</p>',
          text: 'Test plain text',
        }),
      );
    });
  });
});
