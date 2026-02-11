/**
 * MarkdownMailable - Abstract base class for markdown-based emails
 * Extends Mailable with markdown rendering support
 */

import { Mailable } from '../core/Mailable';
import type { MailOptions } from '../types';
import type { MarkdownTheme } from './themes/default';

export abstract class MarkdownMailable extends Mailable {
  /**
   * Set markdown content for the email
   */
  protected markdown(content: string, data?: Record<string, unknown>): this {
    if (!this.options.data) {
      this.options.data = {};
    }
    this.options.data['__markdown'] = content;
    if (data) {
      // Merge user data into options.data alongside __markdown
      Object.assign(this.options.data, data);
    }
    return this;
  }

  /**
   * Set a custom theme for this mailable
   */
  protected theme(theme: MarkdownTheme): this {
    if (!this.options.data) {
      this.options.data = {};
    }
    if (!this.options.data['__markdownRendererOptions']) {
      this.options.data['__markdownRendererOptions'] = {};
    }
    (this.options.data['__markdownRendererOptions'] as Record<string, unknown>)['theme'] = theme;
    return this;
  }

  /**
   * Add custom CSS for this mailable
   */
  protected customCss(css: string): this {
    if (!this.options.data) {
      this.options.data = {};
    }
    if (!this.options.data['__markdownRendererOptions']) {
      this.options.data['__markdownRendererOptions'] = {};
    }
    (this.options.data['__markdownRendererOptions'] as Record<string, unknown>)['customCss'] = css;
    return this;
  }

  /**
   * Get the built mail options
   * Overrides Mailable.getMailOptions() to ensure markdown data is stored
   */
  override getMailOptions(): Partial<MailOptions> {
    this.build();
    return this.options;
  }
}
