/**
 * MailFake - Fake mail provider for testing
 * Stores sent messages instead of actually sending them
 * Provides assertion methods for verifying email behavior
 */

import type { MailOptions, MailResponse, MailProvider, MailConfig } from '../types';
import type { Mailable } from '../core/Mailable';
import { AssertableMessage } from './AssertableMessage';

export interface SentMessage {
  options: MailOptions;
  mailable: Mailable | undefined;
  timestamp: Date;
}

export class MailFake implements MailProvider {
  private sentMessages: SentMessage[] = [];
  private queuedMessages: SentMessage[] = [];
  private failureCount = 0;
  private failuresSent = 0;

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
   */
  send(options: MailOptions, mailable?: Mailable): Promise<MailResponse> {
    // Check if we should simulate a failure
    if (this.failureCount > 0 && this.failuresSent < this.failureCount) {
      this.failuresSent++;
      return Promise.resolve({
        success: false,
        error: `Simulated failure (${this.failuresSent}/${this.failureCount})`,
      });
    }

    const message: SentMessage = {
      options,
      mailable,
      timestamp: new Date(),
    };

    this.sentMessages.push(message);

    return Promise.resolve({
      success: true,
      messageId: `fake-${Date.now()}-${this.sentMessages.length}`,
      accepted: this.normalizeRecipients(options.to),
      rejected: [],
      response: 'Message stored in fake mailer',
    });
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
   * Clear all sent and queued messages
   */
  clear(): void {
    this.sentMessages = [];
    this.queuedMessages = [];
    this.failureCount = 0;
    this.failuresSent = 0;
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
