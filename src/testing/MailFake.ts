/**
 * MailFake - Fake mail provider for testing
 * Stores sent messages instead of actually sending them
 * Provides assertion methods for verifying email behavior
 */

import type {
  MailOptions,
  MailResponse,
  MailProvider,
  MailConfig,
  PreviewResult,
  SendingEvent,
  SentEvent,
  SendFailedEvent,
  SendingListener,
  SentListener,
  SendFailedListener,
} from '../types';
import type { Mailable } from '../core/Mailable';
import { AssertableMessage } from './AssertableMessage';

export interface SentMessage {
  options: MailOptions;
  mailable: Mailable | undefined;
  timestamp: Date;
}

export type FiredEvent =
  | { type: 'sending'; event: SendingEvent }
  | { type: 'sent'; event: SentEvent }
  | { type: 'failed'; event: SendFailedEvent };

export class MailFake implements MailProvider {
  private sentMessages: SentMessage[] = [];
  private queuedMessages: SentMessage[] = [];
  private failureCount = 0;
  private failuresSent = 0;
  private firedEvents: FiredEvent[] = [];
  private listeners = {
    sending: [] as SendingListener[],
    sent: [] as SentListener[],
    failed: [] as SendFailedListener[],
  };

  constructor(_config?: MailConfig) {
    // Config stored for future use (queue configuration, etc.)
  }

  /**
   * Simulate failures for the first N sends (returns { success: false })
   */
  simulateFailures(count: number): void {
    this.failureCount = count;
    this.failuresSent = 0;
  }

  /**
   * Clear failure simulation state
   */
  resetFailures(): void {
    this.failureCount = 0;
    this.failuresSent = 0;
  }

  /**
   * Fake send - stores message instead of sending
   * Respects simulateFailures() for testing failover scenarios
   * Fires sending/sent/failed events
   */
  async send(options: MailOptions, mailable?: Mailable): Promise<MailResponse> {
    const mailerName = 'fake';

    // Fire sending event
    const sendingEvent: SendingEvent = {
      options,
      mailer: mailerName,
      timestamp: new Date().toISOString(),
    };

    const shouldSend = await this.fireSending(sendingEvent);
    if (!shouldSend) {
      return { success: false, error: 'Send cancelled by sending listener' };
    }

    // Use potentially mutated options
    options = sendingEvent.options;

    // Check if we should simulate a failure
    if (this.failureCount > 0 && this.failuresSent < this.failureCount) {
      this.failuresSent++;
      const response: MailResponse = {
        success: false,
        error: `Simulated failure (${this.failuresSent}/${this.failureCount})`,
      };
      await this.fireFailed({
        options,
        error: response.error!,
        mailer: mailerName,
        timestamp: new Date().toISOString(),
      });
      return response;
    }

    const message: SentMessage = {
      options,
      mailable,
      timestamp: new Date(),
    };

    this.sentMessages.push(message);

    const response: MailResponse = {
      success: true,
      messageId: `fake-${Date.now()}-${this.sentMessages.length}`,
      accepted: this.normalizeRecipients(options.to),
      rejected: [],
      response: 'Message stored in fake mailer',
    };

    await this.fireSent({
      options,
      response,
      mailer: mailerName,
      timestamp: new Date().toISOString(),
    });

    return response;
  }

  /**
   * Fake queue - stores message in queue instead of queuing
   */
  queue(options: MailOptions, mailable?: Mailable): Promise<MailResponse> {
    const message: SentMessage = {
      options,
      mailable,
      timestamp: new Date(),
    };

    this.queuedMessages.push(message);

    return Promise.resolve({
      success: true,
      messageId: `fake-queued-${Date.now()}-${this.queuedMessages.length}`,
      response: 'Message queued in fake mailer',
    });
  }

  /**
   * Fake later - stores message in queue with delay (for testing)
   */
  later(options: MailOptions, _delaySeconds: number, mailable?: Mailable): Promise<MailResponse> {
    return this.queue(options, mailable);
  }

  /**
   * Fake at - stores message in queue for specific time (for testing)
   */
  at(options: MailOptions, _date: Date, mailable?: Mailable): Promise<MailResponse> {
    return this.queue(options, mailable);
  }

