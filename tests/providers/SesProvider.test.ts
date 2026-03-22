/**
 * SES provider tests
 */

const mockSend = jest.fn();
const MockSESClient = jest.fn().mockImplementation(() => ({
  send: mockSend,
}));
const MockSendEmailCommand = jest.fn();

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: MockSESClient,
  SendEmailCommand: MockSendEmailCommand,
}), { virtual: true });

let SesProvider: typeof import('../../src/providers/SesProvider').SesProvider;

beforeAll(() => {
  jest.resetModules();
  // Re-register the mock after resetModules
  jest.doMock('@aws-sdk/client-ses', () => ({
    SESClient: MockSESClient,
    SendEmailCommand: MockSendEmailCommand,
  }), { virtual: true });
   
  SesProvider = require('../../src/providers/SesProvider').SesProvider;
});

const config = {
  driver: 'ses' as const,
  region: 'us-east-1',
};

beforeEach(() => jest.clearAllMocks());

describe('SesProvider', () => {
  describe('constructor', () => {
    it('creates SES client with region', () => {
      new SesProvider(config);
      expect(MockSESClient).toHaveBeenCalledWith({ region: 'us-east-1' });
    });

    it('passes explicit credentials when provided', () => {
      new SesProvider({
        driver: 'ses',
        region: 'eu-west-1',
        accessKeyId: 'AKIA123',
        secretAccessKey: 'secret456',
      });

      expect(MockSESClient).toHaveBeenCalledWith({
        region: 'eu-west-1',
        credentials: {
          accessKeyId: 'AKIA123',
          secretAccessKey: 'secret456',
        },
      });
    });

    it('omits credentials when only accessKeyId is provided', () => {
      new SesProvider({
        driver: 'ses',
        region: 'us-east-1',
        accessKeyId: 'AKIA123',
      });

      expect(MockSESClient).toHaveBeenCalledWith({ region: 'us-east-1' });
    });
  });

  describe('send', () => {
    let provider: InstanceType<typeof SesProvider>;

    beforeEach(() => {
      provider = new SesProvider(config);
    });

    it('sends a basic email successfully', async () => {
      mockSend.mockResolvedValue({ MessageId: 'ses-msg-123' });

      const result = await provider.send({
        to: 'user@example.com',
        from: 'sender@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        text: 'Hi',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('ses-msg-123');
      expect(result.response).toBe('Email sent via AWS SES');

      expect(MockSendEmailCommand).toHaveBeenCalledWith({
        Source: 'sender@example.com',
        Destination: {
          ToAddresses: ['user@example.com'],
          CcAddresses: undefined,
          BccAddresses: undefined,
        },
        Message: {
          Subject: { Charset: 'UTF-8', Data: 'Hello' },
          Body: {
            Html: { Charset: 'UTF-8', Data: '<p>Hi</p>' },
            Text: { Charset: 'UTF-8', Data: 'Hi' },
          },
        },
        ReplyToAddresses: undefined,
      });
    });

    it('formats MailAddress objects', async () => {
      mockSend.mockResolvedValue({ MessageId: 'id' });

      await provider.send({
        to: { address: 'user@example.com', name: 'John' },
        from: { address: 'sender@example.com', name: 'App' },
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Source: '"App" <sender@example.com>',
          Destination: expect.objectContaining({
            ToAddresses: ['"John" <user@example.com>'],
          }),
        })
      );
    });

    it('formats multiple recipients', async () => {
      mockSend.mockResolvedValue({ MessageId: 'id' });

      await provider.send({
        to: ['a@example.com', 'b@example.com'],
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Destination: expect.objectContaining({
            ToAddresses: ['a@example.com', 'b@example.com'],
          }),
        })
      );
    });

    it('passes cc and bcc', async () => {
      mockSend.mockResolvedValue({ MessageId: 'id' });

      await provider.send({
        to: 'user@example.com',
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Destination: {
            ToAddresses: ['user@example.com'],
            CcAddresses: ['cc@example.com'],
            BccAddresses: ['bcc1@example.com', 'bcc2@example.com'],
          },
        })
      );
    });

    it('passes replyTo', async () => {
      mockSend.mockResolvedValue({ MessageId: 'id' });

      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        replyTo: 'reply@example.com',
      });

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ReplyToAddresses: ['reply@example.com'],
        })
      );
    });

    it('sends HTML-only body', async () => {
      mockSend.mockResolvedValue({ MessageId: 'id' });

      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.objectContaining({
            Body: {
              Html: { Charset: 'UTF-8', Data: '<p>Test</p>' },
            },
          }),
        })
      );
    });

    it('sends text-only body', async () => {
      mockSend.mockResolvedValue({ MessageId: 'id' });

      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Plain text',
      });

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.objectContaining({
            Body: {
              Text: { Charset: 'UTF-8', Data: 'Plain text' },
            },
          }),
        })
      );
    });

    it('handles missing MessageId in response', async () => {
      mockSend.mockResolvedValue({});

      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('');
    });

    it('returns error on send failure', async () => {
      mockSend.mockRejectedValue(new Error('Access denied'));

      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });

    it('handles non-Error thrown values', async () => {
      mockSend.mockRejectedValue('network issue');

      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });
});
