/**
 * Mail Facade - Laravel-style static access to mail functionality
 * Provides simple API: Mail.to().send()
 * Supports Mail.fake() for testing
 */

import { MailManager } from './MailManager';
import { MessageBuilder } from './MessageBuilder';
import type {
  MailConfig,
  MailerConfig,
  MailOptions,
  MailProvider,
  MailResponse,
  PreviewResult,
  QueueJobResult,
  SendingListener,
  SentListener,
  SendFailedListener,
} from '../types';
import type { Mailable } from './Mailable';
import { MailFake } from '../testing/MailFake';
import type { AssertableMessage } from '../testing/AssertableMessage';

class MailFacade {
  private static instance: MailManager | null = null;
  private static fakeInstance: MailFake | null = null;
  private static config: MailConfig | null = null;

  /**
   * Configure the mail system
   */
  static configure(config: MailConfig): void {
    this.config = config;
    this.instance = new MailManager(config);
  }

  /**
   * Get the mail manager instance
   */
  private static getInstance(): MailManager {
    if (!this.instance) {
      throw new Error('Mail not configured. Call Mail.configure() before using Mail facade.');
    }
    return this.instance;
  }

  /**
   * Check if we're in fake mode
   */
  private static isFaking(): boolean {
    return this.fakeInstance !== null;
  }

  /**
   * Start building an email to the given address
   */
  static to(address: string | string[]): MessageBuilder {
    if (this.isFaking()) {
      return new MessageBuilder(this.fakeInstance!, address);
    }
    return new MessageBuilder(this.getInstance(), address);
  }

  /**
   * Get a specific mailer instance
   */
  static mailer(name: string) {
    return this.getInstance().mailer(name);
  }

  /**
   * Send a mailable directly
   */
  static async send(mailable: Mailable): Promise<MailResponse> {
    if (this.isFaking()) {
      const options = mailable.getMailOptions();
      return this.fakeInstance!.send(options as MailOptions, mailable);
    }
    mailable.setMailManager(this.getInstance());
    return mailable.send();
  }

  // ==================== Queue Methods ====================

  /**
   * Queue a mailable for background sending
   */
  static async queue(mailable: Mailable): Promise<QueueJobResult> {
    if (this.isFaking()) {
      const options = mailable.getMailOptions();
      await this.fakeInstance!.queue(options as MailOptions, mailable);
      return { success: true, jobId: `fake-${Date.now()}`, queue: 'mail' };
    }
    mailable.setMailManager(this.getInstance());
    return this.getInstance().queue(mailable.getMailOptions() as MailOptions);
  }

  /**
   * Queue a mailable with a delay (in seconds)
   */
  static async later(mailable: Mailable, delaySeconds: number): Promise<QueueJobResult> {
    if (this.isFaking()) {
      const options = mailable.getMailOptions();
      await this.fakeInstance!.later(options as MailOptions, delaySeconds, mailable);
      return { success: true, jobId: `fake-${Date.now()}`, queue: 'mail' };
    }
    mailable.setMailManager(this.getInstance());
    return this.getInstance().later(mailable.getMailOptions() as MailOptions, delaySeconds);
  }

  /**
   * Schedule a mailable for a specific time
   */
  static async at(mailable: Mailable, date: Date): Promise<QueueJobResult> {
    if (this.isFaking()) {
      const options = mailable.getMailOptions();
      await this.fakeInstance!.at(options as MailOptions, date, mailable);
      return { success: true, jobId: `fake-${Date.now()}`, queue: 'mail' };
    }
    mailable.setMailManager(this.getInstance());
    return this.getInstance().at(mailable.getMailOptions() as MailOptions, date);
  }

  /**
   * Process queued emails
   */
  static async processQueue(queueName?: string): Promise<void> {
    if (this.isFaking()) {
      // In fake mode, there's nothing to process
      return;
    }
    return this.getInstance().processQueue(queueName);
  }

  // ==================== Event Methods ====================

  static onSending(listener: SendingListener): void {
    if (this.isFaking()) {
      this.fakeInstance!.onSending(listener);
    } else {
      this.getInstance().onSending(listener);
    }
  }

  static onSent(listener: SentListener): void {
    if (this.isFaking()) {
      this.fakeInstance!.onSent(listener);
    } else {
      this.getInstance().onSent(listener);
    }
  }

  static onFailed(listener: SendFailedListener): void {
    if (this.isFaking()) {
      this.fakeInstance!.onFailed(listener);
    } else {
      this.getInstance().onFailed(listener);
    }
  }

  static clearListeners(): void {
    if (this.isFaking()) {
      this.fakeInstance!.clearListeners();
    } else {
      this.getInstance().clearListeners();
    }
  }

  // ==================== Preview Methods ====================

  /**
   * Preview a mailable without sending it
   */
  static async preview(mailable: Mailable): Promise<PreviewResult> {
    const options = mailable.getMailOptions();
    if (this.isFaking()) {
      return this.fakeInstance!.preview(options as MailOptions);
    }
    mailable.setMailManager(this.getInstance());
    return this.getInstance().preview(options as MailOptions);
  }