  /**
   * Preview an email without sending or storing it
   * Applies priority headers but does not fire events or store messages
   */
  preview(options: MailOptions): PreviewResult {
    let processed = { ...options };

    // Convert priority to headers
    if (processed.priority) {
      const map = {
        high:   { 'X-Priority': '1', 'X-MSMail-Priority': 'High',   'Importance': 'high' },
        normal: { 'X-Priority': '3', 'X-MSMail-Priority': 'Normal', 'Importance': 'normal' },
        low:    { 'X-Priority': '5', 'X-MSMail-Priority': 'Low',    'Importance': 'low' },
      };
      const existing = processed.headers || {};
      processed = { ...processed, headers: { ...map[processed.priority], ...existing } };
    }

    return {
      html: processed.html,
      text: processed.text,
      subject: processed.subject,
      from: processed.from,
      to: processed.to,
      cc: processed.cc,
      bcc: processed.bcc,
      headers: processed.headers,
      attachments: processed.attachments,
    };
  }

  /**
   * Get all sent messages
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sent<T extends Mailable>(mailableClass?: new (...args: any[]) => T): AssertableMessage[] {
    let messages = this.sentMessages;

    if (mailableClass) {
      messages = messages.filter((m) => m.mailable instanceof mailableClass);
    }

    return messages.map((m) => new AssertableMessage(m.options, m.mailable));
  }

  /**
   * Get all queued messages
   */
  queued<T extends Mailable>(mailableClass?: new (...args: any[]) => T): AssertableMessage[] {
    let messages = this.queuedMessages;

    if (mailableClass) {
      messages = messages.filter((m) => m.mailable instanceof mailableClass);
    }

    return messages.map((m) => new AssertableMessage(m.options, m.mailable));
  }

  /**
   * Assert that a mailable was sent
   */
  assertSent<T extends Mailable>(
    mailableClass: new (...args: any[]) => T,
    callback?: (message: AssertableMessage) => boolean
  ): void {
    const messages = this.sent(mailableClass);

    if (messages.length === 0) {
      throw new Error(
        `The expected [${mailableClass.name}] mailable was not sent.`
      );
    }

    if (callback) {
      const matchingMessages = messages.filter(callback);
      if (matchingMessages.length === 0) {
        throw new Error(
          `The expected [${mailableClass.name}] mailable was sent, but the callback returned false for all sent messages.`
        );
      }
    }
  }

  /**
   * Assert that a mailable was sent a specific number of times
   */
  assertSentCount<T extends Mailable>(
    mailableClass: new (...args: any[]) => T,
    count: number
  ): void {
    const messages = this.sent(mailableClass);

    if (messages.length !== count) {
      throw new Error(
        `Expected [${mailableClass.name}] to be sent ${count} time(s), but it was sent ${messages.length} time(s).`
      );
    }
  }

  /**
   * Assert that a mailable was not sent
   */
  assertNotSent<T extends Mailable>(
    mailableClass: new (...args: any[]) => T,
    callback?: (message: AssertableMessage) => boolean
  ): void {
    const messages = this.sent(mailableClass);

    if (callback) {
      const matchingMessages = messages.filter(callback);
      if (matchingMessages.length > 0) {
        throw new Error(
          `The unexpected [${mailableClass.name}] mailable was sent.`
        );
      }
    } else if (messages.length > 0) {
      throw new Error(
        `The unexpected [${mailableClass.name}] mailable was sent.`
      );
    }
  }

  /**
   * Assert that no mailables were sent
   */
  assertNothingSent(): void {
    if (this.sentMessages.length > 0) {
      const mailableNames = this.sentMessages
        .map((m) => m.mailable?.constructor.name || 'Unknown')
        .join(', ');
      throw new Error(
        `Expected no mailables to be sent, but ${this.sentMessages.length} were sent: [${mailableNames}]`
      );
    }
  }

  /**
   * Assert that a mailable was queued
   */
  assertQueued<T extends Mailable>(
    mailableClass: new (...args: any[]) => T,
    callback?: (message: AssertableMessage) => boolean
  ): void {
    const messages = this.queued(mailableClass);

    if (messages.length === 0) {
      throw new Error(
        `The expected [${mailableClass.name}] mailable was not queued.`
      );
    }

    if (callback) {
      const matchingMessages = messages.filter(callback);
      if (matchingMessages.length === 0) {
        throw new Error(
          `The expected [${mailableClass.name}] mailable was queued, but the callback returned false for all queued messages.`
        );
      }
    }
  }

