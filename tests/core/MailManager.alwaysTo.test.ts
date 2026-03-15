import { MailManager } from '../../src/core/MailManager';
import { Mail } from '../../src/core/MailFacade';
import type { MailConfig, MailerConfig, MailProvider, MailOptions, SentEvent } from '../../src/types';

const mockSend = jest.fn().mockResolvedValue({ success: true, messageId: 'test-123' });

function makeProvider(): MailProvider {
  return { send: mockSend };
}

function baseConfig(alwaysTo?: string): MailConfig {
  return {
    default: 'test',
    from: { address: 'sender@example.com', name: 'Sender' },
    mailers: {
      test: { driver: 'test-driver' } as MailerConfig,
    },
    ...(alwaysTo ? { alwaysTo } : {}),
  };
}

describe('Mail.alwaysTo()', () => {
  beforeEach(() => {
    MailManager.extend('test-driver', () => makeProvider());
  });

  afterEach(() => {
    MailManager.clearCustomProviders();
    Mail.restore();
    mockSend.mockClear();
  });

  it('should redirect all emails to alwaysTo address via config', async () => {
    const manager = new MailManager(baseConfig('redirect@example.com'));

    await manager.send({
      to: 'original@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'redirect@example.com' })
    );
  });

  it('should clear CC and BCC when alwaysTo is set', async () => {
    const manager = new MailManager(baseConfig('redirect@example.com'));

    await manager.send({
      to: 'original@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      cc: 'cc@example.com',
      bcc: 'bcc@example.com',
    });

    const sentOptions = mockSend.mock.calls[0][0] as MailOptions;
    expect(sentOptions.to).toBe('redirect@example.com');
    expect(sentOptions.cc).toBeUndefined();
    expect(sentOptions.bcc).toBeUndefined();
  });

  it('should work via setAlwaysTo() method', async () => {
    const manager = new MailManager(baseConfig());
    manager.setAlwaysTo('redirect@example.com');

    await manager.send({
      to: 'original@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'redirect@example.com' })
    );
  });

  it('should work via Mail.alwaysTo() facade', async () => {
    Mail.configure(baseConfig());
    Mail.alwaysTo('redirect@example.com');

    const result = await Mail.to('original@example.com').subject('Test').html('<p>Hi</p>').send();
    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'redirect@example.com' })
    );
  });

  it('should be clearable by setting to undefined', async () => {
    const manager = new MailManager(baseConfig('redirect@example.com'));
    manager.setAlwaysTo(undefined);

    await manager.send({
      to: 'original@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'original@example.com' })
    );
  });

  it('should apply to preview() as well', async () => {
    const manager = new MailManager(baseConfig('redirect@example.com'));

    const preview = await manager.preview({
      to: 'original@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      cc: 'cc@example.com',
    });

    expect(preview.to).toBe('redirect@example.com');
    expect(preview.cc).toBeUndefined();
  });

  it('should skip when in fake mode', () => {
    Mail.configure(baseConfig());
    Mail.fake();
    // Should not throw even though no real instance
    Mail.alwaysTo('redirect@example.com');
    Mail.restore();
  });

  it('should apply after preprocess (priority headers preserved)', async () => {
    const manager = new MailManager(baseConfig('redirect@example.com'));

    await manager.send({
      to: 'original@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      priority: 'high',
    });

    const sentOptions = mockSend.mock.calls[0][0] as MailOptions;
    expect(sentOptions.to).toBe('redirect@example.com');
    expect(sentOptions.headers).toEqual(
      expect.objectContaining({ 'X-Priority': '1' })
    );
  });

  it('should let events see the redirected address', async () => {
    const manager = new MailManager(baseConfig('redirect@example.com'));

    const sentEvents: SentEvent[] = [];
    manager.onSent((event) => { sentEvents.push(event); });

    await manager.send({
      to: 'original@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(sentEvents).toHaveLength(1);
    expect(sentEvents[0].options.to).toBe('redirect@example.com');
  });

  it('should preserve other options (subject, html, attachments)', async () => {
    const manager = new MailManager(baseConfig('redirect@example.com'));
    const attachments = [{ filename: 'file.pdf', content: Buffer.from('data') }];

    await manager.send({
      to: 'original@example.com',
      subject: 'Important',
      html: '<p>Content</p>',
      attachments,
    });

    const sentOptions = mockSend.mock.calls[0][0] as MailOptions;
    expect(sentOptions.subject).toBe('Important');
    expect(sentOptions.html).toBe('<p>Content</p>');
    expect(sentOptions.attachments).toEqual(attachments);
  });

  it('should not redirect when alwaysTo is not set', async () => {
    const manager = new MailManager(baseConfig());

    await manager.send({
      to: 'original@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      cc: 'cc@example.com',
    });

    const sentOptions = mockSend.mock.calls[0][0] as MailOptions;
    expect(sentOptions.to).toBe('original@example.com');
    expect(sentOptions.cc).toBe('cc@example.com');
  });
});
