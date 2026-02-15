import { Mail } from '../../src/core/MailFacade';
import { Mailable } from '../../src/core/Mailable';
import type { MailConfig } from '../../src/types';

// Mock providers
jest.mock('../../src/providers/SmtpProvider');
jest.mock('../../src/providers/SendGridProvider');
jest.mock('../../src/providers/SesProvider');

class TestMailable extends Mailable {
  build(): this {
    return this
      .subject('Test Subject')
      .html('<p>Hello</p>')
      .text('Hello');
  }
}

describe('MailFacade - extended coverage', () => {
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

  describe('FakeableMessageBuilder queue methods in fake mode', () => {
    beforeEach(() => {
      Mail.configure(config);
      Mail.fake();
    });

    describe('queue()', () => {
      it('should queue with mailable in fake mode', async () => {
        const result = await Mail.to('user@test.com').queue(new TestMailable().build());
        expect(result.success).toBe(true);
        expect(result.queue).toBe('mail');
      });

      it('should queue without mailable in fake mode', async () => {
        const result = await Mail.to('user@test.com')
          .subject('Direct Subject')
          .html('<p>Direct</p>')
          .queue();
        expect(result.success).toBe(true);
      });

      it('should throw without subject and without mailable', async () => {
        await expect(
          Mail.to('user@test.com').queue()
        ).rejects.toThrow('Email subject is required');
      });
    });

    describe('later()', () => {
      it('should queue with delay and mailable in fake mode', async () => {
        const result = await Mail.to('user@test.com').later(60, new TestMailable().build());
        expect(result.success).toBe(true);
      });

      it('should queue with delay without mailable in fake mode', async () => {
        const result = await Mail.to('user@test.com')
          .subject('Delayed')
          .html('<p>Delayed</p>')
          .later(30);
        expect(result.success).toBe(true);
      });

      it('should throw without subject and without mailable', async () => {
        await expect(
          Mail.to('user@test.com').later(60)
        ).rejects.toThrow('Email subject is required');
      });
    });

    describe('at()', () => {
      it('should schedule with mailable in fake mode', async () => {
        const date = new Date(Date.now() + 60000);
        const result = await Mail.to('user@test.com').at(date, new TestMailable().build());
        expect(result.success).toBe(true);
      });

      it('should schedule without mailable in fake mode', async () => {
        const date = new Date(Date.now() + 60000);
        const result = await Mail.to('user@test.com')
          .subject('Scheduled')
          .html('<p>Scheduled</p>')
          .at(date);
        expect(result.success).toBe(true);
      });

      it('should throw without subject and without mailable', async () => {
        const date = new Date(Date.now() + 60000);
        await expect(
          Mail.to('user@test.com').at(date)
        ).rejects.toThrow('Email subject is required');
      });
    });
  });

  describe('FakeableMessageBuilder send in fake mode', () => {
    beforeEach(() => {
      Mail.configure(config);
      Mail.fake();
    });

    it('should send with mailable in fake mode', async () => {
      const result = await Mail.to('user@test.com').send(new TestMailable().build());
      expect(result.success).toBe(true);
    });

    it('should send without mailable in fake mode', async () => {
      const result = await Mail.to('user@test.com')
        .subject('Direct')
        .html('<p>Hello</p>')
        .send();
      expect(result.success).toBe(true);
    });

    it('should throw without subject when sending without mailable', async () => {
      await expect(
        Mail.to('user@test.com').send()
      ).rejects.toThrow('Email subject is required');
    });
  });

  describe('FakeableMessageBuilder fluent methods', () => {
    beforeEach(() => {
      Mail.configure(config);
      Mail.fake();
    });

    it('should chain all builder methods', async () => {
      const result = await Mail.to('user@test.com')
        .from('sender@test.com')
        .subject('Chained')
        .html('<p>Chained</p>')
        .text('Chained')
        .cc('cc@test.com')
        .bcc('bcc@test.com')
        .replyTo('reply@test.com')
        .headers({ 'X-Custom': 'value' })
        .attachments([{ filename: 'file.txt', content: 'data' }])
        .template('welcome')
        .data({ key: 'value' })
        .send();

      expect(result.success).toBe(true);
    });
  });

  describe('Mail static queue/later/at methods', () => {
    beforeEach(() => {
      Mail.configure(config);
      Mail.fake();
    });

    it('Mail.queue() should work in fake mode', async () => {
      const result = await Mail.queue(new TestMailable().build().to('user@test.com'));
      expect(result.success).toBe(true);
    });

    it('Mail.later() should work in fake mode', async () => {
      const result = await Mail.later(new TestMailable().build().to('user@test.com'), 30);
      expect(result.success).toBe(true);
    });

    it('Mail.at() should work in fake mode', async () => {
      const date = new Date(Date.now() + 60000);
      const result = await Mail.at(new TestMailable().build().to('user@test.com'), date);
      expect(result.success).toBe(true);
    });

    it('Mail.processQueue() should be noop in fake mode', async () => {
      await expect(Mail.processQueue()).resolves.toBeUndefined();
    });
  });

  describe('assertQueued / assertNotQueued', () => {
    beforeEach(() => {
      Mail.configure(config);
      Mail.fake();
    });

    it('should assert queued messages', async () => {
      await Mail.to('user@test.com').queue(new TestMailable().build());
      Mail.assertQueued(TestMailable);
    });

    it('should assert queued count', async () => {
      await Mail.to('user@test.com').queue(new TestMailable().build());
      await Mail.to('user2@test.com').queue(new TestMailable().build());
      Mail.assertQueuedCount(TestMailable, 2);
    });

    it('should assert nothing queued', () => {
      Mail.assertNothingQueued();
    });

    it('should assert not queued', () => {
      Mail.assertNotQueued(TestMailable);
    });
  });
});
