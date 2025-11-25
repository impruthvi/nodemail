import { PostmarkProvider } from '../../src/providers/PostmarkProvider';
import type { MailOptions } from '../../src/types';

// Mock postmark module
const mockSendEmail = jest.fn().mockResolvedValue({ MessageID: 'test-postmark-id' });

jest.mock('postmark', () => ({
  ServerClient: jest.fn().mockImplementation(() => ({
    sendEmail: mockSendEmail,
  })),
}), { virtual: true });

describe('PostmarkProvider', () => {
  let provider: PostmarkProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new PostmarkProvider({
      serverToken: 'test-server-token',
    });
  });

  describe('constructor', () => {
    it('should throw error if server token is missing', () => {
      expect(() => {
        new PostmarkProvider({ serverToken: '' });
      }).toThrow('Postmark server token is required');
    });

    it('should create provider with valid server token', () => {
      expect(() => {
        new PostmarkProvider({ serverToken: 'test-token' });
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
      expect(result.messageId).toBe('test-postmark-id');
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          From: 'sender@example.com',
          To: 'recipient@example.com',
          Subject: 'Test Subject',
          HtmlBody: '<p>Test HTML</p>',
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

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          TextBody: 'Test plain text',
        }),
      );
    });

    it('should send email with both HTML and text', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test plain text',
      };

      await provider.send(options);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          HtmlBody: '<p>Test HTML</p>',
          TextBody: 'Test plain text',
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

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          Cc: 'cc1@example.com, cc2@example.com',
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

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          Bcc: 'bcc@example.com',
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

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          From: 'Jane Smith <sender@example.com>',
          To: 'John Doe <recipient@example.com>',
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

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          ReplyTo: 'reply@example.com',
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

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          Headers: [
            { Name: 'X-Custom-Header', Value: 'custom-value' },
            { Name: 'X-Another-Header', Value: 'another-value' },
          ],
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
            content: 'test content',
            contentType: 'text/plain',
          },
        ],
      };

      await provider.send(options);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          Attachments: expect.arrayContaining([
            expect.objectContaining({
              Name: 'test.txt',
              Content: 'test content',
              ContentType: 'text/plain',
            }),
          ]),
        }),
      );
    });

    it('should use default content type for attachments without one', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        attachments: [
          {
            filename: 'test.bin',
            content: 'binary data',
          },
        ],
      };

      await provider.send(options);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          Attachments: expect.arrayContaining([
            expect.objectContaining({
              ContentType: 'application/octet-stream',
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

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          To: 'user1@example.com, user2@example.com',
        }),
      );
    });

    it('should return error response on failure', async () => {
      mockSendEmail.mockRejectedValueOnce(new Error('API Error'));

      const options: MailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      const result = await provider.send(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Postmark send failed');
    });

    it('should handle MailAddress with only address (no name)', async () => {
      const options: MailOptions = {
        to: { address: 'recipient@example.com' },
        from: { address: 'sender@example.com' },
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      await provider.send(options);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          From: 'sender@example.com',
          To: 'recipient@example.com',
        }),
      );
    });

    it('should handle attachment with CID', async () => {
      const options: MailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        attachments: [
          {
            filename: 'image.png',
            content: 'image data',
            cid: 'unique-image-cid',
          },
        ],
      };

      await provider.send(options);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          Attachments: expect.arrayContaining([
            expect.objectContaining({
              ContentID: 'unique-image-cid',
            }),
          ]),
        }),
      );
    });
  });
});
