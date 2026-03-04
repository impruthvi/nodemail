/**
 * MailFacade Coverage Tests - Additional tests to improve branch coverage
 */

import { Mail } from '../../src/core/MailFacade';
import { Mailable } from '../../src/core/Mailable';
import { MailManager } from '../../src/core/MailManager';
import type { MailConfig } from '../../src/types';

// Mock providers
jest.mock('../../src/providers/SmtpProvider', () => ({
  SmtpProvider: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  })),
}));

class CoverageMailable extends Mailable {
  constructor(public userName: string = 'Test User') {
    super();
  }

  build(): this {
    return this.to('user@test.com')
      .subject('Coverage Test')
      .html(`<p>Hello ${this.userName}</p>`)
      .text(`Hello ${this.userName}`);
  }
}

describe('MailFacade - Coverage Tests', () => {
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

  beforeEach(() => {
    Mail.restore();
  });

  describe('getInstance() without configuration', () => {
    it('should throw error when Mail not configured and calling to()', () => {
      // Ensure no config and no fake
      Mail.restore();
      // Access private static property via type assertion
      (Mail as unknown as { instance: null }).instance = null;
      (Mail as unknown as { config: null }).config = null;

      expect(() => Mail.to('test@test.com')).toThrow(
        'Mail not configured. Call Mail.configure() before using Mail facade.'
      );
    });

    it('should throw error when calling mailer() without configuration', () => {
      Mail.restore();
      (Mail as unknown as { instance: null }).instance = null;
      (Mail as unknown as { config: null }).config = null;

      expect(() => Mail.mailer('smtp')).toThrow(
        'Mail not configured. Call Mail.configure() before using Mail facade.'
      );
    });
  });

  describe('Real mode (non-fake) paths', () => {
    beforeEach(() => {
      Mail.configure(config);
    });

    it('should send via real manager when not faking', async () => {
      const result = await Mail.to('user@test.com')
        .subject('Real Test')
        .html('<p>Hello</p>')
        .send();

      expect(result.success).toBe(true);
    });

    it('should send mailable via real manager', async () => {
      const mailable = new CoverageMailable();
      mailable.build(); // This sets recipients via to()
      const result = await Mail.send(mailable);

      expect(result.success).toBe(true);
    });

    it('should preview via FakeableMessageBuilder in real mode', async () => {
      const preview = await Mail.to('user@test.com')
        .subject('Preview Test')
        .html('<p>Preview</p>')
        .preview();

      expect(preview).toBeDefined();
      expect(preview.html).toContain('Preview');
    });

    it('should use mailer() to get specific mailer', () => {
      const smtpMailer = Mail.mailer('smtp');
      expect(smtpMailer).toBeInstanceOf(MailManager);
    });

    it('should send with mailable via to().send(mailable)', async () => {
      const mailable = new CoverageMailable();
      mailable.build();

      const result = await Mail.to('override@test.com').send(mailable);
      expect(result.success).toBe(true);
    });
  });

  describe('Event listeners in non-fake mode', () => {
    beforeEach(() => {
      Mail.configure(config);
    });

    it('should register onSending listener in real mode', () => {
      const listener = jest.fn();
      expect(() => Mail.onSending(listener)).not.toThrow();
    });

    it('should register onSent listener in real mode', () => {
      const listener = jest.fn();
      expect(() => Mail.onSent(listener)).not.toThrow();
    });

    it('should register onFailed listener in real mode', () => {
      const listener = jest.fn();
      expect(() => Mail.onFailed(listener)).not.toThrow();
    });

    it('should clear listeners in real mode', () => {
      expect(() => Mail.clearListeners()).not.toThrow();
    });
  });

  describe('Preview in fake mode', () => {
    beforeEach(() => {
      Mail.configure(config);
      Mail.fake();
    });

    it('should preview via FakeableMessageBuilder in fake mode', async () => {
      const preview = await Mail.to('user@test.com')
        .subject('Fake Preview')
        .html('<p>Fake Preview</p>')
        .preview();

      expect(preview).toBeDefined();
    });

    it('should preview mailable via Mail.preview()', async () => {
      const mailable = new CoverageMailable();
      mailable.build();

      const preview = await Mail.preview(mailable);
      expect(preview).toBeDefined();
    });
  });

  describe('Assertion methods without fake()', () => {
    beforeEach(() => {
      Mail.restore();
      Mail.configure(config);
    });

    it('should throw when assertSent called without fake()', () => {
      expect(() => Mail.assertSent(CoverageMailable)).toThrow(
        'Mail::fake() must be called before using assertions.'
      );
    });

    it('should throw when assertSentCount called without fake()', () => {
      expect(() => Mail.assertSentCount(CoverageMailable, 1)).toThrow(
        'Mail::fake() must be called before using assertions.'
      );
    });

    it('should throw when assertNotSent called without fake()', () => {
      expect(() => Mail.assertNotSent(CoverageMailable)).toThrow(
        'Mail::fake() must be called before using assertions.'
      );
    });

    it('should throw when assertNothingSent called without fake()', () => {
      expect(() => Mail.assertNothingSent()).toThrow(
        'Mail::fake() must be called before using assertions.'
      );
    });

    it('should throw when assertQueued called without fake()', () => {
      expect(() => Mail.assertQueued(CoverageMailable)).toThrow(
        'Mail::fake() must be called before using assertions.'
      );
    });

    it('should throw when assertQueuedCount called without fake()', () => {
      expect(() => Mail.assertQueuedCount(CoverageMailable, 1)).toThrow(
        'Mail::fake() must be called before using assertions.'
      );
    });

    it('should throw when assertNotQueued called without fake()', () => {
      expect(() => Mail.assertNotQueued(CoverageMailable)).toThrow(
        'Mail::fake() must be called before using assertions.'
      );
    });

    it('should throw when assertNothingQueued called without fake()', () => {
      expect(() => Mail.assertNothingQueued()).toThrow(
        'Mail::fake() must be called before using assertions.'
      );
    });

    it('should throw when sent() called without fake()', () => {
      expect(() => Mail.sent(CoverageMailable)).toThrow(
        'Mail::fake() must be called before using sent().'
      );
    });

    it('should throw when queued() called without fake()', () => {
      expect(() => Mail.queued(CoverageMailable)).toThrow(
        'Mail::fake() must be called before using queued().'
      );
    });

    it('should throw when hasSent() called without fake()', () => {
      expect(() => Mail.hasSent()).toThrow('Mail::fake() must be called before using hasSent().');
    });

    it('should throw when hasQueued() called without fake()', () => {
      expect(() => Mail.hasQueued()).toThrow(
        'Mail::fake() must be called before using hasQueued().'
      );
    });
  });

  describe('FakeableMessageBuilder - embedImage methods', () => {
    beforeEach(() => {
      Mail.configure(config);
      Mail.fake();
    });

    it('should embed image by file path', () => {
      const builder = Mail.to('user@test.com')
        .subject('Embed Test')
        .html('<img src="cid:logo">')
        .embedImage('/path/to/logo.png', 'logo');

      expect(builder.options.attachments).toHaveLength(1);
      expect(builder.options.attachments![0].cid).toBe('logo');
    });

    it('should embed image with custom filename', () => {
      const builder = Mail.to('user@test.com')
        .subject('Embed Test')
        .html('<img src="cid:logo">')
        .embedImage('/path/to/image.jpg', 'logo', 'custom-logo.jpg');

      expect(builder.options.attachments![0].filename).toBe('custom-logo.jpg');
    });

    it('should embed image data with buffer', () => {
      const buffer = Buffer.from('fake image data');
      const builder = Mail.to('user@test.com')
        .subject('Embed Test')
        .html('<img src="cid:logo">')
        .embedImageData(buffer, 'logo', 'image/png');

      expect(builder.options.attachments).toHaveLength(1);
      expect(builder.options.attachments![0].content).toBe(buffer);
    });

    it('should embed image data with custom filename', () => {
      const builder = Mail.to('user@test.com')
        .subject('Embed Test')
        .html('<img src="cid:logo">')
        .embedImageData('base64data', 'logo', 'image/jpeg', 'my-image.jpg');

      expect(builder.options.attachments![0].filename).toBe('my-image.jpg');
    });
  });

  describe('FakeableMessageBuilder - priority method', () => {
    beforeEach(() => {
      Mail.configure(config);
      Mail.fake();
    });

    it('should set priority to high', () => {
      const builder = Mail.to('user@test.com')
        .subject('Priority Test')
        .html('<p>High priority</p>')
        .priority('high');

      expect(builder.options.priority).toBe('high');
    });

    it('should set priority to low', () => {
      const builder = Mail.to('user@test.com')
        .subject('Priority Test')
        .html('<p>Low priority</p>')
        .priority('low');

      expect(builder.options.priority).toBe('low');
    });
  });

  describe('getFake()', () => {
    it('should return null when not faking', () => {
      Mail.configure(config);
      expect(Mail.getFake()).toBeNull();
    });

    it('should return MailFake instance when faking', () => {
      Mail.configure(config);
      Mail.fake();
      expect(Mail.getFake()).not.toBeNull();
    });
  });
});
