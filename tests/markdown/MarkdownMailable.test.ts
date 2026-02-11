/**
 * Tests for MarkdownMailable and integration with MailFake
 */

import { Mail, MarkdownMailable } from '../../src';
import type { MarkdownTheme } from '../../src/markdown/themes/default';

// Mock marked and juice for MailManager markdown rendering
jest.mock('marked', () => ({
  parse: jest.fn((content: string) => {
    let html = content;
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^(?!<[h]|<div|<\/div|<a )(.+)$/gm, '<p>$1</p>');
    return Promise.resolve(html);
  }),
}), { virtual: true });

jest.mock('juice', () => ({
  inlineContent: jest.fn((html: string) => html),
}), { virtual: true });

// Test MarkdownMailable subclass
class WelcomeMarkdownEmail extends MarkdownMailable {
  constructor(
    public userName: string,
    public appName: string
  ) {
    super();
  }

  build(): this {
    return this
      .subject(`Welcome to ${this.appName}!`)
      .from('noreply@example.com')
      .markdown(`# Welcome, {{name}}!

Thank you for joining **{{appName}}**.

[button url="https://example.com/start" color="primary"]Get Started[/button]

[panel]If you need help, contact support@example.com[/panel]`, {
        name: this.userName,
        appName: this.appName,
      });
  }
}

class SimpleMarkdownEmail extends MarkdownMailable {
  build(): this {
    return this
      .subject('Simple Test')
      .markdown('# Hello\n\nThis is simple.');
  }
}

class ThemedMarkdownEmail extends MarkdownMailable {
  constructor(private customTheme: MarkdownTheme) {
    super();
  }

  build(): this {
    return this
      .subject('Themed Email')
      .markdown('# Themed\n\nWith custom theme.')
      .theme(this.customTheme);
  }
}

class CustomCssMarkdownEmail extends MarkdownMailable {
  build(): this {
    return this
      .subject('Custom CSS')
      .markdown('# Styled\n\nWith extra CSS.')
      .customCss('.extra { color: red; }');
  }
}

class MarkdownWithAttachment extends MarkdownMailable {
  build(): this {
    return this
      .subject('With Attachment')
      .markdown('# Report\n\nSee attached.')
      .attach('/path/to/file.pdf', 'report.pdf');
  }
}

describe('MarkdownMailable', () => {
  describe('build pattern', () => {
    it('should store markdown content in options.data.__markdown', () => {
      const email = new SimpleMarkdownEmail();
      const options = email.getMailOptions();

      expect(options.data?.__markdown).toBe('# Hello\n\nThis is simple.');
    });

    it('should store markdown with data', () => {
      const email = new WelcomeMarkdownEmail('John', 'MyApp');
      const options = email.getMailOptions();

      expect(options.data?.__markdown).toContain('Welcome, {{name}}!');
      expect(options.data?.name).toBe('John');
      expect(options.data?.appName).toBe('MyApp');
    });

    it('should set subject correctly', () => {
      const email = new WelcomeMarkdownEmail('John', 'MyApp');
      const options = email.getMailOptions();

      expect(options.subject).toBe('Welcome to MyApp!');
    });

    it('should set from address', () => {
      const email = new WelcomeMarkdownEmail('John', 'MyApp');
      const options = email.getMailOptions();

      expect(options.from).toBe('noreply@example.com');
    });

    it('should support theme override', () => {
      const theme: MarkdownTheme = { css: '.custom {}' };
      const email = new ThemedMarkdownEmail(theme);
      const options = email.getMailOptions();

      const rendererOpts = options.data?.__markdownRendererOptions as Record<string, unknown>;
      expect(rendererOpts?.theme).toBe(theme);
    });

    it('should support customCss', () => {
      const email = new CustomCssMarkdownEmail();
      const options = email.getMailOptions();

      const rendererOpts = options.data?.__markdownRendererOptions as Record<string, unknown>;
      expect(rendererOpts?.customCss).toBe('.extra { color: red; }');
    });

    it('should work with attachments', () => {
      const email = new MarkdownWithAttachment();
      const options = email.getMailOptions();

      expect(options.data?.__markdown).toContain('# Report');
      expect(options.attachments).toHaveLength(1);
      expect(options.attachments![0].filename).toBe('report.pdf');
    });
  });

  describe('getMailOptions', () => {
    it('should preserve all data alongside __markdown', () => {
      const email = new WelcomeMarkdownEmail('Alice', 'TestApp');
      const options = email.getMailOptions();

      expect(options.data?.__markdown).toBeDefined();
      expect(options.data?.name).toBe('Alice');
      expect(options.data?.appName).toBe('TestApp');
    });
  });
});

describe('MarkdownMailable with MailFake', () => {
  beforeEach(() => {
    Mail.restore();
    Mail.fake();
  });

  afterEach(() => {
    Mail.restore();
  });

  it('should send markdown mailable via Mail.fake()', async () => {
    await Mail.to('user@example.com').send(new WelcomeMarkdownEmail('John', 'MyApp'));

    Mail.assertSent(WelcomeMarkdownEmail);
  });

  it('should assert sent with callback', async () => {
    await Mail.to('user@example.com').send(new WelcomeMarkdownEmail('John', 'MyApp'));

    Mail.assertSent(WelcomeMarkdownEmail, (mail) => {
      return mail.hasTo('user@example.com') && mail.subjectContains('Welcome');
    });
  });

  it('should allow isMarkdown() assertion on sent message', async () => {
    await Mail.to('user@example.com').send(new SimpleMarkdownEmail());

    const sent = Mail.sent(SimpleMarkdownEmail);
    expect(sent).toHaveLength(1);
    expect(sent[0].isMarkdown()).toBe(true);
  });

  it('should allow getMarkdown() on sent message', async () => {
    await Mail.to('user@example.com').send(new SimpleMarkdownEmail());

    const sent = Mail.sent(SimpleMarkdownEmail)[0];
    expect(sent.getMarkdown()).toBe('# Hello\n\nThis is simple.');
  });

  it('should allow markdownContains() on sent message', async () => {
    await Mail.to('user@example.com').send(
      new WelcomeMarkdownEmail('John', 'MyApp')
    );

    const sent = Mail.sent(WelcomeMarkdownEmail)[0];
    expect(sent.markdownContains('Welcome')).toBe(true);
    expect(sent.markdownContains('[button')).toBe(true);
    expect(sent.markdownContains('nonexistent')).toBe(false);
  });

  it('should return false for isMarkdown() on non-markdown message', async () => {
    const { Mailable } = require('../../src');

    class PlainEmail extends Mailable {
      build() {
        return this.subject('Plain').html('<p>Plain HTML</p>');
      }
    }

    await Mail.to('user@example.com').send(new PlainEmail());

    const sent = Mail.sent()[0];
    expect(sent.isMarkdown()).toBe(false);
    expect(sent.getMarkdown()).toBeUndefined();
    expect(sent.markdownContains('anything')).toBe(false);
  });

  it('should work with cc and bcc', async () => {
    class MarkdownWithCc extends MarkdownMailable {
      build(): this {
        return this
          .subject('CC Test')
          .markdown('# CC Test')
          .cc('admin@example.com')
          .bcc('archive@example.com');
      }
    }

    await Mail.to('user@example.com').send(new MarkdownWithCc());

    const sent = Mail.sent()[0];
    expect(sent.hasCc('admin@example.com')).toBe(true);
    expect(sent.hasBcc('archive@example.com')).toBe(true);
    expect(sent.isMarkdown()).toBe(true);
  });
});
