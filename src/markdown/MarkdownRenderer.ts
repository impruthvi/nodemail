/**
 * MarkdownRenderer - Core rendering engine for Markdown Mail
 * Converts Markdown to responsive, CSS-inlined HTML emails
 */

import { getDefaultTheme } from './themes/default';
import type { MarkdownTheme } from './themes/default';

export interface MarkdownRendererOptions {
  theme?: MarkdownTheme;
  customCss?: string;
  juiceOptions?: Record<string, unknown>;
}

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
export class MarkdownRenderer {
  private marked: any;
  private juice: any;
  private theme: MarkdownTheme;
  private customCss: string;
  private juiceOptions: Record<string, unknown>;

  constructor(options: MarkdownRendererOptions = {}) {
    this.theme = options.theme || getDefaultTheme();
    this.customCss = options.customCss || '';
    this.juiceOptions = options.juiceOptions || {};
    this.loadDependencies();
  }

  private loadDependencies(): void {
    try {
      this.marked = require('marked');
    } catch {
      throw new Error(
        'marked is not installed. Please install it: npm install marked'
      );
    }

    try {
      this.juice = require('juice');
    } catch {
      throw new Error(
        'juice is not installed. Please install it: npm install juice'
      );
    }
  }

  /**
   * Render markdown to HTML and plain text
   */
  async render(
    markdown: string,
    data?: Record<string, unknown>
  ): Promise<{ html: string; text: string }> {
    let content = markdown;

    // 1. Interpolate data placeholders
    if (data) {
      content = this.interpolate(content, data);
    }

    // 2. Process component syntax
    content = this.processComponents(content);

    // 3. Convert markdown to HTML
    const htmlContent = await this.marked.parse(content);

    // 4. Wrap in email layout
    const fullHtml = this.wrapInLayout(htmlContent as string);

    // 5. Inline CSS
    const css = this.theme.css + (this.customCss ? '\n' + this.customCss : '');
    const inlinedHtml = this.juice.inlineContent(fullHtml, css, this.juiceOptions) as string;

    // 6. Generate plain text
    const text = this.generatePlainText(markdown, data);

    return { html: inlinedHtml, text };
  }

  /**
   * Interpolate {{key}} placeholders with data values
   */
  private interpolate(
    content: string,
    data: Record<string, unknown>
  ): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      if (data[key] !== undefined) {
        const val = data[key];
        return typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val as string | number | boolean);
      }
      return `{{${key}}}`;
    });
  }

  /**
   * Process custom component syntax
   */
  private processComponents(content: string): string {
    // Process buttons: [button url="..." color="..."]Label[/button]
    content = content.replace(
      /\[button\s+url="([^"]+)"(?:\s+color="([^"]*)")?\]([\s\S]*?)\[\/button\]/g,
      (_match, url: string, color: string | undefined, label: string) => {
        const colorClass = `button-${color || 'primary'}`;
        return `<a href="${url}" class="button ${colorClass}">${label.trim()}</a>`;
      }
    );

    // Process panels: [panel]Content[/panel]
    content = content.replace(
      /\[panel\]([\s\S]*?)\[\/panel\]/g,
      (_match, inner: string) => {
        return `<div class="panel">\n\n${inner.trim()}\n\n</div>`;
      }
    );

    // Process tables: [table]| md table |[/table]
    content = content.replace(
      /\[table\]([\s\S]*?)\[\/table\]/g,
      (_match, inner: string) => {
        return `<div class="table-wrapper">\n\n${inner.trim()}\n\n</div>`;
      }
    );

    return content;
  }

  /**
   * Wrap HTML content in a responsive email layout
   */
  private wrapInLayout(htmlContent: string): string {
    const header = this.theme.headerHtml
      ? `<div class="email-header">${this.theme.headerHtml}</div>`
      : '';
    const footer = this.theme.footerHtml
      ? `<div class="email-footer">${this.theme.footerHtml}</div>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
<div class="email-wrapper">
<div class="email-content">
${header}
<div class="email-body">
<div class="email-body-inner">
${htmlContent}
</div>
</div>
${footer}
</div>
</div>
</body>
</html>`;
  }

  /**
   * Generate plain text version by stripping markdown and component syntax
   */
  private generatePlainText(
    markdown: string,
    data?: Record<string, unknown>
  ): string {
    let text = markdown;

    // Interpolate data
    if (data) {
      text = this.interpolate(text, data);
    }

    // Strip button syntax, keep label
    text = text.replace(
      /\[button\s+url="([^"]+)"(?:\s+color="[^"]*")?\]([\s\S]*?)\[\/button\]/g,
      (_match, url: string, label: string) => `${label.trim()} (${url})`
    );

    // Strip panel syntax, keep content
    text = text.replace(/\[panel\]([\s\S]*?)\[\/panel\]/g, (_match, inner: string) => inner.trim());

    // Strip table syntax, keep content
    text = text.replace(/\[table\]([\s\S]*?)\[\/table\]/g, (_match, inner: string) => inner.trim());

    // Strip markdown formatting
    text = text.replace(/#{1,6}\s+/g, ''); // headings
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1'); // bold
    text = text.replace(/\*([^*]+)\*/g, '$1'); // italic
    text = text.replace(/`([^`]+)`/g, '$1'); // inline code
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)'); // links
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1'); // images
    text = text.replace(/^---+$/gm, '---'); // horizontal rules
    text = text.replace(/^>\s*/gm, ''); // blockquotes

    // Collapse multiple blank lines
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  }

  /**
   * Set the theme at runtime
   */
  setTheme(theme: MarkdownTheme): void {
    this.theme = theme;
  }

  /**
   * Get the current theme
   */
  getTheme(): MarkdownTheme {
    return this.theme;
  }
}
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
