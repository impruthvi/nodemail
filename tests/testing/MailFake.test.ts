/**
 * Tests for Mail::fake() testing utilities
 */

import { Mail, Mailable, MailFake, AssertableMessage } from '../../src';

// Test Mailable classes
class WelcomeEmail extends Mailable {
  constructor(
    public userName: string,
    public appName: string
  ) {
    super();
  }

  build(): this {
    return this.subject(`Welcome to ${this.appName}!`)
      .html(`<h1>Hello ${this.userName}!</h1>`)
      .cc('admin@example.com');
  }
}

class OrderConfirmation extends Mailable {
  constructor(public orderId: string) {
    super();
  }

  build(): this {
    return this.subject(`Order #${this.orderId} Confirmed`)
      .html(`<p>Your order ${this.orderId} has been confirmed.</p>`)
      .attach('/path/to/receipt.pdf', 'receipt.pdf');
  }
}

class NewsletterEmail extends Mailable {
  build(): this {
    return this.subject('Monthly Newsletter').html('<p>News content</p>');
  }
}

describe('Mail::fake()', () => {
  beforeEach(() => {
    // Reset fake state before each test
    Mail.restore();
  });

  afterEach(() => {
    // Clean up after each test
    Mail.restore();
  });

  describe('fake() method', () => {
    it('should enable fake mode', () => {
      const fake = Mail.fake();
      expect(fake).toBeInstanceOf(MailFake);
    });

    it('should return the same fake instance', () => {
      const fake1 = Mail.fake();
      const fake2 = Mail.getFake();
      expect(fake1).toBe(fake2);
    });

    it('should allow sending emails without real transport', async () => {
      Mail.fake();

      const result = await Mail.to('user@example.com')
        .subject('Test Email')
        .html('<p>Test content</p>')
        .send();

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('fake-');
    });
  });

  describe('restore() method', () => {
    it('should disable fake mode', () => {
      Mail.fake();
      expect(Mail.getFake()).not.toBeNull();

      Mail.restore();
      expect(Mail.getFake()).toBeNull();
    });
  });

  describe('assertSent()', () => {
    it('should pass when mailable was sent', async () => {
      Mail.fake();

      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      expect(() => {
        Mail.assertSent(WelcomeEmail);
      }).not.toThrow();
    });

    it('should fail when mailable was not sent', () => {
      Mail.fake();

      expect(() => {
        Mail.assertSent(WelcomeEmail);
      }).toThrow('The expected [WelcomeEmail] mailable was not sent.');
    });

    it('should pass with callback when condition matches', async () => {
      Mail.fake();

      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      expect(() => {
        Mail.assertSent(WelcomeEmail, (mail) => mail.hasTo('user@example.com'));
      }).not.toThrow();
    });

    it('should fail with callback when condition does not match', async () => {
      Mail.fake();

      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      expect(() => {
        Mail.assertSent(WelcomeEmail, (mail) => mail.hasTo('other@example.com'));
      }).toThrow('callback returned false');
    });

    it('should throw if fake() was not called', () => {
      expect(() => {
        Mail.assertSent(WelcomeEmail);
      }).toThrow('Mail::fake() must be called before using assertions.');
    });
  });

  describe('assertSentCount()', () => {
    it('should pass when count matches', async () => {
      Mail.fake();

      await Mail.to('user1@example.com').send(new WelcomeEmail('John', 'MyApp'));
      await Mail.to('user2@example.com').send(new WelcomeEmail('Jane', 'MyApp'));

      expect(() => {
        Mail.assertSentCount(WelcomeEmail, 2);
      }).not.toThrow();
    });

    it('should fail when count does not match', async () => {
      Mail.fake();

      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      expect(() => {
        Mail.assertSentCount(WelcomeEmail, 2);
      }).toThrow('Expected [WelcomeEmail] to be sent 2 time(s), but it was sent 1 time(s).');
    });
  });

  describe('assertNotSent()', () => {
    it('should pass when mailable was not sent', () => {
      Mail.fake();

      expect(() => {
        Mail.assertNotSent(WelcomeEmail);
      }).not.toThrow();
    });

    it('should fail when mailable was sent', async () => {
      Mail.fake();

      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      expect(() => {
        Mail.assertNotSent(WelcomeEmail);
      }).toThrow('The unexpected [WelcomeEmail] mailable was sent.');
    });

    it('should pass with callback when no matching mailable', async () => {
      Mail.fake();

      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      expect(() => {
        Mail.assertNotSent(WelcomeEmail, (mail) => mail.hasTo('other@example.com'));
      }).not.toThrow();
    });
  });

  describe('assertNothingSent()', () => {
    it('should pass when nothing was sent', () => {
      Mail.fake();

      expect(() => {
        Mail.assertNothingSent();
      }).not.toThrow();
    });

    it('should fail when something was sent', async () => {
      Mail.fake();

      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      expect(() => {
        Mail.assertNothingSent();
      }).toThrow('Expected no mailables to be sent');
    });
  });

  describe('sent()', () => {
    it('should return all sent messages', async () => {
      Mail.fake();

      await Mail.to('user1@example.com').send(new WelcomeEmail('John', 'MyApp'));
      await Mail.to('user2@example.com').send(new OrderConfirmation('123'));

      const sent = Mail.sent();
      expect(sent).toHaveLength(2);
    });

    it('should filter by mailable class', async () => {
      Mail.fake();

      await Mail.to('user1@example.com').send(new WelcomeEmail('John', 'MyApp'));
      await Mail.to('user2@example.com').send(new OrderConfirmation('123'));

      const welcomeEmails = Mail.sent(WelcomeEmail);
      expect(welcomeEmails).toHaveLength(1);

      const orderEmails = Mail.sent(OrderConfirmation);
      expect(orderEmails).toHaveLength(1);
    });

    it('should return AssertableMessage instances', async () => {
      Mail.fake();

      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      const sent = Mail.sent();
      expect(sent[0]).toBeInstanceOf(AssertableMessage);
    });
  });

  describe('hasSent()', () => {
    it('should return false when nothing sent', () => {
      Mail.fake();
      expect(Mail.hasSent()).toBe(false);
    });

    it('should return true when something sent', async () => {
      Mail.fake();
      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));
      expect(Mail.hasSent()).toBe(true);
    });
  });

  describe('queue assertions', () => {
    it('should track queued messages', async () => {
      Mail.fake();

      await Mail.to('user@example.com').queue(new WelcomeEmail('John', 'MyApp'));

      expect(() => {
        Mail.assertQueued(WelcomeEmail);
      }).not.toThrow();
    });

    it('should fail when not queued', () => {
      Mail.fake();

      expect(() => {
        Mail.assertQueued(WelcomeEmail);
      }).toThrow('The expected [WelcomeEmail] mailable was not queued.');
    });

    it('should assert nothing queued', () => {
      Mail.fake();

      expect(() => {
        Mail.assertNothingQueued();
      }).not.toThrow();
    });

    it('should fail assertNothingQueued when something queued', async () => {
      Mail.fake();

      await Mail.to('user@example.com').queue(new WelcomeEmail('John', 'MyApp'));

      expect(() => {
        Mail.assertNothingQueued();
      }).toThrow('Expected no mailables to be queued');
    });
  });
});

