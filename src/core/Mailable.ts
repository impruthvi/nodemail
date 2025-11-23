/**
 * Mailable - Base class for reusable email definitions (Laravel-style)
 */

import type { MailOptions } from '../types';

export abstract class Mailable {
  protected options: Partial<MailOptions> = {};

  /**
   * Build the email message
   * Override this method in your mailable classes
   */
  abstract build(): this;

  /**
   * Set the email subject
   */
  protected subject(subject: string): this {
    this.options.subject = subject;
    return this;
  }

  /**
   * Set the HTML content
   */
  protected html(html: string): this {
    this.options.html = html;
    return this;
  }

  /**
   * Set the plain text content
   */
  protected text(text: string): this {
    this.options.text = text;
    return this;
  }

  /**
   * Set a view template
   */
  protected view(template: string, data?: Record<string, unknown>): this {
    this.options.template = template;
    if (data !== undefined) {
      this.options.data = data;
    }
    return this;
  }

  /**
   * Add an attachment
   */
  protected attach(path: string): this {
    if (!this.options.attachments) {
      this.options.attachments = [];
    }
    this.options.attachments.push({ filename: path, path });
    return this;
  }

  /**
   * Get the built mail options
   */
  getMailOptions(): Partial<MailOptions> {
    this.build();
    return this.options;
  }
}
