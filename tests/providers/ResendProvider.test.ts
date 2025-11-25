import { ResendProvider } from '../../src/providers/ResendProvider';
import type { MailOptions } from '../../src/types';

// Mock resend module
const mockSend = jest.fn().mockResolvedValue({ data: { id: 'test-resend-id' } });

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}), { virtual: true });

describe('ResendProvider', () => {
  let provider: ResendProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new ResendProvider({
      apiKey: 'test-api-key',
    });
  });

  describe('constructor', () => {
    it('should throw error if API key is missing', () => {
      expect(() => {
        new ResendProvider({ apiKey: '' });
      }).toThrow('Resend API key is required');
    });

    it('should create provider with valid API key', () => {
      expect(() => {
        new ResendProvider({ apiKey: 'test-key' });
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
      expect(result.messageId).toBe('test-resend-id');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'sender@example.com',
          to: ['recipient@example.com'],
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

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Test plain text',
        }),
      );
    });

    it('should prefer HTML over text', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test plain text',
      };

      await provider.send(options);

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toBe('<p>Test HTML</p>');
      expect(call.text).toBeUndefined();
    });

    it('should send email with CC recipients', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        cc: ['cc1@example.com', 'cc2@example.com'],
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      await provider.send(options);

      expect(mockSend).toHaveBeenCalledWith(
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

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          bcc: ['bcc@example.com'],
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

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Jane Smith <sender@example.com>',
          to: ['John Doe <recipient@example.com>'],
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

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          reply_to: 'reply@example.com',
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
        },
      };

      await provider.send(options);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'X-Custom-Header': 'custom-value',
          },
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

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'test.txt',
              content: expect.any(Buffer),
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

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['user1@example.com', 'user2@example.com'],
        }),
      );
    });

    it('should return error response on failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('API Error'));

      const options: MailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      const result = await provider.send(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Resend send failed');
    });

    it('should handle single recipient as string', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      await provider.send(options);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['recipient@example.com'],
        }),
      );
    });

    it('should handle MailAddress with only address (no name)', async () => {
      const options: MailOptions = {
        to: { address: 'recipient@example.com' },
        from: { address: 'sender@example.com' },
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      await provider.send(options);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'sender@example.com',
          to: ['recipient@example.com'],
        }),
      );
    });
  });
});
