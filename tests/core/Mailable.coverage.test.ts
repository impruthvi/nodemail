/**
 * Mailable Coverage Tests - Additional tests for branch coverage
 */

import { Mailable } from '../../src/core/Mailable';
import { MailManager } from '../../src/core/MailManager';
import type { MailConfig } from '../../src/types';

// Mock provider
jest.mock('../../src/providers/SmtpProvider', () => ({
  SmtpProvider: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  })),
}));

class TestMailable extends Mailable {
  build(): this {
    return this.subject('Test Subject').html('<p>Hello</p>').text('Hello');
  }
}

class FullFeaturedMailable extends Mailable {
  build(): this {
    return this.from('sender@test.com')
      .subject('Full Featured')
      .html('<p>Hello</p>')
      .text('Hello')
      .cc('cc@test.com')
      .bcc('bcc@test.com')
      .replyTo('reply@test.com')
      .withHeaders({ 'X-Custom': 'value' })
      .priority('high');
  }
}

class ViewMailable extends Mailable {
  build(): this {
    return this.subject('View Test').view('welcome', { name: 'Test User' });
  }
}

class ViewMailableNoData extends Mailable {
  build(): this {
    return this.subject('View No Data').view('welcome');
  }
}

class AttachmentMailable extends Mailable {
  build(): this {
    return this.subject('Attachment Test')
      .html('<p>With attachments</p>')
      .attach('/path/to/file.pdf')
      .attach('/path/to/document.txt', 'custom-name.txt');
  }
}

class EmbedImageMailable extends Mailable {
  build(): this {
    return this.subject('Embed Test')
      .html('<img src="cid:logo">')
      .embedImage('/path/to/logo.png', 'logo')
      .embedImage('/path/to/banner.jpg', 'banner', 'custom-banner.jpg')
      .embedImageData(Buffer.from('fake'), 'icon', 'image/png')
      .embedImageData('base64data', 'avatar', 'image/jpeg', 'avatar.jpg');
  }
}

