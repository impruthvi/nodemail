/**
 * MessageBuilder - Unified fluent interface for building emails.
 * Handles both real sends (via MailManager) and fake mode (via MailFake).
 */

import * as path from 'path';
import type {
  MailOptions,
  MailResponse,
  PreviewResult,
  QueueJobResult,
  Attachment,
} from '../types';
import type { Mailable } from './Mailable';
import type { MailManager } from './MailManager';
import { MailFake } from '../testing/MailFake';

export class MessageBuilder {
  public options: Partial<MailOptions> = {};

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

  attachments(attachments: Attachment[]): this {
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

  embedImage(filePath: string, cid: string, filename?: string): this {
    if (!this.options.attachments) {
      this.options.attachments = [];
    }
    const ext = path.extname(filePath).slice(1).toLowerCase();
    this.options.attachments.push({
      filename: filename || path.basename(filePath),
      path: filePath,
      cid,
      contentType: MessageBuilder.MIME_TYPES[ext] || 'application/octet-stream',
    });
    return this;
  }

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

  priority(level: 'high' | 'normal' | 'low'): this {
    this.options.priority = level;
    return this;
  }

  async send(mailable?: Mailable): Promise<MailResponse> {
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

    const realManager = this.manager;

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

  async preview(): Promise<PreviewResult> {
    if (this.manager instanceof MailFake) {
      return this.manager.preview(this.options as MailOptions);
    }

    const realManager = this.manager;
    return realManager.preview(this.options as MailOptions);
  }

  async queue(mailable?: Mailable): Promise<QueueJobResult> {
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

    const realManager = this.manager;
    const mailOptions = this.getMailOptions(mailable);
    return realManager.queue(mailOptions);
  }

  /**
   * Queue the email with a delay (in seconds)
   */
  async later(delaySeconds: number, mailable?: Mailable): Promise<QueueJobResult> {
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

    const realManager = this.manager;
    const mailOptions = this.getMailOptions(mailable);
    return realManager.later(mailOptions, delaySeconds);
  }

  /**
   * Schedule the email for a specific time
   */
  async at(date: Date, mailable?: Mailable): Promise<QueueJobResult> {
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

    const realManager = this.manager;
    const mailOptions = this.getMailOptions(mailable);
    return realManager.at(mailOptions, date);
  }

  /**
   * Get mail options from builder or mailable
   */
  private getMailOptions(mailable?: Mailable): MailOptions {
    if (mailable) {
      if (!(this.manager instanceof MailFake)) {
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
