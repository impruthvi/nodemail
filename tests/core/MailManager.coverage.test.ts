/**
 * MailManager Coverage Tests - Additional tests for branch coverage
 * Focusing on preprocess() and other uncovered branches
 */

import { MailManager } from '../../src/core/MailManager';
import type { MailConfig, MailOptions } from '../../src/types';

// Mock provider
jest.mock('../../src/providers/SmtpProvider', () => ({
  SmtpProvider: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  })),
}));

describe('MailManager - Coverage Tests', () => {
  describe('preprocess - markdown rendering', () => {
    it('should render markdown with global theme config', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
        markdown: {
          theme: {
            css: 'body { color: blue; }',
            headerHtml: '<header>Header</header>',
            footerHtml: '<footer>Footer</footer>',
          },
          customCss: '.custom { color: red; }',
        },
      };

      const manager = new MailManager(config);
      const options: MailOptions = {
        to: 'user@test.com',
        subject: 'Markdown Test',
        data: {
          __markdown: '# Hello World',
        },
      };

      const preview = await manager.preview(options);

      expect(preview.html).toContain('Hello World');
    });

    it('should render markdown with mailable-level theme override', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
      };

      const manager = new MailManager(config);
      const options: MailOptions = {
        to: 'user@test.com',
        subject: 'Markdown Override Test',
        data: {
          __markdown: '# Hello',
          __markdownRendererOptions: {
            theme: { css: 'body { color: green; }' },
            customCss: '.override { color: purple; }',
          },
        },
      };

      const preview = await manager.preview(options);

      expect(preview.html).toContain('Hello');
    });

    it('should render markdown with user data variables', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
      };

      const manager = new MailManager(config);
      const options: MailOptions = {
        to: 'user@test.com',
        subject: 'Markdown with Data',
        data: {
          __markdown: '# Hello {{ name }}',
          name: 'John',
          email: 'john@example.com',
        },
      };

      const preview = await manager.preview(options);

      expect(preview.html).toBeDefined();
    });

    it('should not override existing html/text when rendering markdown', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
      };

      const manager = new MailManager(config);
      const options: MailOptions = {
        to: 'user@test.com',
        subject: 'Existing Content',
        html: '<p>Existing HTML</p>',
        text: 'Existing text',
        data: {
          __markdown: '# Should not override',
        },
      };

      const preview = await manager.preview(options);

      expect(preview.html).toBe('<p>Existing HTML</p>');
      expect(preview.text).toBe('Existing text');
    });
  });

  describe('preprocess - priority headers', () => {
    it('should add high priority headers', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
      };

      const manager = new MailManager(config);
      const options: MailOptions = {
        to: 'user@test.com',
        subject: 'High Priority',
        html: '<p>Urgent</p>',
        priority: 'high',
      };

      const preview = await manager.preview(options);

      expect(preview.headers).toMatchObject({
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        Importance: 'high',
      });
    });

    it('should add normal priority headers', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
      };

      const manager = new MailManager(config);
      const options: MailOptions = {
        to: 'user@test.com',
        subject: 'Normal Priority',
        html: '<p>Normal</p>',
        priority: 'normal',
      };

      const preview = await manager.preview(options);

      expect(preview.headers).toMatchObject({
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        Importance: 'normal',
      });
    });

    it('should add low priority headers', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
      };

      const manager = new MailManager(config);
      const options: MailOptions = {
        to: 'user@test.com',
        subject: 'Low Priority',
        html: '<p>Low</p>',
        priority: 'low',
      };

      const preview = await manager.preview(options);

      expect(preview.headers).toMatchObject({
        'X-Priority': '5',
        'X-MSMail-Priority': 'Low',
        Importance: 'low',
      });
    });

    it('should preserve existing headers when adding priority', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
      };

      const manager = new MailManager(config);
      const options: MailOptions = {
        to: 'user@test.com',
        subject: 'With Headers',
        html: '<p>Test</p>',
        priority: 'high',
        headers: {
          'X-Custom': 'value',
        },
      };

      const preview = await manager.preview(options);

      expect(preview.headers).toMatchObject({
        'X-Priority': '1',
        'X-Custom': 'value',
      });
    });
  });

  describe('getProvider errors', () => {
    it('should throw error for unconfigured mailer', () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
      };

      const manager = new MailManager(config);

      expect(() => manager.mailer('nonexistent')).toThrow("Mailer 'nonexistent' is not configured");
    });
  });

  describe('createProvider for different drivers', () => {
    it('should throw error for unsupported driver', async () => {
      const config: MailConfig = {
        default: 'invalid',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          invalid: {
            driver: 'unsupported' as 'smtp',
            host: 'localhost',
            port: 587,
          },
        },
      };

      const manager = new MailManager(config);

      await expect(
        manager.send({
          to: 'user@test.com',
          subject: 'Test',
          html: '<p>Test</p>',
        })
      ).rejects.toThrow('Unsupported mail driver: unsupported');
    });
  });

  describe('queue without configuration', () => {
    it('should throw error when queue not configured', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
        // No queue config
      };

      const manager = new MailManager(config);

      await expect(
        manager.queue({
          to: 'user@test.com',
          subject: 'Test',
          html: '<p>Test</p>',
        })
      ).rejects.toThrow('Queue not configured');
    });

    it('should throw error when calling later() without queue config', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
      };

      const manager = new MailManager(config);

      await expect(
        manager.later(
          {
            to: 'user@test.com',
            subject: 'Test',
            html: '<p>Test</p>',
          },
          60
        )
      ).rejects.toThrow('Queue not configured');
    });

    it('should throw error when calling at() without queue config', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
      };

      const manager = new MailManager(config);

      await expect(
        manager.at(
          {
            to: 'user@test.com',
            subject: 'Test',
            html: '<p>Test</p>',
          },
          new Date()
        )
      ).rejects.toThrow('Queue not configured');
    });

    it('should throw error when calling processQueue() without queue config', async () => {
      const config: MailConfig = {
        default: 'smtp',
        from: { address: 'noreply@test.com', name: 'Test' },
        mailers: {
          smtp: {
            driver: 'smtp',
            host: 'localhost',
            port: 587,
            auth: { user: 'test', pass: 'pass' },
          },
        },
      };

      const manager = new MailManager(config);

      await expect(manager.processQueue()).rejects.toThrow('Queue not configured');
    });
  });

  describe('MessageBuilder methods', () => {
    const config: MailConfig = {
      default: 'smtp',
      from: { address: 'noreply@test.com', name: 'Test' },
      mailers: {
        smtp: {
          driver: 'smtp',
          host: 'localhost',
          port: 587,
          auth: { user: 'test', pass: 'pass' },
        },
      },
    };

    it('should build message with all fluent methods', async () => {
      const manager = new MailManager(config);

      const result = await manager
        .to('user@test.com')
        .from('sender@test.com')
        .subject('Full Test')
        .html('<p>HTML</p>')
        .text('Text')
        .cc('cc@test.com')
        .bcc('bcc@test.com')
        .replyTo('reply@test.com')
        .headers({ 'X-Custom': 'value' })
        .attachments([{ filename: 'test.txt', content: 'data' }])
        .priority('high')
        .send();

      expect(result.success).toBe(true);
    });

    it('should throw error when sending without subject', async () => {
      const manager = new MailManager(config);

      await expect(manager.to('user@test.com').html('<p>No subject</p>').send()).rejects.toThrow(
        'Email subject is required'
      );
    });
  });
});
