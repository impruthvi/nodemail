import { MailManager } from '../../src/core/MailManager';
import type { MailConfig, MailOptions, MailResponse, SendingEvent, SentEvent, SendFailedEvent } from '../../src/types';

// Mock provider that tracks calls
const mockSend = jest.fn<Promise<MailResponse>, [MailOptions]>();

jest.mock('../../src/providers/SmtpProvider', () => ({
  SmtpProvider: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
}));

describe('MailManager.preview()', () => {
  const config: MailConfig = {
    default: 'smtp',
    from: { address: 'noreply@test.com', name: 'Test App' },
    mailers: {
      smtp: { driver: 'smtp', host: 'localhost', port: 587 },
    },
  };

  let manager: MailManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({ success: true, messageId: 'test-123' });
    manager = new MailManager(config);
  });

  it('returns preprocessed options with priority headers', async () => {
    const result = await manager.preview({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      priority: 'high',
    });

    expect(result.html).toBe('<p>Hello</p>');
    expect(result.subject).toBe('Test');
    expect(result.to).toBe('user@example.com');
    expect(result.headers).toBeDefined();
    expect(result.headers!['X-Priority']).toBe('1');
    expect(result.headers!['X-MSMail-Priority']).toBe('High');
    expect(result.headers!['Importance']).toBe('high');
  });

  it('does NOT call provider.send()', async () => {
    await manager.preview({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does NOT fire sending events', async () => {
    const events: SendingEvent[] = [];
    manager.onSending((event) => { events.push(event); return true; });

    await manager.preview({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(events).toHaveLength(0);
  });

  it('does NOT fire sent events', async () => {
    const events: SentEvent[] = [];
    manager.onSent((event) => { events.push(event); });

    await manager.preview({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(events).toHaveLength(0);
  });

  it('does NOT fire failed events', async () => {
    const events: SendFailedEvent[] = [];
    manager.onFailed((event) => { events.push(event); });

    await manager.preview({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(events).toHaveLength(0);
  });

  it('merges default from when not set on options', async () => {
    const result = await manager.preview({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result.from).toEqual({ address: 'noreply@test.com', name: 'Test App' });
  });

  it('preserves explicit from over default', async () => {
    const result = await manager.preview({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      from: 'custom@example.com',
    });

    expect(result.from).toBe('custom@example.com');
  });

  it('includes cc, bcc, and attachments', async () => {
    const result = await manager.preview({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      cc: 'cc@example.com',
      bcc: 'bcc@example.com',
      attachments: [{ filename: 'test.txt', content: 'data' }],
    });

    expect(result.cc).toBe('cc@example.com');
    expect(result.bcc).toBe('bcc@example.com');
    expect(result.attachments).toHaveLength(1);
  });

  // Regression: send() still works correctly after preprocess() extraction
  it('send() still works correctly after preprocess extraction', async () => {
    const result = await manager.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('send() with priority still converts to headers after refactor', async () => {
    await manager.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      priority: 'high',
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentOptions = mockSend.mock.calls[0][0];
    expect(sentOptions.headers).toBeDefined();
    expect(sentOptions.headers!['X-Priority']).toBe('1');
  });

  it('send() still fires events after refactor', async () => {
    const sentEvents: SentEvent[] = [];
    manager.onSent((event) => { sentEvents.push(event); });

    await manager.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(sentEvents).toHaveLength(1);
  });
});
