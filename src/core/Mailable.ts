/**
 * Mailable - Base class for reusable email definitions (Laravel-style)
 */

import * as path from 'path';
import type { MailOptions, MailResponse, PreviewResult } from '../types';
import type { MailManager } from './MailManager';
import { ConfigurationError, ValidationError } from '../errors';

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
      throw new ConfigurationError('Mail manager not configured. Use Mail.to().send(mailable) or configure mailable with setMailManager()');
    }

    if (!this.recipients || (Array.isArray(this.recipients) && this.recipients.length === 0)) {
      throw new ValidationError('No recipients specified. Use .to() to set recipients.', 'to');
    }

    const mailOptions = this.getMailOptions();
    return this.mailManager.send({
      ...mailOptions,
      to: this.recipients,
    } as MailOptions);
  }

  /**
   * Preview the email without sending it
   */
  async preview(): Promise<PreviewResult> {
    if (!this.mailManager) {
      throw new ConfigurationError('Mail manager not configured. Use Mail.preview(mailable) or configure mailable with setMailManager()');
    }

    const mailOptions = this.getMailOptions();
    const to = this.recipients && (!Array.isArray(this.recipients) || this.recipients.length > 0)
      ? this.recipients
      : mailOptions.to || '';

    return this.mailManager.preview({
      ...mailOptions,
      to,
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

  private static readonly MIME_TYPES: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
  };

  /**
   * Embed an image from a file path for inline use in HTML via CID
   */
  protected embedImage(filePath: string, cid: string, filename?: string): this {
    if (!this.options.attachments) {
      this.options.attachments = [];
    }
    const ext = path.extname(filePath).slice(1).toLowerCase();
    this.options.attachments.push({
      filename: filename || path.basename(filePath),
      path: filePath,
      cid,
      contentType: Mailable.MIME_TYPES[ext] || 'application/octet-stream',
    });
    return this;
  }

  /**
   * Embed an image from buffer/string data for inline use in HTML via CID
   */
  protected embedImageData(content: Buffer | string, cid: string, contentType: string, filename?: string): this {
    if (!this.options.attachments) {
      this.options.attachments = [];
    }
    this.options.attachments.push({
      filename: filename || `${cid}.${contentType.split('/')[1] || 'bin'}`,
      content,
      cid,
      contentType,
    });
    return this;
  }

  /**
   * Set the email priority level
   */
  protected priority(level: 'high' | 'normal' | 'low'): this {
    this.options.priority = level;
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

