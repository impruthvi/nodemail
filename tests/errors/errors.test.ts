/**
 * Typed Error Classes — Unit + Integration Tests
 */

import {
  NodeMailError,
  ConfigurationError,
  ValidationError,
  ProviderError,
  AllProvidersFailedError,
} from '../../src/errors';
import { MailManager } from '../../src/core/MailManager';
import { Mail } from '../../src/core/MailFacade';
import { MessageBuilder } from '../../src/core/MessageBuilder';
import type { MailConfig } from '../../src/types';

// Mock SMTP so we don't need a real server
jest.mock('../../src/providers/SmtpProvider', () => ({
  SmtpProvider: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  })),
}));

// ─── Unit Tests: Error class hierarchy ───────────────────────────────

describe('NodeMailError', () => {
  it('sets name and message', () => {
    const err = new NodeMailError('base error');
    expect(err.name).toBe('NodeMailError');
    expect(err.message).toBe('base error');
  });

  it('is an instance of Error', () => {
    const err = new NodeMailError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NodeMailError);
  });

  it('has a stack trace', () => {
    const err = new NodeMailError('trace');
    expect(err.stack).toBeDefined();
  });
});

describe('ConfigurationError', () => {
  it('sets name and message', () => {
    const err = new ConfigurationError('missing config');
    expect(err.name).toBe('ConfigurationError');
    expect(err.message).toBe('missing config');
  });

  it('extends NodeMailError and Error', () => {
    const err = new ConfigurationError('test');
    expect(err).toBeInstanceOf(ConfigurationError);
    expect(err).toBeInstanceOf(NodeMailError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('ValidationError', () => {
  it('sets name, message, and field', () => {
    const err = new ValidationError('subject required', 'subject');
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('subject required');
    expect(err.field).toBe('subject');
  });

  it('field is undefined when not provided', () => {
    const err = new ValidationError('bad input');
    expect(err.field).toBeUndefined();
  });

  it('extends NodeMailError and Error', () => {
    const err = new ValidationError('test');
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toBeInstanceOf(NodeMailError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('ProviderError', () => {
  it('sets name, message, and provider', () => {
    const err = new ProviderError('send failed', 'sendgrid');
    expect(err.name).toBe('ProviderError');
    expect(err.message).toBe('send failed');
    expect(err.provider).toBe('sendgrid');
  });

  it('extends NodeMailError and Error', () => {
    const err = new ProviderError('test', 'smtp');
    expect(err).toBeInstanceOf(ProviderError);
    expect(err).toBeInstanceOf(NodeMailError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('AllProvidersFailedError', () => {
  it('builds message from attempts and stores them', () => {
    const attempts = [
      { provider: 'smtp', error: 'timeout' },
      { provider: 'sendgrid', error: 'auth failed' },
    ];
    const err = new AllProvidersFailedError(attempts);
    expect(err.name).toBe('AllProvidersFailedError');
    expect(err.message).toBe('All providers failed: smtp: timeout, sendgrid: auth failed');
    expect(err.attempts).toEqual(attempts);
  });

  it('handles single attempt', () => {
    const attempts = [{ provider: 'ses', error: 'region error' }];
    const err = new AllProvidersFailedError(attempts);
    expect(err.message).toBe('All providers failed: ses: region error');
    expect(err.attempts).toHaveLength(1);
  });

  it('handles empty attempts', () => {
    const err = new AllProvidersFailedError([]);
    expect(err.message).toBe('All providers failed: ');
    expect(err.attempts).toHaveLength(0);
  });

  it('extends NodeMailError and Error', () => {
    const err = new AllProvidersFailedError([]);
    expect(err).toBeInstanceOf(AllProvidersFailedError);
    expect(err).toBeInstanceOf(NodeMailError);
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── instanceof discrimination (the user-facing use case) ────────────

describe('instanceof discrimination', () => {
  it('can distinguish error types in a catch block', () => {
    const errors: NodeMailError[] = [
      new ConfigurationError('cfg'),
      new ValidationError('val', 'field'),
      new ProviderError('prov', 'smtp'),
      new AllProvidersFailedError([{ provider: 'x', error: 'y' }]),
    ];

    for (const err of errors) {
      expect(err).toBeInstanceOf(NodeMailError);
      expect(err).toBeInstanceOf(Error);
    }

    expect(errors[0]).toBeInstanceOf(ConfigurationError);
    expect(errors[0]).not.toBeInstanceOf(ValidationError);

    expect(errors[1]).toBeInstanceOf(ValidationError);
    expect(errors[1]).not.toBeInstanceOf(ConfigurationError);

    expect(errors[2]).toBeInstanceOf(ProviderError);
    expect(errors[2]).not.toBeInstanceOf(AllProvidersFailedError);

    expect(errors[3]).toBeInstanceOf(AllProvidersFailedError);
    expect(errors[3]).not.toBeInstanceOf(ProviderError);
  });
});

// ─── Integration: typed errors thrown from real code paths ───────────

describe('Integration — MailManager throws ConfigurationError', () => {
  const baseConfig: MailConfig = {
    default: 'smtp',
    from: 'test@example.com',
    mailers: {
      smtp: { driver: 'smtp', host: 'localhost', port: 587 },
    },
  };

  it('unsupported template engine', () => {
    expect(() => {
      new MailManager({
        ...baseConfig,
        templates: { engine: 'unknown-engine' as any },
      });
    }).toThrow(ConfigurationError);
  });

  it('queue not configured — queue()', async () => {
    const mgr = new MailManager(baseConfig);
    await expect(mgr.queue({ to: 'a@b.com', subject: 's' })).rejects.toThrow(ConfigurationError);
  });

  it('queue not configured — later()', async () => {
    const mgr = new MailManager(baseConfig);
    await expect(mgr.later({ to: 'a@b.com', subject: 's' }, 10)).rejects.toThrow(ConfigurationError);
  });

  it('queue not configured — at()', async () => {
    const mgr = new MailManager(baseConfig);
    await expect(mgr.at({ to: 'a@b.com', subject: 's' }, new Date())).rejects.toThrow(ConfigurationError);
  });

  it('queue not configured — processQueue()', async () => {
    const mgr = new MailManager(baseConfig);
    await expect(mgr.processQueue()).rejects.toThrow(ConfigurationError);
  });

  it('unsupported mail driver', () => {
    expect(() => {
      new MailManager({
        ...baseConfig,
        default: 'bad',
        mailers: { bad: { driver: 'nonexistent' as any } },
      }).to('a@b.com');
      // Force provider creation by sending
    }).not.toThrow(); // just building — provider not created yet

    const mgr = new MailManager({
      ...baseConfig,
      default: 'bad',
      mailers: { bad: { driver: 'nonexistent' as any } },
    });
    expect(mgr.send({ to: 'a@b.com', subject: 's' })).rejects.toThrow(ConfigurationError);
  });

  it('unconfigured mailer name', () => {
    const mgr = new MailManager(baseConfig);
    expect(() => mgr.mailer('doesnotexist')).toThrow(ConfigurationError);
  });
});

describe('Integration — MailFacade throws ConfigurationError', () => {
  afterEach(() => {
    Mail.restore();
  });

  it('Mail not configured', () => {
    // Reset internal state
    (Mail as any).instance = null;
    (Mail as any).config = null;
    expect(() => Mail.to('a@b.com')).toThrow(ConfigurationError);
  });

  it('assertSent without fake()', () => {
    Mail.configure({ default: 'smtp', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } } });
    Mail.restore();
    expect(() => Mail.assertSent(class extends (require('../../src/core/Mailable').Mailable) {
      build() { return this; }
    })).toThrow(ConfigurationError);
  });

  it('assertNotSent without fake()', () => {
    expect(() => Mail.assertNotSent(class extends (require('../../src/core/Mailable').Mailable) {
      build() { return this; }
    })).toThrow(ConfigurationError);
  });

  it('assertNothingSent without fake()', () => {
    expect(() => Mail.assertNothingSent()).toThrow(ConfigurationError);
  });

  it('assertQueued without fake()', () => {
    expect(() => Mail.assertQueued(class extends (require('../../src/core/Mailable').Mailable) {
      build() { return this; }
    })).toThrow(ConfigurationError);
  });

  it('assertNothingQueued without fake()', () => {
    expect(() => Mail.assertNothingQueued()).toThrow(ConfigurationError);
  });

  it('sent() without fake()', () => {
    expect(() => Mail.sent()).toThrow(ConfigurationError);
  });

  it('queued() without fake()', () => {
    expect(() => Mail.queued()).toThrow(ConfigurationError);
  });

  it('hasSent() without fake()', () => {
    expect(() => Mail.hasSent()).toThrow(ConfigurationError);
  });

  it('hasQueued() without fake()', () => {
    expect(() => Mail.hasQueued()).toThrow(ConfigurationError);
  });
});

describe('Integration — MessageBuilder throws ValidationError', () => {
  const config: MailConfig = {
    default: 'smtp',
    from: 'test@example.com',
    mailers: {
      smtp: { driver: 'smtp', host: 'localhost', port: 587 },
    },
  };

  it('send() without subject', async () => {
    const mgr = new MailManager(config);
    const builder = mgr.to('user@example.com').html('<p>hi</p>');
    await expect(builder.send()).rejects.toThrow(ValidationError);

    try {
      await builder.send();
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe('subject');
    }
  });

  it('queue() without subject', async () => {
    const mgr = new MailManager({
      ...config,
      queue: { driver: 'sync' },
    });
    const builder = new MessageBuilder(mgr, 'user@example.com');
    builder.html('<p>hi</p>');

    // In fake mode, queue validates subject
    const fake = Mail.fake();
    const fakeBuilder = new MessageBuilder(fake, 'user@example.com');
    fakeBuilder.html('<p>hi</p>');
    await expect(fakeBuilder.queue()).rejects.toThrow(ValidationError);
    Mail.restore();
  });
});

describe('Integration — Mailable throws correct error types', () => {
  it('throws ConfigurationError without mail manager', async () => {
    const { Mailable } = require('../../src/core/Mailable');
    class TestMail extends Mailable {
      build() {
        return this.subject('Test').html('<p>Test</p>');
      }
    }
    const mail = new TestMail().to('user@example.com');
    await expect(mail.send()).rejects.toThrow(ConfigurationError);
  });

  it('throws ValidationError without recipients', async () => {
    const { Mailable } = require('../../src/core/Mailable');
    const config: MailConfig = {
      default: 'smtp',
      from: 'test@example.com',
      mailers: { smtp: { driver: 'smtp', host: 'localhost', port: 587 } },
    };
    const mgr = new MailManager(config);

    class TestMail extends Mailable {
      build() {
        return this.subject('Test').html('<p>Test</p>');
      }
    }
    const mail = new TestMail();
    mail.setMailManager(mgr);
    await expect(mail.send()).rejects.toThrow(ValidationError);
  });

  it('throws ConfigurationError on preview without mail manager', async () => {
    const { Mailable } = require('../../src/core/Mailable');
    class TestMail extends Mailable {
      build() {
        return this.subject('Test').html('<p>Test</p>');
      }
    }
    const mail = new TestMail();
    await expect(mail.preview()).rejects.toThrow(ConfigurationError);
  });
});