describe('AssertableMessage', () => {
  beforeEach(() => {
    Mail.restore();
    Mail.fake();
  });

  afterEach(() => {
    Mail.restore();
  });

  describe('recipient checks', () => {
    it('should check hasTo()', async () => {
      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      const sent = Mail.sent()[0];
      expect(sent.hasTo('user@example.com')).toBe(true);
      expect(sent.hasTo('other@example.com')).toBe(false);
    });

    it('should check hasTo() case insensitive', async () => {
      await Mail.to('User@Example.com').send(new WelcomeEmail('John', 'MyApp'));

      const sent = Mail.sent()[0];
      expect(sent.hasTo('user@example.com')).toBe(true);
    });

    it('should check hasCc()', async () => {
      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      const sent = Mail.sent()[0];
      expect(sent.hasCc('admin@example.com')).toBe(true);
      expect(sent.hasCc('other@example.com')).toBe(false);
    });

    it('should check hasBcc()', async () => {
      await Mail.to('user@example.com')
        .bcc('secret@example.com')
        .subject('Test')
        .html('<p>Test</p>')
        .send();

      const sent = Mail.sent()[0];
      expect(sent.hasBcc('secret@example.com')).toBe(true);
    });
  });

  describe('subject checks', () => {
    it('should check hasSubject()', async () => {
      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      const sent = Mail.sent()[0];
      expect(sent.hasSubject('Welcome to MyApp!')).toBe(true);
      expect(sent.hasSubject('Wrong subject')).toBe(false);
    });

    it('should check subjectContains()', async () => {
      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      const sent = Mail.sent()[0];
      expect(sent.subjectContains('Welcome')).toBe(true);
      expect(sent.subjectContains('welcome')).toBe(true); // case insensitive
      expect(sent.subjectContains('Goodbye')).toBe(false);
    });
  });

  describe('content checks', () => {
    it('should check hasHtml()', async () => {
      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      const sent = Mail.sent()[0];
      expect(sent.hasHtml()).toBe(true);
    });

    it('should check htmlContains()', async () => {
      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      const sent = Mail.sent()[0];
      expect(sent.htmlContains('Hello John')).toBe(true);
      expect(sent.htmlContains('Goodbye')).toBe(false);
    });

    it('should check hasText()', async () => {
      await Mail.to('user@example.com')
        .subject('Test')
        .text('Plain text content')
        .send();

      const sent = Mail.sent()[0];
      expect(sent.hasText()).toBe(true);
      expect(sent.textContains('Plain text')).toBe(true);
    });
  });

  describe('attachment checks', () => {
    it('should check hasAttachments()', async () => {
      await Mail.to('user@example.com').send(new OrderConfirmation('123'));

      const sent = Mail.sent()[0];
      expect(sent.hasAttachments()).toBe(true);
    });

    it('should check hasAttachment() by filename', async () => {
      await Mail.to('user@example.com').send(new OrderConfirmation('123'));

      const sent = Mail.sent()[0];
      expect(sent.hasAttachment('receipt.pdf')).toBe(true);
      expect(sent.hasAttachment('other.pdf')).toBe(false);
    });

    it('should get attachments', async () => {
      await Mail.to('user@example.com').send(new OrderConfirmation('123'));

      const sent = Mail.sent()[0];
      const attachments = sent.getAttachments();
      expect(attachments).toHaveLength(1);
      expect(attachments[0].filename).toBe('receipt.pdf');
    });
  });

  describe('header checks', () => {
    it('should check hasHeader()', async () => {
      await Mail.to('user@example.com')
        .subject('Test')
        .html('<p>Test</p>')
        .headers({ 'X-Custom-Header': 'custom-value' })
        .send();

      const sent = Mail.sent()[0];
      expect(sent.hasHeader('X-Custom-Header')).toBe(true);
      expect(sent.hasHeader('X-Custom-Header', 'custom-value')).toBe(true);
      expect(sent.hasHeader('X-Custom-Header', 'wrong-value')).toBe(false);
      expect(sent.hasHeader('X-Missing-Header')).toBe(false);
    });

    it('should get header value', async () => {
      await Mail.to('user@example.com')
        .subject('Test')
        .html('<p>Test</p>')
        .headers({ 'X-Custom-Header': 'custom-value' })
        .send();

      const sent = Mail.sent()[0];
      expect(sent.getHeader('X-Custom-Header')).toBe('custom-value');
      expect(sent.getHeader('X-Missing')).toBeUndefined();
    });
  });

  describe('getter methods', () => {
    it('should getTo()', async () => {
      await Mail.to(['user1@example.com', 'user2@example.com']).send(
        new WelcomeEmail('Team', 'MyApp')
      );

      const sent = Mail.sent()[0];
      expect(sent.getTo()).toEqual(['user1@example.com', 'user2@example.com']);
    });

    it('should getSubject()', async () => {
      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      const sent = Mail.sent()[0];
      expect(sent.getSubject()).toBe('Welcome to MyApp!');
    });

    it('should getHtml()', async () => {
      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      const sent = Mail.sent()[0];
      expect(sent.getHtml()).toBe('<h1>Hello John!</h1>');
    });

    it('should getCc()', async () => {
      await Mail.to('user@example.com').send(new WelcomeEmail('John', 'MyApp'));

      const sent = Mail.sent()[0];
      expect(sent.getCc()).toEqual(['admin@example.com']);
    });
  });
});

