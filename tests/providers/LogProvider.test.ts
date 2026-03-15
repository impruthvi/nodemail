import { LogProvider } from '../../src/providers/LogProvider';

describe('LogProvider', () => {
  let provider: LogProvider;
  let consoleSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  const originalEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    process.env['NODE_ENV'] = 'test';
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    provider = new LogProvider();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
    process.env['NODE_ENV'] = originalEnv;
  });

  describe('constructor', () => {
    it('should warn when NODE_ENV is production', () => {
      warnSpy.mockClear();
      process.env['NODE_ENV'] = 'production';
      new LogProvider();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('LogProvider is intended for development only')
      );
    });

    it('should not warn when NODE_ENV is not production', () => {
      warnSpy.mockClear();
      process.env['NODE_ENV'] = 'development';
      new LogProvider();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should return success with log- prefixed messageId', async () => {
      const result = await provider.send({
        to: 'test@example.com',
        subject: 'Test',
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^log-\d+$/);
    });

    it('should log To address', async () => {
      await provider.send({
        to: 'user@example.com',
        subject: 'Hello',
      });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('user@example.com');
    });

    it('should log From address', async () => {
      await provider.send({
        to: 'user@example.com',
        from: 'sender@example.com',
        subject: 'Hello',
      });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('sender@example.com');
    });

    it('should log Subject', async () => {
      await provider.send({
        to: 'user@example.com',
        subject: 'Important Subject',
      });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('Important Subject');
    });

    it('should log CC recipients', async () => {
      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        cc: 'cc@example.com',
      });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('CC:');
      expect(output).toContain('cc@example.com');
    });

    it('should log BCC recipients', async () => {
      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        bcc: 'bcc@example.com',
      });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('BCC:');
      expect(output).toContain('bcc@example.com');
    });

    it('should log Priority', async () => {
      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        priority: 'high',
      });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('Priority: high');
    });

    it('should log attachment count', async () => {
      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        attachments: [
          { filename: 'file1.pdf', content: Buffer.from('a') },
          { filename: 'file2.pdf', content: Buffer.from('b') },
        ],
      });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('Attachments: 2');
    });

    it('should truncate HTML body at 500 chars', async () => {
      const longHtml = 'x'.repeat(600);
      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: longHtml,
      });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('...');
      expect(output).not.toContain('x'.repeat(600));
    });

    it('should show full body when shorter than 500 chars', async () => {
      const shortHtml = '<p>Hello World</p>';
      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: shortHtml,
      });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain(shortHtml);
      expect(output).not.toContain('...');
    });

    it('should show text body when no HTML', async () => {
      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Plain text body',
      });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('Body (Text):');
      expect(output).toContain('Plain text body');
    });

    it('should handle MailAddress objects', async () => {
      await provider.send({
        to: { address: 'user@example.com', name: 'John Doe' },
        from: { address: 'sender@example.com', name: 'Sender' },
        subject: 'Test',
      });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('John Doe <user@example.com>');
      expect(output).toContain('Sender <sender@example.com>');
    });

    it('should handle arrays of recipients', async () => {
      await provider.send({
        to: ['a@example.com', 'b@example.com'],
        subject: 'Test',
      });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('a@example.com');
      expect(output).toContain('b@example.com');
    });
  });
});
