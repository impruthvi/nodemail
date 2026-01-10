/**
 * Mailable - Base class for reusable email definitions (Laravel-style)
 */

import type { MailOptions, MailResponse } from '../types';
import type { MailManager } from './MailManager';

export abstract class Mailable {
  protected options: Partial<MailOptions> = {};
  private recipients: string | string[] = [];
  private mailManager?: MailManager;

  /**
   * Build the email message
   * Override this method in your mailable classes
   */
  abstract build(): this;

  /**
   * Set the recipient(s) for this mailable
   */
  to(recipients: string | string[]): this {
    this.recipients = recipients;
    return this;
  }

  /**
   * Set the mail manager instance (internal use)
   */
  setMailManager(manager: MailManager): this {
    this.mailManager = manager;
    return this;
  }

  /**
   * Send the email
   */
  async send(): Promise<MailResponse> {
    if (!this.mailManager) {
      throw new Error('Mail manager not configured. Use Mail.to().send(mailable) or configure mailable with setMailManager()');
    }

    if (!this.recipients || (Array.isArray(this.recipients) && this.recipients.length === 0)) {
      throw new Error('No recipients specified. Use .to() to set recipients.');
    }

    const mailOptions = this.getMailOptions();
    return this.mailManager.send({
      ...mailOptions,
      to: this.recipients,
    } as MailOptions);
  }

  /**
   * Set the from address
   */
  protected from(from: string): this {
    this.options.from = from;
    return this;
  }

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
   * Set CC recipients
   */
  protected cc(cc: string | string[]): this {
    this.options.cc = cc;
    return this;
  }

  /**
   * Set BCC recipients
   */
  protected bcc(bcc: string | string[]): this {
    this.options.bcc = bcc;
    return this;
  }

  /**
   * Set reply-to address
   */
  protected replyTo(replyTo: string): this {
    this.options.replyTo = replyTo;
    return this;
  }

  /**
   * Add an attachment
   */
  protected attach(path: string, filename?: string): this {
    if (!this.options.attachments) {
      this.options.attachments = [];
    }
    this.options.attachments.push({ 
      filename: filename || path.split('/').pop() || 'attachment', 
      path 
    });
    return this;
  }

  /**
   * Set custom headers
   */
  protected withHeaders(headers: Record<string, string>): this {
    this.options.headers = headers;
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