describe('Mailable - Coverage Tests', () => {
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

  describe('send() errors', () => {
    it('should throw error when mail manager not configured', async () => {
      const mailable = new TestMailable();
      mailable.to('user@test.com');
      mailable.build();

      await expect(mailable.send()).rejects.toThrow('Mail manager not configured');
    });

    it('should throw error when no recipients specified', async () => {
      const mailable = new TestMailable();
      mailable.build();
      mailable.setMailManager(new MailManager(config));

      await expect(mailable.send()).rejects.toThrow('No recipients specified');
    });

    it('should throw error when recipients is empty array', async () => {
      const mailable = new TestMailable();
      mailable.to([]);
      mailable.build();
      mailable.setMailManager(new MailManager(config));

      await expect(mailable.send()).rejects.toThrow('No recipients specified');
    });
  });

  describe('preview() errors', () => {
    it('should throw error when mail manager not configured', async () => {
      const mailable = new TestMailable();
      mailable.build();

      await expect(mailable.preview()).rejects.toThrow('Mail manager not configured');
    });

    it('should preview with recipients set', async () => {
      const mailable = new TestMailable();
      mailable.to('user@test.com');
      mailable.build();
      mailable.setMailManager(new MailManager(config));

      const preview = await mailable.preview();
      expect(preview).toBeDefined();
    });

    it('should preview without recipients using options.to', async () => {
      // Create a mailable that sets to in options
      class ToInOptionsMailable extends Mailable {
        build(): this {
          this.options.to = 'default@test.com';
          return this.subject('Test').html('<p>Test</p>');
        }
      }

      const mailable = new ToInOptionsMailable();
      mailable.build();
      mailable.setMailManager(new MailManager(config));

      const preview = await mailable.preview();
      expect(preview).toBeDefined();
    });
  });

  describe('builder methods', () => {
    it('should chain all builder methods', () => {
      const mailable = new FullFeaturedMailable();
      const options = mailable.getMailOptions();

      expect(options.from).toBe('sender@test.com');
      expect(options.subject).toBe('Full Featured');
      expect(options.cc).toBe('cc@test.com');
      expect(options.bcc).toBe('bcc@test.com');
      expect(options.replyTo).toBe('reply@test.com');
      expect(options.headers).toEqual({ 'X-Custom': 'value' });
      expect(options.priority).toBe('high');
    });

    it('should set view template with data', () => {
      const mailable = new ViewMailable();
      const options = mailable.getMailOptions();

      expect(options.template).toBe('welcome');
      expect(options.data).toEqual({ name: 'Test User' });
    });

    it('should set view template without data', () => {
      const mailable = new ViewMailableNoData();
      const options = mailable.getMailOptions();

      expect(options.template).toBe('welcome');
      expect(options.data).toBeUndefined();
    });
  });

  describe('attachments', () => {
    it('should add attachments with default filename', () => {
      const mailable = new AttachmentMailable();
      const options = mailable.getMailOptions();

      expect(options.attachments).toHaveLength(2);
      expect(options.attachments![0].path).toBe('/path/to/file.pdf');
      expect(options.attachments![1].filename).toBe('custom-name.txt');
    });
  });

  describe('embedded images', () => {
    it('should embed images with various methods', () => {
      const mailable = new EmbedImageMailable();
      const options = mailable.getMailOptions();

      expect(options.attachments).toHaveLength(4);

      // File-based embed
      expect(options.attachments![0].cid).toBe('logo');
      expect(options.attachments![0].contentType).toBe('image/png');

      // File-based with custom filename
      expect(options.attachments![1].cid).toBe('banner');
      expect(options.attachments![1].filename).toBe('custom-banner.jpg');
      expect(options.attachments![1].contentType).toBe('image/jpeg');

      // Buffer-based
      expect(options.attachments![2].cid).toBe('icon');
      expect(options.attachments![2].content).toBeInstanceOf(Buffer);

      // String-based with custom filename
      expect(options.attachments![3].cid).toBe('avatar');
      expect(options.attachments![3].filename).toBe('avatar.jpg');
    });

    it('should handle unknown image extensions', () => {
      class UnknownExtMailable extends Mailable {
        build(): this {
          return this.subject('Test')
            .html('<img src="cid:file">')
            .embedImage('/path/to/file.xyz', 'file');
        }
      }

      const mailable = new UnknownExtMailable();
      const options = mailable.getMailOptions();

      expect(options.attachments![0].contentType).toBe('application/octet-stream');
    });

    it('should handle various image extensions', () => {
      class MultiExtMailable extends Mailable {
        build(): this {
          return this.subject('Test')
            .html('<p>Test</p>')
            .embedImage('/path/to/file.gif', 'gif')
            .embedImage('/path/to/file.svg', 'svg')
            .embedImage('/path/to/file.webp', 'webp')
            .embedImage('/path/to/file.bmp', 'bmp')
            .embedImage('/path/to/file.ico', 'ico');
        }
      }

      const mailable = new MultiExtMailable();
      const options = mailable.getMailOptions();

      expect(options.attachments![0].contentType).toBe('image/gif');
      expect(options.attachments![1].contentType).toBe('image/svg+xml');
      expect(options.attachments![2].contentType).toBe('image/webp');
      expect(options.attachments![3].contentType).toBe('image/bmp');
      expect(options.attachments![4].contentType).toBe('image/x-icon');
    });
  });

  describe('setMailManager', () => {
    it('should return this for chaining', () => {
      const mailable = new TestMailable();
      const manager = new MailManager(config);

      const result = mailable.setMailManager(manager);
      expect(result).toBe(mailable);
    });
  });

  describe('to()', () => {
    it('should accept single recipient', () => {
      const mailable = new TestMailable();
      mailable.to('user@test.com');
      mailable.build();
      mailable.setMailManager(new MailManager(config));

      // Should not throw
      expect(mailable).toBeDefined();
    });

    it('should accept array of recipients', async () => {
      const mailable = new TestMailable();
      mailable.to(['user1@test.com', 'user2@test.com']);
      mailable.build();
      mailable.setMailManager(new MailManager(config));

      const result = await mailable.send();
      expect(result.success).toBe(true);
    });
  });
});
