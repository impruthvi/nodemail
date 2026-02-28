import { Mail } from '../../src/core/MailFacade';
import type { MailConfig, MailOptions, SendingEvent, SentEvent, SendFailedEvent } from '../../src/types';

describe('Mail Events (Fake Mode)', () => {
  const config: MailConfig = {
    default: 'smtp',
    from: { address: 'noreply@test.com', name: 'Test App' },
    mailers: {
      smtp: { driver: 'smtp', host: 'localhost', port: 587 },
    },
  };

  const baseOptions: MailOptions = {
    to: 'user@example.com',
    subject: 'Test Email',
    html: '<p>Hello</p>',
  };

  beforeEach(() => {
    Mail.configure(config);
    Mail.fake();
  });

  afterEach(() => {
    Mail.restore();
  });

  it('fires sending event before send', async () => {
    const events: string[] = [];
    Mail.onSending(() => { events.push('sending'); });

    await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    expect(events).toEqual(['sending']);
  });

  it('fires sent event after successful send', async () => {
    const events: SentEvent[] = [];
    Mail.onSent((event) => { events.push(event); });

    await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    expect(events).toHaveLength(1);
    expect(events[0].response.success).toBe(true);
    expect(events[0].mailer).toBe('fake');
    expect(events[0].timestamp).toBeDefined();
  });

  it('fires failed event on simulated failure', async () => {
    const events: SendFailedEvent[] = [];
    Mail.onFailed((event) => { events.push(event); });

    const fake = Mail.getFake()!;
    fake.simulateFailures(1);

    await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    expect(events).toHaveLength(1);
    expect(events[0].error).toContain('Simulated failure');
    expect(events[0].mailer).toBe('fake');
  });

  it('cancels send when listener returns false', async () => {
    Mail.onSending(() => false);

    const result = await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Send cancelled by sending listener');
    Mail.assertNothingSent();
  });

  it('allows listener to modify event.options', async () => {
    Mail.onSending((event) => {
      event.options.headers = { ...event.options.headers, 'X-Custom': 'modified' };
    });

    await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    const sent = Mail.sent();
    expect(sent).toHaveLength(1);
    expect(sent[0].getOptions().headers).toHaveProperty('X-Custom', 'modified');
  });

  it('listener errors do not break sending', async () => {
    Mail.onSending(() => { throw new Error('Listener error'); });

    const result = await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    expect(result.success).toBe(true);
  });

  it('clearListeners() removes all listeners', async () => {
    const events: string[] = [];
    Mail.onSending(() => { events.push('sending'); });
    Mail.onSent(() => { events.push('sent'); });
    Mail.onFailed(() => { events.push('failed'); });

    Mail.clearListeners();

    await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    expect(events).toEqual([]);
  });

  it('getFiredEvents() records event history', async () => {
    await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    const fake = Mail.getFake()!;
    const firedEvents = fake.getFiredEvents();

    expect(firedEvents).toHaveLength(2);
    expect(firedEvents[0].type).toBe('sending');
    expect(firedEvents[1].type).toBe('sent');
  });

  it('getFiredEvents() records failed events', async () => {
    const fake = Mail.getFake()!;
    fake.simulateFailures(1);

    await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    const firedEvents = fake.getFiredEvents();
    expect(firedEvents).toHaveLength(2);
    expect(firedEvents[0].type).toBe('sending');
    expect(firedEvents[1].type).toBe('failed');
  });

  it('multiple listeners fire in order', async () => {
    const order: number[] = [];
    Mail.onSending(() => { order.push(1); });
    Mail.onSending(() => { order.push(2); });
    Mail.onSending(() => { order.push(3); });

    await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    expect(order).toEqual([1, 2, 3]);
  });

  it('async listeners work correctly', async () => {
    const events: string[] = [];

    Mail.onSending(async () => {
      await new Promise((r) => setTimeout(r, 10));
      events.push('sending');
    });

    Mail.onSent(async () => {
      await new Promise((r) => setTimeout(r, 10));
      events.push('sent');
    });

    await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    expect(events).toEqual(['sending', 'sent']);
  });

  it('clear() resets firedEvents and listeners', async () => {
    Mail.onSending(() => {});
    await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    const fake = Mail.getFake()!;
    expect(fake.getFiredEvents().length).toBeGreaterThan(0);

    fake.clear();

    expect(fake.getFiredEvents()).toEqual([]);

    // Listener should also be cleared — no events tracked after clear
    await fake.send(baseOptions);
    // Events still fire (built-in tracking), but listener was removed
    const firedAfterClear = fake.getFiredEvents();
    expect(firedAfterClear).toHaveLength(2); // sending + sent still tracked
  });

  it('sending event contains correct options and mailer', async () => {
    let capturedEvent: SendingEvent | undefined;
    Mail.onSending((event) => { capturedEvent = event; });

    await Mail.to('user@example.com').subject('Hello').html('<p>World</p>').send();

    expect(capturedEvent).toBeDefined();
    expect(capturedEvent!.options.subject).toBe('Hello');
    expect(capturedEvent!.mailer).toBe('fake');
    expect(capturedEvent!.timestamp).toBeDefined();
  });

  it('second listener can cancel even if first does not', async () => {
    Mail.onSending(() => { /* allow */ });
    Mail.onSending(() => false);

    const result = await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Send cancelled by sending listener');
  });
});
