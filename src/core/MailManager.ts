/**
 * Mail Manager - Factory for creating mail provider instances
 * Manages multiple mail configurations (SMTP, SendGrid, etc.)
 */

import type { MailConfig, MailOptions } from '../types';

export class MailManager {
  private config: MailConfig;
  // TODO: Phase 3 - Use this to cache provider instances
  // private providers: Map<string, any> = new Map();

  constructor(config: MailConfig) {
    this.config = config;
  }

  /**
   * Start building an email to the given address
   */
  to(address: string | string[]) {
    return new MessageBuilder(this, address);
  }

  /**
   * Get a specific mailer instance by name
   */
  mailer(name: string) {
    if (!this.config.mailers[name]) {
      throw new Error(`Mailer '${name}' is not configured`);
    }

    // TODO: Phase 3 - Create actual provider instances
    return this;
  }

  /**
   * Send an email using the default mailer
   */
  send(options: MailOptions): void {
    // TODO: Phase 3 - Implement actual sending
    // eslint-disable-next-line no-console
    console.log('Sending email:', options);
  }

  /**
   * Get the default mailer name
   */
  getDefaultMailer(): string {
    return this.config.default;
  }
}

/**
 * Message Builder - Fluent interface for building emails
 */
export class MessageBuilder {
  public options: Partial<MailOptions> = {};

  constructor(
    private manager: MailManager,
    to: string | string[]
  ) {
    this.options.to = to;
  }

  subject(subject: string) {
    this.options.subject = subject;
    return this;
  }

  html(html: string) {
    this.options.html = html;
    return this;
  }

  text(text: string) {
    this.options.text = text;
    return this;
  }

  from(from: string) {
    this.options.from = from;
    return this;
  }

  send(): void {
    if (!this.options.subject) {
      throw new Error('Email subject is required');
    }

    this.manager.send(this.options as MailOptions);
  }
}
