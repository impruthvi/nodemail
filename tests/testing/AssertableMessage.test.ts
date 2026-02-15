import { AssertableMessage } from '../../src/testing/AssertableMessage';
import type { MailOptions, MailResponse } from '../../src/types';

describe('AssertableMessage', () => {
  const baseOptions: MailOptions = {
    to: 'recipient@test.com',
    subject: 'Test Subject',
    html: '<p>Hello</p>',
    text: 'Hello',
  };

  describe('getHeader()', () => {
    it('should return header value when present', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        headers: { 'X-Custom': 'value' },
      });
      expect(msg.getHeader('X-Custom')).toBe('value');
    });

    it('should return undefined when header not present', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.getHeader('X-Missing')).toBeUndefined();
    });

    it('should return undefined when no headers set', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.getHeader('Any')).toBeUndefined();
    });
  });

  describe('getAttachments()', () => {
    it('should return attachments when present', () => {
      const attachments = [{ filename: 'doc.pdf', content: 'data' }];
      const msg = new AssertableMessage({ ...baseOptions, attachments });
      expect(msg.getAttachments()).toEqual(attachments);
    });

    it('should return empty array when no attachments', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.getAttachments()).toEqual([]);
    });
  });

  describe('getFrom()', () => {
    it('should return string from address', () => {
      const msg = new AssertableMessage({ ...baseOptions, from: 'sender@test.com' });
      expect(msg.getFrom()).toBe('sender@test.com');
    });

    it('should return address from MailAddress object', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        from: { address: 'sender@test.com', name: 'Sender' },
      });
      expect(msg.getFrom()).toBe('sender@test.com');
    });

    it('should return undefined when no from', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.getFrom()).toBeUndefined();
    });
  });

  describe('getCc() and getBcc()', () => {
    it('getCc() should return empty array when no cc', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.getCc()).toEqual([]);
    });

    it('getBcc() should return empty array when no bcc', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.getBcc()).toEqual([]);
    });

    it('getCc() should normalize string cc', () => {
      const msg = new AssertableMessage({ ...baseOptions, cc: 'cc@test.com' });
      expect(msg.getCc()).toEqual(['cc@test.com']);
    });

    it('getBcc() should normalize string array bcc', () => {
      const msg = new AssertableMessage({ ...baseOptions, bcc: ['a@test.com', 'b@test.com'] });
      expect(msg.getBcc()).toEqual(['a@test.com', 'b@test.com']);
    });

    it('getCc() should normalize MailAddress array', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        cc: [{ address: 'cc1@test.com', name: 'CC1' }, { address: 'cc2@test.com', name: 'CC2' }],
      });
      expect(msg.getCc()).toEqual(['cc1@test.com', 'cc2@test.com']);
    });

    it('getBcc() should normalize single MailAddress', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        bcc: { address: 'bcc@test.com', name: 'BCC' },
      });
      expect(msg.getBcc()).toEqual(['bcc@test.com']);
    });
  });

  describe('hasReplyTo()', () => {
    it('should return false when no replyTo', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.hasReplyTo('reply@test.com')).toBe(false);
    });

    it('should match string replyTo', () => {
      const msg = new AssertableMessage({ ...baseOptions, replyTo: 'reply@test.com' });
      expect(msg.hasReplyTo('reply@test.com')).toBe(true);
      expect(msg.hasReplyTo('REPLY@TEST.COM')).toBe(true);
    });

    it('should match MailAddress replyTo', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        replyTo: { address: 'reply@test.com', name: 'Reply' },
      });
      expect(msg.hasReplyTo('reply@test.com')).toBe(true);
    });
  });

  describe('getTo() with normalizeRecipients()', () => {
    it('should normalize string recipient', () => {
      const msg = new AssertableMessage({ ...baseOptions, to: 'single@test.com' });
      expect(msg.getTo()).toEqual(['single@test.com']);
    });

    it('should normalize string array recipients', () => {
      const msg = new AssertableMessage({ ...baseOptions, to: ['a@test.com', 'b@test.com'] });
      expect(msg.getTo()).toEqual(['a@test.com', 'b@test.com']);
    });

    it('should normalize MailAddress recipients', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        to: { address: 'addr@test.com', name: 'Name' },
      });
      expect(msg.getTo()).toEqual(['addr@test.com']);
    });

    it('should normalize MailAddress array recipients', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        to: [{ address: 'a@test.com', name: 'A' }, { address: 'b@test.com', name: 'B' }],
      });
      expect(msg.getTo()).toEqual(['a@test.com', 'b@test.com']);
    });

    it('should handle mixed array in normalize', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        to: ['plain@test.com', { address: 'obj@test.com', name: 'Obj' }] as any,
      });
      expect(msg.getTo()).toEqual(['plain@test.com', 'obj@test.com']);
    });
  });

  describe('failover methods', () => {
    it('wasFailoverUsed() returns false when no response', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.wasFailoverUsed()).toBe(false);
    });

    it('wasFailoverUsed() returns true when failover was used', () => {
      const response: MailResponse = { success: true, failoverUsed: true, messageId: '1' };
      const msg = new AssertableMessage(baseOptions, undefined, response);
      expect(msg.wasFailoverUsed()).toBe(true);
    });

    it('getProvider() returns undefined when no response', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.getProvider()).toBeUndefined();
    });

    it('getProvider() returns provider name from response', () => {
      const response: MailResponse = { success: true, provider: 'sendgrid', messageId: '1' };
      const msg = new AssertableMessage(baseOptions, undefined, response);
      expect(msg.getProvider()).toBe('sendgrid');
    });

    it('getFailoverAttempts() returns empty array when no response', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.getFailoverAttempts()).toEqual([]);
    });

    it('getFailoverAttempts() returns attempts from response', () => {
      const attempts = [{ mailer: 'smtp', success: false, error: 'fail', durationMs: 100 }];
      const response: MailResponse = {
        success: true,
        messageId: '1',
        failoverAttempts: attempts,
      };
      const msg = new AssertableMessage(baseOptions, undefined, response);
      expect(msg.getFailoverAttempts()).toEqual(attempts);
    });

    it('getResponse() returns undefined when no response', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.getResponse()).toBeUndefined();
    });

    it('getResponse() returns the response', () => {
      const response: MailResponse = { success: true, messageId: '1' };
      const msg = new AssertableMessage(baseOptions, undefined, response);
      expect(msg.getResponse()).toBe(response);
    });
  });

  describe('markdown methods', () => {
    it('isMarkdown() returns false for non-markdown', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.isMarkdown()).toBe(false);
    });

    it('isMarkdown() returns true when __markdown is in data', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        data: { __markdown: '# Hello' },
      });
      expect(msg.isMarkdown()).toBe(true);
    });

    it('getMarkdown() returns undefined for non-markdown', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.getMarkdown()).toBeUndefined();
    });

    it('getMarkdown() returns the markdown content', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        data: { __markdown: '# Hello World' },
      });
      expect(msg.getMarkdown()).toBe('# Hello World');
    });

    it('markdownContains() returns false for non-markdown', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.markdownContains('anything')).toBe(false);
    });

    it('markdownContains() checks markdown content', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        data: { __markdown: '# Welcome to our service' },
      });
      expect(msg.markdownContains('Welcome')).toBe(true);
      expect(msg.markdownContains('Goodbye')).toBe(false);
    });
  });
});
