import { MailManager } from '../../src/core/MailManager';
import type { MailConfig, MailOptions, MailResponse, SendingEvent, SentEvent, SendFailedEvent } from '../../src/types';

// Mock the providers
jest.mock('../../src/providers/SmtpProvider');

describe('MailManager Events', () => {
  let manager: MailManager;
  let mockSend: jest.Mock;

  const config: MailConfig = {
    default: 'smtp',
    from: { address: 'noreply@test.com', name: 'Test App' },
    mailers: {
      smtp: {
        driver: 'smtp',
        host: 'smtp.test.com',
        port: 587,
        auth: { user: 'test@test.com', pass: 'password' },
      },
    },
  };

  const baseOptions: MailOptions = {
    to: 'user@example.com',
    subject: 'Test',
    html: '<p>Hello</p>',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new MailManager(config);

    // Access and mock the provider's send method
    const { SmtpProvider } = require('../../src/providers/SmtpProvider');
    mockSend = jest.fn().mockResolvedValue({
      success: true,
      messageId: 'test-id-123',
      accepted: ['user@example.com'],
      rejected: [],
    } as MailResponse);
    SmtpProvider.prototype.send = mockSend;
  });

  it('fires sending then sent on successful send', async () => {
    const events: string[] = [];
    manager.onSending(() => { events.push('sending'); });
    manager.onSent(() => { events.push('sent'); });

    await manager.send(baseOptions);

    expect(events).toEqual(['sending', 'sent']);
  });

  it('fires sending then failed on provider error', async () => {
    mockSend.mockRejectedValue(new Error('SMTP connection failed'));

    const events: string[] = [];
    manager.onSending(() => { events.push('sending'); });
    manager.onFailed(() => { events.push('failed'); });

    await expect(manager.send(baseOptions)).rejects.toThrow('SMTP connection failed');
    expect(events).toEqual(['sending', 'failed']);
  });

  it('fires failed when provider returns success: false', async () => {
    mockSend.mockResolvedValue({ success: false, error: 'Rejected by server' });

    const failedEvents: SendFailedEvent[] = [];
    manager.onFailed((event) => { failedEvents.push(event); });

    const result = await manager.send(baseOptions);

    expect(result.success).toBe(false);
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].error).toBe('Rejected by server');
  });

  it('cancels send when sending listener returns false', async () => {
    manager.onSending(() => false);

    const result = await manager.send(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Send cancelled by sending listener');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('listener modification of options reaches provider', async () => {
    manager.onSending((event) => {
      event.options.headers = { ...event.options.headers, 'X-Tracking': 'abc123' };
    });

    await manager.send(baseOptions);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Tracking': 'abc123' }),
      })
    );
  });

  it('clearListeners() removes all listeners', async () => {
    const events: string[] = [];
    manager.onSending(() => { events.push('sending'); });
    manager.onSent(() => { events.push('sent'); });
    manager.onFailed(() => { events.push('failed'); });

    manager.clearListeners();

    await manager.send(baseOptions);

    expect(events).toEqual([]);
  });

  it('sent event contains response data', async () => {
    let capturedEvent: SentEvent | undefined;
    manager.onSent((event) => { capturedEvent = event; });

    await manager.send(baseOptions);

    expect(capturedEvent).toBeDefined();
    expect(capturedEvent!.response.messageId).toBe('test-id-123');
    expect(capturedEvent!.mailer).toBe('smtp');
    expect(capturedEvent!.timestamp).toBeDefined();
  });

  it('sending event contains correct mailer name', async () => {
    let capturedEvent: SendingEvent | undefined;
    manager.onSending((event) => { capturedEvent = event; });

    await manager.send(baseOptions);

    expect(capturedEvent).toBeDefined();
    expect(capturedEvent!.mailer).toBe('smtp');
  });

  it('listener errors do not break sending', async () => {
    manager.onSending(() => { throw new Error('Listener crash'); });

    const result = await manager.send(baseOptions);

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalled();
  });

  it('failed event contains error for thrown errors', async () => {
    const error = new Error('Connection timeout');
    mockSend.mockRejectedValue(error);

    let capturedEvent: SendFailedEvent | undefined;
    manager.onFailed((event) => { capturedEvent = event; });

    await expect(manager.send(baseOptions)).rejects.toThrow('Connection timeout');

    expect(capturedEvent).toBeDefined();
    expect(capturedEvent!.error).toBe(error);
  });

  it('async sending listener can cancel', async () => {
    manager.onSending(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return false;
    });

    const result = await manager.send(baseOptions);

    expect(result.success).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
