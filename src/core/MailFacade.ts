/**
 * Mail Facade - Laravel-style static access to mail functionality
 * Provides simple API: Mail.to().send()
 * Supports Mail.fake() for testing
 */

import { MailManager } from './MailManager';
import type { MailConfig, MailOptions, MailResponse, QueueJobResult } from '../types';
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
  static to(address: string | string[]): FakeableMessageBuilder {
    if (this.isFaking()) {
      return new FakeableMessageBuilder(this.fakeInstance!, address);
    }
    return new FakeableMessageBuilder(this.getInstance(), address);
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

/**
 * FakeableMessageBuilder - Extended MessageBuilder that supports fake mode
 */
class FakeableMessageBuilder {
  public options: Partial<MailOptions> = {};

  constructor(
    private manager: MailManager | MailFake,
    to: string | string[]
  ) {
    this.options.to = to;
  }

  subject(subject: string): this {
    this.options.subject = subject;
    return this;
  }

  html(html: string): this {
    this.options.html = html;
    return this;
  }

  text(text: string): this {
    this.options.text = text;
    return this;
  }

  from(from: string): this {
    this.options.from = from;
    return this;
  }

  cc(cc: string | string[]): this {
    this.options.cc = cc;
    return this;
  }

  bcc(bcc: string | string[]): this {
    this.options.bcc = bcc;
    return this;
  }

  replyTo(replyTo: string): this {
    this.options.replyTo = replyTo;
    return this;
  }

  attachments(attachments: import('../types').Attachment[]): this {
    this.options.attachments = attachments;
    return this;
  }

  headers(headers: Record<string, string>): this {
    this.options.headers = headers;
    return this;
  }

  template(template: string): this {
    this.options.template = template;
    return this;
  }

  data(data: Record<string, unknown>): this {
    this.options.data = data;
    return this;
  }

  async send(mailable?: Mailable): Promise<MailResponse> {
    // If using MailFake
    if (this.manager instanceof MailFake) {
      if (mailable) {
        const mailOptions = mailable.getMailOptions();
        return this.manager.send(
          { ...mailOptions, to: this.options.to! } as MailOptions,
          mailable
        );
      }

      if (!this.options.subject) {
        throw new Error('Email subject is required');
      }

      return this.manager.send(this.options as MailOptions);
    }

    // If using real MailManager (we know it's MailManager since we checked MailFake above)
    const realManager = this.manager;
    if (!(realManager instanceof MailManager)) {
      throw new Error('Invalid mail manager');
    }

    if (mailable) {
      mailable.setMailManager(realManager);
      const mailOptions = mailable.getMailOptions();
      return realManager.send({
        ...mailOptions,
        to: this.options.to!,
      } as MailOptions);
    }

    if (!this.options.subject) {
      throw new Error('Email subject is required');
    }

    return realManager.send(this.options as MailOptions);
  }

  async queue(mailable?: Mailable): Promise<QueueJobResult> {
    // If using MailFake
    if (this.manager instanceof MailFake) {
      if (mailable) {
        const mailOptions = mailable.getMailOptions();
        await this.manager.queue(
          { ...mailOptions, to: this.options.to! } as MailOptions,
          mailable
        );
      } else {
        if (!this.options.subject) {
          throw new Error('Email subject is required');
        }
        await this.manager.queue(this.options as MailOptions);
      }
      return { success: true, jobId: `fake-${Date.now()}`, queue: 'mail' };
    }

    // If using real MailManager
    const realManager = this.manager;
    if (!(realManager instanceof MailManager)) {
      throw new Error('Invalid mail manager');
    }

    const mailOptions = this.getMailOptions(mailable);
    return realManager.queue(mailOptions);
  }

  /**
   * Queue the email with a delay (in seconds)
   */
  async later(delaySeconds: number, mailable?: Mailable): Promise<QueueJobResult> {
    // If using MailFake
    if (this.manager instanceof MailFake) {
      if (mailable) {
        const mailOptions = mailable.getMailOptions();
        await this.manager.later(
          { ...mailOptions, to: this.options.to! } as MailOptions,
          delaySeconds,
          mailable
        );
      } else {
        if (!this.options.subject) {
          throw new Error('Email subject is required');
        }
        await this.manager.later(this.options as MailOptions, delaySeconds);
      }
      return { success: true, jobId: `fake-${Date.now()}`, queue: 'mail' };
    }

    // If using real MailManager
    const realManager = this.manager;
    if (!(realManager instanceof MailManager)) {
      throw new Error('Invalid mail manager');
    }

    const mailOptions = this.getMailOptions(mailable);
    return realManager.later(mailOptions, delaySeconds);
  }

  /**
   * Schedule the email for a specific time
   */
  async at(date: Date, mailable?: Mailable): Promise<QueueJobResult> {
    // If using MailFake
    if (this.manager instanceof MailFake) {
      if (mailable) {
        const mailOptions = mailable.getMailOptions();
        await this.manager.at(
          { ...mailOptions, to: this.options.to! } as MailOptions,
          date,
          mailable
        );
      } else {
        if (!this.options.subject) {
          throw new Error('Email subject is required');
        }
        await this.manager.at(this.options as MailOptions, date);
      }
      return { success: true, jobId: `fake-${Date.now()}`, queue: 'mail' };
    }

    // If using real MailManager
    const realManager = this.manager;
    if (!(realManager instanceof MailManager)) {
      throw new Error('Invalid mail manager');
    }

    const mailOptions = this.getMailOptions(mailable);
    return realManager.at(mailOptions, date);
  }

  /**
   * Get mail options from builder or mailable
   */
  private getMailOptions(mailable?: Mailable): MailOptions {
    if (mailable) {
      if (this.manager instanceof MailManager) {
        mailable.setMailManager(this.manager);
      }
      const mailOptions = mailable.getMailOptions();
      return {
        ...mailOptions,
        to: this.options.to!,
      } as MailOptions;
    }

    if (!this.options.subject) {
      throw new Error('Email subject is required');
    }

    return this.options as MailOptions;
  }
}

export { MailFacade as Mail };
