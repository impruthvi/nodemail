/**
 * AssertableMessage - Wrapper for sent messages with assertion helpers
 * Provides fluent methods to check message properties
 */

import type { MailOptions, MailAddress, Attachment, MailResponse, FailoverDetail } from '../types';
import type { Mailable } from '../core/Mailable';

export class AssertableMessage {
  constructor(
    private readonly options: MailOptions,
    private readonly mailable?: Mailable,
    private readonly response?: MailResponse,
  ) {}

  /**
   * Get the underlying mail options
   */
  getOptions(): MailOptions {
    return this.options;
  }

  /**
   * Get the mailable instance (if any)
   */
  getMailable(): Mailable | undefined {
    return this.mailable;
  }

  /**
   * Check if the message has a specific recipient
   */
  hasTo(email: string): boolean {
    return this.hasRecipient(this.options.to, email);
  }

  /**
   * Check if the message has a specific CC recipient
   */
  hasCc(email: string): boolean {
    if (!this.options.cc) return false;
    return this.hasRecipient(this.options.cc, email);
  }

  /**
   * Check if the message has a specific BCC recipient
   */
  hasBcc(email: string): boolean {
    if (!this.options.bcc) return false;
    return this.hasRecipient(this.options.bcc, email);
  }

  /**
   * Check if the message has a specific from address
   */
  hasFrom(email: string): boolean {
    if (!this.options.from) return false;
    if (typeof this.options.from === 'string') {
      return this.options.from.toLowerCase() === email.toLowerCase();
    }
    return this.options.from.address.toLowerCase() === email.toLowerCase();
  }

  /**
   * Check if the message has a specific subject
   */
  hasSubject(subject: string): boolean {
    return this.options.subject === subject;
  }

  /**
   * Check if the subject contains a string
   */
  subjectContains(text: string): boolean {
    return this.options.subject.toLowerCase().includes(text.toLowerCase());
  }

  /**
   * Check if the message has a specific reply-to address
   */
  hasReplyTo(email: string): boolean {
    if (!this.options.replyTo) return false;
    if (typeof this.options.replyTo === 'string') {
      return this.options.replyTo.toLowerCase() === email.toLowerCase();
    }
    return this.options.replyTo.address.toLowerCase() === email.toLowerCase();
  }

  /**
   * Check if the message has HTML content
   */
  hasHtml(): boolean {
    return !!this.options.html;
  }

  /**
   * Check if the HTML contains a string
   */
  htmlContains(text: string): boolean {
    if (!this.options.html) return false;
    return this.options.html.includes(text);
  }

  /**
   * Check if the message has plain text content
   */
  hasText(): boolean {
    return !!this.options.text;
  }

  /**
   * Check if the plain text contains a string
   */
  textContains(text: string): boolean {
    if (!this.options.text) return false;
    return this.options.text.includes(text);
  }

  /**
   * Check if the message has any attachments
   */
  hasAttachments(): boolean {
    return !!this.options.attachments && this.options.attachments.length > 0;
  }

  /**
   * Check if the message has a specific attachment by filename
   */
  hasAttachment(filename: string): boolean {
    if (!this.options.attachments) return false;
    return this.options.attachments.some(
      (a) => a.filename.toLowerCase() === filename.toLowerCase()
    );
  }

  /**
   * Get all attachments
   */
  getAttachments(): Attachment[] {
    return this.options.attachments || [];
  }

  /**
   * Check if the message has a specific header
   */
  hasHeader(name: string, value?: string): boolean {
    if (!this.options.headers) return false;

    const headerValue = this.options.headers[name];
    if (headerValue === undefined) return false;

    if (value !== undefined) {
      return headerValue === value;
    }

    return true;
  }

  /**
   * Get a header value
   */
  getHeader(name: string): string | undefined {
    return this.options.headers?.[name];
  }

  /**
   * Check if the message uses a specific template
   */
  hasTemplate(template: string): boolean {
    return this.options.template === template;
  }

  /**
   * Check if the message has template data
   */
  hasData(key: string, value?: unknown): boolean {
    if (!this.options.data) return false;

    if (value !== undefined) {
      return this.options.data[key] === value;
    }

    return key in this.options.data;
  }

  /**
   * Get template data value
   */
  getData(key: string): unknown {
    return this.options.data?.[key];
  }

  /**
   * Get all template data
   */
  getAllData(): Record<string, unknown> | undefined {
    return this.options.data;
  }

  /**
   * Get all recipients (to)
   */
  getTo(): string[] {
    return this.normalizeRecipients(this.options.to);
  }

  /**
   * Get all CC recipients
   */
  getCc(): string[] {
    if (!this.options.cc) return [];
    return this.normalizeRecipients(this.options.cc);
  }

  /**
   * Get all BCC recipients
   */
  getBcc(): string[] {
    if (!this.options.bcc) return [];
    return this.normalizeRecipients(this.options.bcc);
  }

  /**
   * Get the subject
   */
  getSubject(): string {
    return this.options.subject;
  }

  /**
   * Get the from address
   */
  getFrom(): string | undefined {
    if (!this.options.from) return undefined;
    if (typeof this.options.from === 'string') return this.options.from;
    return this.options.from.address;
  }

  /**
   * Get the HTML content
   */
  getHtml(): string | undefined {
    return this.options.html;
  }

  /**
   * Get the plain text content
   */
  getText(): string | undefined {
    return this.options.text;
  }

  /**
   * Get the template name
   */
  getTemplate(): string | undefined {
    return this.options.template;
  }

  // ==================== Failover ====================

  /**
   * Check if failover was used for this message
   */
  wasFailoverUsed(): boolean {
    return this.response?.failoverUsed ?? false;
  }

  /**
   * Get the provider that actually sent this message
   */
  getProvider(): string | undefined {
    return this.response?.provider;
  }

  /**
   * Get the failover attempt details
   */
  getFailoverAttempts(): FailoverDetail[] {
    return this.response?.failoverAttempts ?? [];
  }

  /**
   * Get the response associated with this message
   */
  getResponse(): MailResponse | undefined {
    return this.response;
  }

  // ==================== Markdown ====================

  /**
   * Check if the message was built from markdown
   */
  isMarkdown(): boolean {
    return !!this.options.data?.['__markdown'];
  }

  /**
   * Get the raw markdown source
   */
  getMarkdown(): string | undefined {
    return this.options.data?.['__markdown'] as string | undefined;
  }

  /**
   * Check if the markdown source contains a string
   */
  markdownContains(text: string): boolean {
    const markdown = this.getMarkdown();
    if (!markdown) return false;
    return markdown.includes(text);
  }

  /**
   * Helper to check if a recipient is in a list
   */
  private hasRecipient(
    recipients: string | string[] | MailAddress | MailAddress[],
    email: string
  ): boolean {
    const normalizedEmail = email.toLowerCase();
    const recipientList = this.normalizeRecipients(recipients);
    return recipientList.some((r) => r.toLowerCase() === normalizedEmail);
  }

  /**
   * Normalize recipients to string array
   */
  private normalizeRecipients(
    recipients: string | string[] | MailAddress | MailAddress[]
  ): string[] {
    if (typeof recipients === 'string') {
      return [recipients];
    }
    if (Array.isArray(recipients)) {
      return recipients.map((r) => (typeof r === 'string' ? r : r.address));
    }
    return [recipients.address];
  }
}
