import { MarkdownRenderer } from '../../src/markdown/MarkdownRenderer';
import { getDefaultTheme } from '../../src/markdown/themes/default';
import type { MarkdownTheme } from '../../src/markdown/themes/default';

// Mock marked
jest.mock('marked', () => ({
  parse: jest.fn((content: string) => {
    // Simple markdown-to-HTML conversion for testing
    let html = content;
    // Headings
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // Paragraphs (simplified)
    html = html.replace(/^(?!<[huda]|<div|<\/div)(.+)$/gm, '<p>$1</p>');
    return Promise.resolve(html);
  }),
}), { virtual: true });

// Mock juice
jest.mock('juice', () => ({
  inlineContent: jest.fn((html: string, _css: string, _options?: Record<string, unknown>) => {
    // Return HTML as-is for testing (real juice would inline CSS)
    return html;
  }),
}), { virtual: true });

describe('MarkdownRenderer', () => {
  describe('constructor', () => {
    it('should create renderer with default options', () => {
      const renderer = new MarkdownRenderer();
      expect(renderer).toBeInstanceOf(MarkdownRenderer);
    });

    it('should create renderer with custom theme', () => {
      const customTheme: MarkdownTheme = {
        css: 'body { color: red; }',
        headerHtml: '<h1>Header</h1>',
        footerHtml: '<p>Footer</p>',
      };
      const renderer = new MarkdownRenderer({ theme: customTheme });
      expect(renderer.getTheme()).toBe(customTheme);
    });

    it('should create renderer with custom CSS', () => {
      const renderer = new MarkdownRenderer({ customCss: '.custom { color: blue; }' });
      expect(renderer).toBeInstanceOf(MarkdownRenderer);
    });

    it('should create renderer with juice options', () => {
      const renderer = new MarkdownRenderer({
        juiceOptions: { preserveMediaQueries: true },
      });
      expect(renderer).toBeInstanceOf(MarkdownRenderer);
    });
  });

  describe('render', () => {
    it('should render basic markdown to HTML', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render('# Hello World');

      expect(result.html).toContain('<h1>Hello World</h1>');
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('email-wrapper');
    });

    it('should generate plain text version', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render('# Hello World\n\nThis is a **test**.');

      expect(result.text).toContain('Hello World');
      expect(result.text).toContain('This is a test.');
      expect(result.text).not.toContain('#');
      expect(result.text).not.toContain('**');
    });

    it('should interpolate data placeholders', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render('Hello {{name}}!', { name: 'John' });

      expect(result.html).toContain('Hello John!');
      expect(result.text).toContain('Hello John!');
    });

    it('should preserve unmatched placeholders', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render('Hello {{name}}, age: {{age}}', { name: 'John' });

      expect(result.html).toContain('Hello John');
      expect(result.html).toContain('{{age}}');
    });

    it('should render without data', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render('Simple text');

      expect(result.html).toContain('Simple text');
      expect(result.text).toBe('Simple text');
    });

    it('should wrap content in email layout', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render('Test content');

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<meta charset="utf-8">');
      expect(result.html).toContain('class="email-wrapper"');
      expect(result.html).toContain('class="email-body"');
      expect(result.html).toContain('class="email-body-inner"');
    });

    it('should call juice.inlineContent with CSS', async () => {
      const juice = require('juice');
      const renderer = new MarkdownRenderer();
      await renderer.render('Test');

      expect(juice.inlineContent).toHaveBeenCalled();
      const callArgs = (juice.inlineContent as jest.Mock).mock.calls;
      const lastCall = callArgs[callArgs.length - 1];
      expect(lastCall[1]).toContain('body {');
    });

    it('should include custom CSS in inlining', async () => {
      const juice = require('juice');
      const renderer = new MarkdownRenderer({ customCss: '.custom { color: red; }' });
      await renderer.render('Test');

      const callArgs = (juice.inlineContent as jest.Mock).mock.calls;
      const lastCall = callArgs[callArgs.length - 1];
      expect(lastCall[1]).toContain('.custom { color: red; }');
    });
  });

  describe('components', () => {
    describe('button', () => {
      it('should render button with default primary color', async () => {
        const renderer = new MarkdownRenderer();
        const result = await renderer.render(
          '[button url="https://example.com"]Click Here[/button]'
        );

        expect(result.html).toContain('href="https://example.com"');
        expect(result.html).toContain('class="button button-primary"');
        expect(result.html).toContain('Click Here');
      });

      it('should render button with primary color', async () => {
        const renderer = new MarkdownRenderer();
        const result = await renderer.render(
          '[button url="https://example.com" color="primary"]Click[/button]'
        );

        expect(result.html).toContain('button-primary');
      });

      it('should render button with success color', async () => {
        const renderer = new MarkdownRenderer();
        const result = await renderer.render(
          '[button url="https://example.com" color="success"]Confirm[/button]'
        );

        expect(result.html).toContain('button-success');
        expect(result.html).toContain('Confirm');
      });

      it('should render button with error color', async () => {
        const renderer = new MarkdownRenderer();
        const result = await renderer.render(
          '[button url="https://example.com" color="error"]Delete[/button]'
        );

        expect(result.html).toContain('button-error');
        expect(result.html).toContain('Delete');
      });

      it('should generate plain text for buttons with URL', async () => {
        const renderer = new MarkdownRenderer();
        const result = await renderer.render(
          '[button url="https://example.com"]Click Here[/button]'
        );

        expect(result.text).toContain('Click Here (https://example.com)');
      });
    });

    describe('panel', () => {
      it('should render panel component', async () => {
        const renderer = new MarkdownRenderer();
        const result = await renderer.render(
          '[panel]Important notice here[/panel]'
        );

        expect(result.html).toContain('class="panel"');
        expect(result.html).toContain('Important notice here');
      });

      it('should generate plain text for panels', async () => {
        const renderer = new MarkdownRenderer();
        const result = await renderer.render(
          '[panel]Notice content[/panel]'
        );

        expect(result.text).toContain('Notice content');
        expect(result.text).not.toContain('[panel]');
      });
    });

    describe('table', () => {
      it('should render table wrapper', async () => {
        const renderer = new MarkdownRenderer();
        const tableContent = '| Name | Age |\n|------|-----|\n| John | 30 |';
        const result = await renderer.render(`[table]${tableContent}[/table]`);

        expect(result.html).toContain('class="table-wrapper"');
        expect(result.html).toContain('Name');
      });

      it('should generate plain text for tables', async () => {
        const renderer = new MarkdownRenderer();
        const result = await renderer.render(
          '[table]| Name | Age |\n|------|-----|\n| John | 30 |[/table]'
        );

        expect(result.text).toContain('Name');
        expect(result.text).not.toContain('[table]');
      });
    });

    it('should handle multiple components in one message', async () => {
      const renderer = new MarkdownRenderer();
      const markdown = `# Welcome

[panel]Please verify your email.[/panel]

[button url="https://example.com/verify" color="success"]Verify Email[/button]

[table]| Feature | Status |
|---------|--------|
| Email | Active |[/table]`;

      const result = await renderer.render(markdown);

      expect(result.html).toContain('class="panel"');
      expect(result.html).toContain('button-success');
      expect(result.html).toContain('class="table-wrapper"');
    });

    it('should handle components with nested markdown content', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render(
        '[panel]This is **important** info[/panel]'
      );

      expect(result.html).toContain('class="panel"');
      expect(result.html).toContain('<strong>important</strong>');
    });
  });

  describe('themes', () => {
    it('should use default theme by default', () => {
      const renderer = new MarkdownRenderer();
      const theme = renderer.getTheme();
      expect(theme.css).toContain('body {');
      expect(theme.css).toContain('.button-primary');
    });

    it('should apply custom theme', () => {
      const customTheme: MarkdownTheme = {
        css: '.custom { color: red; }',
      };
      const renderer = new MarkdownRenderer({ theme: customTheme });
      expect(renderer.getTheme().css).toBe('.custom { color: red; }');
    });

    it('should set theme at runtime', () => {
      const renderer = new MarkdownRenderer();
      const newTheme: MarkdownTheme = {
        css: '.new { color: green; }',
      };
      renderer.setTheme(newTheme);
      expect(renderer.getTheme().css).toBe('.new { color: green; }');
    });

    it('should include header HTML when provided', async () => {
      const renderer = new MarkdownRenderer({
        theme: {
          css: 'body {}',
          headerHtml: '<img src="logo.png" alt="Logo">',
        },
      });
      const result = await renderer.render('Test');

      expect(result.html).toContain('class="email-header"');
      expect(result.html).toContain('logo.png');
    });

    it('should include footer HTML when provided', async () => {
      const renderer = new MarkdownRenderer({
        theme: {
          css: 'body {}',
          footerHtml: '<p>Copyright 2026</p>',
        },
      });
      const result = await renderer.render('Test');

      expect(result.html).toContain('class="email-footer"');
      expect(result.html).toContain('Copyright 2026');
    });

    it('should not include header/footer when not provided', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render('Test');

      expect(result.html).not.toContain('class="email-header"');
      expect(result.html).not.toContain('class="email-footer"');
    });
  });

  describe('getDefaultTheme', () => {
    it('should return a valid theme', () => {
      const theme = getDefaultTheme();
      expect(theme).toHaveProperty('css');
      expect(theme.css).toContain('.button-primary');
      expect(theme.css).toContain('.button-success');
      expect(theme.css).toContain('.button-error');
      expect(theme.css).toContain('.panel');
      expect(theme.css).toContain('.table-wrapper');
    });

    it('should not include header/footer by default', () => {
      const theme = getDefaultTheme();
      expect(theme.headerHtml).toBeUndefined();
      expect(theme.footerHtml).toBeUndefined();
    });
  });

  describe('plain text generation', () => {
    it('should strip heading markers', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render('# Heading\n## Sub\n### Sub2');
      expect(result.text).not.toContain('#');
      expect(result.text).toContain('Heading');
    });

    it('should strip bold markers', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render('This is **bold** text');
      expect(result.text).toBe('This is bold text');
    });

    it('should strip italic markers', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render('This is *italic* text');
      expect(result.text).toBe('This is italic text');
    });

    it('should convert links to text with URL', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render('Visit [our site](https://example.com)');
      expect(result.text).toContain('our site (https://example.com)');
    });

    it('should strip inline code markers', async () => {
      const renderer = new MarkdownRenderer();
      const result = await renderer.render('Use `console.log` for debugging');
      expect(result.text).toBe('Use console.log for debugging');
    });
  });
});
