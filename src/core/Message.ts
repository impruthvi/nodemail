/**
 * Message - Email message builder with fluent API
 */

import * as path from 'path';
import type { MailOptions, MailAddress, Attachment } from '../types';

export class Message {
  private options: Partial<MailOptions> = {};

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
   * Set the recipient(s)
   */
  to(address: string | string[] | MailAddress | MailAddress[]): this {
    this.options.to = address;
    return this;
  }

  /**
   * Set the sender
   */
  from(address: string | MailAddress): this {
    this.options.from = address;
    return this;
  }

  /**
   * Set the email subject
   */
  subject(subject: string): this {
    this.options.subject = subject;
    return this;
  }

  /**
   * Set HTML content
   */
  html(html: string): this {
    this.options.html = html;
    return this;
  }

  /**
   * Set plain text content
   */
  text(text: string): this {
    this.options.text = text;
    return this;
  }

  /**
   * Add CC recipients
   */
  cc(address: string | string[] | MailAddress | MailAddress[]): this {
    this.options.cc = address;
    return this;
  }

  /**
   * Add BCC recipients
   */
  bcc(address: string | string[] | MailAddress | MailAddress[]): this {
    this.options.bcc = address;
    return this;
  }

  /**
   * Set reply-to address
   */
  replyTo(address: string | MailAddress): this {
    this.options.replyTo = address;
    return this;
  }

  /**
   * Add an attachment
   */
  attach(attachment: Attachment): this {
    if (!this.options.attachments) {
      this.options.attachments = [];
    }
    this.options.attachments.push(attachment);
    return this;
  }

  /**
   * Add a custom header
   */
  header(name: string, value: string): this {
    if (!this.options.headers) {
      this.options.headers = {};
    }
    this.options.headers[name] = value;
    return this;
  }

  /**
   * Set the email priority level
   */
  priority(level: 'high' | 'normal' | 'low'): this {
    this.options.priority = level;
    return this;
  }

  /**
   * Set template and data
   */
  template(name: string, data: Record<string, unknown>): this {
    this.options.template = name;
    this.options.data = data;
    return this;
  }

  /**
   * Embed an image from a file path for inline use in HTML via CID
   */
  embedImage(filePath: string, cid: string, filename?: string): this {
    if (!this.options.attachments) {
      this.options.attachments = [];
    }
    const ext = path.extname(filePath).slice(1).toLowerCase();
    this.options.attachments.push({
      filename: filename || path.basename(filePath),
      path: filePath,
      cid,
      contentType: Message.MIME_TYPES[ext] || 'application/octet-stream',
    });
    return this;
  }

  /**
   * Embed an image from buffer/string data for inline use in HTML via CID
   */
  embedImageData(content: Buffer | string, cid: string, contentType: string, filename?: string): this {
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
   * Get the built message options
   */
  toOptions(): Partial<MailOptions> {
    return this.options;
  }
}
