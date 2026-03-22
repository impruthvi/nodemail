/**
 * SendGrid provider tests
 *
 * Uses require.resolve to detect if @sendgrid/mail is installed:
 * - Installed (CI): jest.doMock WITHOUT virtual to override real module
 * - Not installed (local): jest.doMock WITH virtual to create mock module
 */

const mockSetApiKey = jest.fn();
const mockSend = jest.fn();

function mockSendGrid() {
  const factory = () => ({
    setApiKey: mockSetApiKey,
    send: mockSend,
  });
  try {
    require.resolve('@sendgrid/mail');
    jest.doMock('@sendgrid/mail', factory);
  } catch {
    jest.doMock('@sendgrid/mail', factory, { virtual: true });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SendGridProvider: any;

const config = {
  driver: 'sendgrid' as const,
  apiKey: 'SG.test-api-key',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  mockSendGrid();
  SendGridProvider = require('../../src/providers/SendGridProvider').SendGridProvider;
});

describe('SendGridProvider', () => {
  describe('constructor', () => {
    it('sets the API key on the SendGrid client', () => {
      new SendGridProvider(config);
      expect(mockSetApiKey).toHaveBeenCalledWith('SG.test-api-key');
    });
  });

  describe('send', () => {
    it('sends a basic email successfully', async () => {
      mockSend.mockResolvedValue([
        { statusCode: 202, statusMessage: 'Accepted', headers: { 'x-message-id': 'sg-msg-123' } },
      ]);
      const provider = new SendGridProvider(config);

      const result = await provider.send({
        to: 'user@example.com',
        from: 'sender@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        text: 'Hi',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('sg-msg-123');
      expect(result.response).toBe('202 Accepted');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Hello',
          html: '<p>Hi</p>',
          text: 'Hi',
        })
      );
    });

    it('formats MailAddress objects', async () => {
      mockSend.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'id' } },
      ]);
      const provider = new SendGridProvider(config);

      await provider.send({
        to: { address: 'user@example.com', name: 'John' },
        from: { address: 'sender@example.com', name: 'App' },
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'John <user@example.com>',
          from: 'App <sender@example.com>',
        })
      );
    });

    it('formats multiple recipients as array', async () => {
      mockSend.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'id' } },
      ]);
      const provider = new SendGridProvider(config);

      await provider.send({
        to: ['a@example.com', 'b@example.com'],
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['a@example.com', 'b@example.com'],
        })
      );
    });

    it('passes cc and bcc', async () => {
      mockSend.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'id' } },
      ]);
      const provider = new SendGridProvider(config);

      await provider.send({
        to: 'user@example.com',
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: 'cc@example.com',
          bcc: ['bcc1@example.com', 'bcc2@example.com'],
        })
      );
    });

    it('passes replyTo and headers', async () => {
      mockSend.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'id' } },
      ]);
      const provider = new SendGridProvider(config);

      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        replyTo: 'reply@example.com',
        headers: { 'X-Custom': 'value' },
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'reply@example.com',
          headers: { 'X-Custom': 'value' },
        })
      );
    });

    it('maps attachments to base64 format', async () => {
      mockSend.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'id' } },
      ]);
      const provider = new SendGridProvider(config);

      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        attachments: [
          {
            filename: 'file.txt',
            content: Buffer.from('hello'),
            contentType: 'text/plain',
          },
        ],
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              filename: 'file.txt',
              content: Buffer.from('hello').toString('base64'),
              type: 'text/plain',
              disposition: 'attachment',
            },
          ],
        })
      );
    });

    it('omits optional fields when not provided', async () => {
      mockSend.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'id' } },
      ]);
      const provider = new SendGridProvider(config);

      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      const call = mockSend.mock.calls[0][0] as Record<string, unknown>;
      expect(call.from).toBeUndefined();
      expect(call.cc).toBeUndefined();
      expect(call.bcc).toBeUndefined();
      expect(call.replyTo).toBeUndefined();
      expect(call.attachments).toBeUndefined();
    });

    it('returns error on send failure', async () => {
      mockSend.mockRejectedValue(new Error('Unauthorized'));
      const provider = new SendGridProvider(config);

      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('handles non-Error thrown values', async () => {
      mockSend.mockRejectedValue('network failure');
      const provider = new SendGridProvider(config);

      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('handles missing statusMessage in response', async () => {
      mockSend.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'id' } },
      ]);
      const provider = new SendGridProvider(config);

      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.response).toBe('202 ');
    });
  });
});