  // ==================== Extension Methods ====================

  /**
   * Register a custom mail provider
   */
  static extend(driver: string, factory: (config: MailerConfig) => MailProvider): void {
    MailManager.extend(driver, factory);
  }

  /**
   * Set the alwaysTo redirect address (skipped in fake mode)
   */
  static alwaysTo(address: string | undefined): void {
    if (this.isFaking()) return;
    this.getInstance().setAlwaysTo(address);
  }

  // ==================== Testing Methods ====================

  /**
   * Enable fake mode for testing
   * All emails will be stored instead of sent
   */
  static fake(): MailFake {
    this.fakeInstance = new MailFake(this.config || undefined);
    return this.fakeInstance;
  }

  /**
   * Restore the real mail system (disable fake mode)
   */
  static restore(): void {
    this.fakeInstance = null;
  }

  /**
   * Get the fake instance (for advanced testing)
   */
  static getFake(): MailFake | null {
    return this.fakeInstance;
  }

  /**
   * Assert that a mailable was sent
   */
  static assertSent<T extends Mailable>(
    mailableClass: new (...args: any[]) => T,
    callback?: (message: AssertableMessage) => boolean
  ): void {
    if (!this.fakeInstance) {
      throw new Error('Mail::fake() must be called before using assertions.');
    }
    this.fakeInstance.assertSent(mailableClass, callback);
  }

  /**
   * Assert that a mailable was sent a specific number of times
   */
  static assertSentCount<T extends Mailable>(
    mailableClass: new (...args: any[]) => T,
    count: number
  ): void {
    if (!this.fakeInstance) {
      throw new Error('Mail::fake() must be called before using assertions.');
    }
    this.fakeInstance.assertSentCount(mailableClass, count);
  }

  /**
   * Assert that a mailable was not sent
   */
  static assertNotSent<T extends Mailable>(
    mailableClass: new (...args: any[]) => T,
    callback?: (message: AssertableMessage) => boolean
  ): void {
    if (!this.fakeInstance) {
      throw new Error('Mail::fake() must be called before using assertions.');
    }
    this.fakeInstance.assertNotSent(mailableClass, callback);
  }

  /**
   * Assert that no mailables were sent
   */
  static assertNothingSent(): void {
    if (!this.fakeInstance) {
      throw new Error('Mail::fake() must be called before using assertions.');
    }
    this.fakeInstance.assertNothingSent();
  }

  /**
   * Assert that a mailable was queued
   */
  static assertQueued<T extends Mailable>(
    mailableClass: new (...args: any[]) => T,
    callback?: (message: AssertableMessage) => boolean
  ): void {
    if (!this.fakeInstance) {
      throw new Error('Mail::fake() must be called before using assertions.');
    }
    this.fakeInstance.assertQueued(mailableClass, callback);
  }

  /**
   * Assert that a mailable was queued a specific number of times
   */
  static assertQueuedCount<T extends Mailable>(
    mailableClass: new (...args: any[]) => T,
    count: number
  ): void {
    if (!this.fakeInstance) {
      throw new Error('Mail::fake() must be called before using assertions.');
    }
    this.fakeInstance.assertQueuedCount(mailableClass, count);
  }

  /**
   * Assert that a mailable was not queued
   */
  static assertNotQueued<T extends Mailable>(
    mailableClass: new (...args: any[]) => T,
    callback?: (message: AssertableMessage) => boolean
  ): void {
    if (!this.fakeInstance) {
      throw new Error('Mail::fake() must be called before using assertions.');
    }
    this.fakeInstance.assertNotQueued(mailableClass, callback);
  }

  /**
   * Assert that nothing was queued
   */
  static assertNothingQueued(): void {
    if (!this.fakeInstance) {
      throw new Error('Mail::fake() must be called before using assertions.');
    }
    this.fakeInstance.assertNothingQueued();
  }

  /**
   * Get all sent messages (optionally filtered by mailable class)
   */
  static sent<T extends Mailable>(
    mailableClass?: new (...args: any[]) => T
  ): AssertableMessage[] {
    if (!this.fakeInstance) {
      throw new Error('Mail::fake() must be called before using sent().');
    }
    return this.fakeInstance.sent(mailableClass);
  }

  /**
   * Get all queued messages (optionally filtered by mailable class)
   */
  static queued<T extends Mailable>(
    mailableClass?: new (...args: any[]) => T
  ): AssertableMessage[] {
    if (!this.fakeInstance) {
      throw new Error('Mail::fake() must be called before using queued().');
    }
    return this.fakeInstance.queued(mailableClass);
  }

  /**
   * Check if any messages have been sent
   */
  static hasSent(): boolean {
    if (!this.fakeInstance) {
      throw new Error('Mail::fake() must be called before using hasSent().');
    }
    return this.fakeInstance.hasSent();
  }

  /**
   * Check if any messages have been queued
   */
  static hasQueued(): boolean {
    if (!this.fakeInstance) {
      throw new Error('Mail::fake() must be called before using hasQueued().');
    }
    return this.fakeInstance.hasQueued();
  }
}

export { MailFacade as Mail };