  /**
   * Assert that a mailable was queued a specific number of times
   */
  assertQueuedCount<T extends Mailable>(
    mailableClass: new (...args: any[]) => T,
    count: number
  ): void {
    const messages = this.queued(mailableClass);

    if (messages.length !== count) {
      throw new Error(
        `Expected [${mailableClass.name}] to be queued ${count} time(s), but it was queued ${messages.length} time(s).`
      );
    }
  }

  /**
   * Assert that a mailable was not queued
   */
  assertNotQueued<T extends Mailable>(
    mailableClass: new (...args: any[]) => T,
    callback?: (message: AssertableMessage) => boolean
  ): void {
    const messages = this.queued(mailableClass);

    if (callback) {
      const matchingMessages = messages.filter(callback);
      if (matchingMessages.length > 0) {
        throw new Error(
          `The unexpected [${mailableClass.name}] mailable was queued.`
        );
      }
    } else if (messages.length > 0) {
      throw new Error(
        `The unexpected [${mailableClass.name}] mailable was queued.`
      );
    }
  }

  /**
   * Assert that nothing was queued
   */
  assertNothingQueued(): void {
    if (this.queuedMessages.length > 0) {
      const mailableNames = this.queuedMessages
        .map((m) => m.mailable?.constructor.name || 'Unknown')
        .join(', ');
      throw new Error(
        `Expected no mailables to be queued, but ${this.queuedMessages.length} were queued: [${mailableNames}]`
      );
    }
  }

  /**
   * Check if any messages were sent
   */
  hasSent(): boolean {
    return this.sentMessages.length > 0;
  }

  /**
   * Check if any messages were queued
   */
  hasQueued(): boolean {
    return this.queuedMessages.length > 0;
  }

  /**
   * Get sent message count
   */
  sentCount(): number {
    return this.sentMessages.length;
  }

  /**
   * Get queued message count
   */
  queuedCount(): number {
    return this.queuedMessages.length;
  }

  /**
   * Clear all sent and queued messages, events, and listeners
   */
  clear(): void {
    this.sentMessages = [];
    this.queuedMessages = [];
    this.failureCount = 0;
    this.failuresSent = 0;
    this.firedEvents = [];
    this.listeners.sending = [];
    this.listeners.sent = [];
    this.listeners.failed = [];
  }

  // ==================== Event Methods ====================

  onSending(listener: SendingListener): void {
    this.listeners.sending.push(listener);
  }

  onSent(listener: SentListener): void {
    this.listeners.sent.push(listener);
  }

  onFailed(listener: SendFailedListener): void {
    this.listeners.failed.push(listener);
  }

  clearListeners(): void {
    this.listeners.sending = [];
    this.listeners.sent = [];
    this.listeners.failed = [];
  }

  getFiredEvents(): FiredEvent[] {
    return [...this.firedEvents];
  }

  private async fireSending(event: SendingEvent): Promise<boolean> {
    this.firedEvents.push({ type: 'sending', event });
    for (const listener of this.listeners.sending) {
      try {
        const result = await listener(event);
        if (result === false) return false;
      } catch {
        // Listener errors must never break email delivery
      }
    }
    return true;
  }

  private async fireSent(event: SentEvent): Promise<void> {
    this.firedEvents.push({ type: 'sent', event });
    for (const listener of this.listeners.sent) {
      try {
        await listener(event);
      } catch {
        // Listener errors must never break email delivery
      }
    }
  }

  private async fireFailed(event: SendFailedEvent): Promise<void> {
    this.firedEvents.push({ type: 'failed', event });
    for (const listener of this.listeners.failed) {
      try {
        await listener(event);
      } catch {
        // Listener errors must never break email delivery
      }
    }
  }

  /**
   * Normalize recipients to string array
   */
  private normalizeRecipients(
    to: MailOptions['to']
  ): string[] {
    if (typeof to === 'string') {
      return [to];
    }
    if (Array.isArray(to)) {
      return to.map((recipient) =>
        typeof recipient === 'string' ? recipient : recipient.address
      );
    }
    return [to.address];
  }
}
