import { Mailable } from '../../src/core/Mailable';
import { MailManager } from '../../src/core/MailManager';
import type { MailConfig } from '../../src/types';

// Mock providers
jest.mock('../../src/providers/SmtpProvider');

const mockConfig: MailConfig = {
  default: 'smtp',
  from: {
    address: 'test@example.com',
    name: 'Test',
  },
  mailers: {
    smtp: {
      driver: 'smtp',
      host: 'smtp.test.com',
      port: 587,
      auth: {
        user: 'test',
        pass: 'test',
      },
    },
  },
};

class TestMailable extends Mailable {
  constructor(
    private name: string,
    private message: string
  ) {
    super();
  }

  build() {
    return this.subject(`Hello ${this.name}`)
      .html(`<p>${this.message}</p>`)
      .text(this.message);
  }
}

class TemplateMailable extends Mailable {
  constructor(
    private data: Record<string, unknown>
  ) {
    super();
  }

  build() {
    return this.subject('Test Template')
      .view('test-template', this.data);
  }
}

describe('Mailable', () => {
  let mailManager: MailManager;

  beforeEach(() => {
    mailManager = new MailManager(mockConfig);
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should build mail options correctly', () => {
      const mailable = new TestMailable('John', 'Test message');
      const options = mailable.getMailOptions();

      expect(options.subject).toBe('Hello John');
      expect(options.html).toBe('<p>Test message</p>');
      expect(options.text).toBe('Test message');
    });

    it('should set recipients with to()', () => {
      const mailable = new TestMailable('John', 'Test');
      mailable.to('user@example.com');

      expect(mailable['recipients']).toBe('user@example.com');
    });

    it('should set multiple recipients', () => {
      const mailable = new TestMailable('John', 'Test');
      mailable.to(['user1@example.com', 'user2@example.com']);

      expect(mailable['recipients']).toEqual(['user1@example.com', 'user2@example.com']);
    });

    it('should set mail manager', () => {
      const mailable = new TestMailable('John', 'Test');
      mailable.setMailManager(mailManager);

      expect(mailable['mailManager']).toBe(mailManager);
    });
  });

  describe('template support', () => {
    it('should support view templates', () => {
      const mailable = new TemplateMailable({ name: 'John' });
      const options = mailable.getMailOptions();

      expect(options.subject).toBe('Test Template');
      expect(options.template).toBe('test-template');
      expect(options.data).toEqual({ name: 'John' });
    });
  });

  describe('send method', () => {
    it('should throw error if mail manager not set', async () => {
      const mailable = new TestMailable('John', 'Test');
      mailable.to('user@example.com');

      await expect(mailable.send()).rejects.toThrow('Mail manager not configured');
    });

    it('should throw error if no recipients', async () => {
      const mailable = new TestMailable('John', 'Test');
      mailable.setMailManager(mailManager);

      await expect(mailable.send()).rejects.toThrow('No recipients specified');
    });

    it('should send email with mail manager', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-id',
      });

      mailManager.send = mockSend;

      const mailable = new TestMailable('John', 'Test');
      mailable.setMailManager(mailManager);
      mailable.to('user@example.com');

      const result = await mailable.send();

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Hello John',
          html: '<p>Test</p>',
        })
      );
    });
  });

  describe('protected methods', () => {
    class FullFeatureMailable extends Mailable {
      build() {
        return this.subject('Test')
          .html('<p>Test</p>')
          .text('Test')
          .cc('cc@example.com')
          .bcc(['bcc1@example.com', 'bcc2@example.com'])
          .replyTo('reply@example.com')
          .attach('/path/to/file.pdf', 'document.pdf')
          .withHeaders({ 'X-Custom': 'value' });
      }
    }

    it('should set all mail options', () => {
      const mailable = new FullFeatureMailable();
      const options = mailable.getMailOptions();

      expect(options.subject).toBe('Test');
      expect(options.html).toBe('<p>Test</p>');
      expect(options.text).toBe('Test');
      expect(options.cc).toBe('cc@example.com');
      expect(options.bcc).toEqual(['bcc1@example.com', 'bcc2@example.com']);
      expect(options.replyTo).toBe('reply@example.com');
      expect(options.attachments).toHaveLength(1);
      expect(options.attachments?.[0]).toEqual({
        filename: 'document.pdf',
        path: '/path/to/file.pdf',
      });
      expect(options.headers).toEqual({ 'X-Custom': 'value' });
    });

    it('should handle attach without custom filename', () => {
      class AttachMailable extends Mailable {
        build() {
          return this.subject('Test').attach('/path/to/file.pdf');
        }
      }

      const mailable = new AttachMailable();
      const options = mailable.getMailOptions();

      expect(options.attachments?.[0].filename).toBe('file.pdf');
    });
  });
});