describe('MailFake class', () => {
  let fake: MailFake;

  beforeEach(() => {
    fake = new MailFake();
  });

  describe('send()', () => {
    it('should store messages', async () => {
      await fake.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(fake.sentCount()).toBe(1);
    });

    it('should return success response', async () => {
      const result = await fake.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('fake-');
      expect(result.accepted).toEqual(['user@example.com']);
    });
  });

  describe('queue()', () => {
    it('should store queued messages', async () => {
      await fake.queue({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(fake.queuedCount()).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should clear all messages', async () => {
      await fake.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      await fake.queue({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(fake.sentCount()).toBe(1);
      expect(fake.queuedCount()).toBe(1);

      fake.clear();

      expect(fake.sentCount()).toBe(0);
      expect(fake.queuedCount()).toBe(0);
    });
  });
});

describe('Integration tests', () => {
  beforeEach(() => {
    Mail.restore();
  });

  afterEach(() => {
    Mail.restore();
  });

  it('should work with typical test workflow', async () => {
    // Start of test - enable fake mode
    Mail.fake();

    // Simulate user registration that sends welcome email
    const user = { name: 'John', email: 'john@example.com' };
    await Mail.to(user.email).send(new WelcomeEmail(user.name, 'MyApp'));

    // Assertions
    Mail.assertSent(WelcomeEmail);
    Mail.assertSent(WelcomeEmail, (mail) => {
      return (
        mail.hasTo('john@example.com') &&
        mail.subjectContains('Welcome') &&
        mail.htmlContains('Hello John')
      );
    });
    Mail.assertSentCount(WelcomeEmail, 1);
    Mail.assertNotSent(OrderConfirmation);
    Mail.assertNotSent(NewsletterEmail);
  });

  it('should work with multiple mailables', async () => {
    Mail.fake();

    // Simulate checkout process
    await Mail.to('customer@example.com').send(new OrderConfirmation('ORD-001'));
    await Mail.to('customer@example.com').send(new OrderConfirmation('ORD-002'));
    await Mail.to('newsletter@example.com').send(new NewsletterEmail());

    // Verify order confirmations
    Mail.assertSent(OrderConfirmation);
    Mail.assertSentCount(OrderConfirmation, 2);

    // Verify newsletter
    Mail.assertSent(NewsletterEmail);
    Mail.assertSentCount(NewsletterEmail, 1);

    // Check specific order
    Mail.assertSent(OrderConfirmation, (mail) => {
      return mail.subjectContains('ORD-001');
    });

    // Total sent count
    expect(Mail.sent()).toHaveLength(3);
  });

  it('should allow inspecting sent messages', async () => {
    Mail.fake();

    await Mail.to('user@example.com')
      .subject('Custom Email')
      .html('<p>Custom content</p>')
      .cc('cc@example.com')
      .headers({ 'X-Priority': '1' })
      .send();

    const sent = Mail.sent()[0];

    // Use getter methods to inspect
    expect(sent.getSubject()).toBe('Custom Email');
    expect(sent.getTo()).toContain('user@example.com');
    expect(sent.getCc()).toContain('cc@example.com');
    expect(sent.getHeader('X-Priority')).toBe('1');
    expect(sent.htmlContains('Custom content')).toBe(true);
  });
});
