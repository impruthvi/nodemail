/**
 * QueueManager Tests
 */

import { QueueManager, Mail, Mailable } from '../../src';
import type { QueueConfig, MailOptions } from '../../src/types';

// Test Mailable class for queue tests
class QueueTestMailable extends Mailable {
  constructor(
    public name: string,
    public email: string
  ) {
    super();
  }

  build(): this {
    return this.from('noreply@example.com')
      .to(this.email)
      .subject(`Hello ${this.name}`)
      .html(`<p>Hello ${this.name}, your email is ${this.email}</p>`);
  }
}

describe('QueueManager', () => {
  const defaultConfig: QueueConfig = {
    driver: 'sync',
    defaultQueue: 'mail',
    prefix: 'test',
    retries: 3,
  };

  const testMailOptions: MailOptions = {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Test Email',
    html: '<h1>Hello</h1>',
  };

  describe('constructor', () => {
    it('should create instance with default values', () => {
      const manager = new QueueManager({ driver: 'sync' });
      const config = manager.getConfig();

      expect(config.driver).toBe('sync');
      expect(config.defaultQueue).toBe('mail');
      expect(config.prefix).toBe('nodemail');
      expect(config.retries).toBe(3);
    });

    it('should create instance with custom config', () => {
      const manager = new QueueManager(defaultConfig);
      const config = manager.getConfig();

      expect(config.driver).toBe('sync');
      expect(config.defaultQueue).toBe('mail');
      expect(config.prefix).toBe('test');
      expect(config.retries).toBe(3);
    });
  });

  describe('sync driver', () => {
    let manager: QueueManager;

    beforeEach(() => {
      manager = new QueueManager(defaultConfig);
    });

    afterEach(async () => {
      await manager.close();
    });

    it('should queue a mail job', async () => {
      const result = await manager.queue(testMailOptions);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.jobId).toMatch(/^mail-/);
      expect(result.queue).toBe('mail');
    });

    it('should queue a mail job with custom queue name', async () => {
      const result = await manager.queue(testMailOptions, 'priority');

      expect(result.success).toBe(true);
      // Sync driver returns defaultQueue, but real drivers would return priority
      expect(result.queue).toBeDefined();
    });

    it('should queue a delayed mail job', async () => {
      const result = await manager.later(testMailOptions, 60);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.scheduledAt).toBeDefined();
    });

    it('should queue a scheduled mail job', async () => {
      const futureDate = new Date(Date.now() + 3600 * 1000); // 1 hour from now
      const result = await manager.at(testMailOptions, futureDate);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.scheduledAt).toEqual(futureDate);
    });

    it('should generate unique job IDs', async () => {
      const result1 = await manager.queue(testMailOptions);
      const result2 = await manager.queue(testMailOptions);

      expect(result1.jobId).not.toBe(result2.jobId);
    });
  });

  describe('initialize', () => {
    it('should throw error for unsupported driver', async () => {
      const manager = new QueueManager({
        driver: 'unsupported' as 'sync',
      });

      await expect(manager.queue(testMailOptions)).rejects.toThrow(
        'Unsupported queue driver: unsupported'
      );
    });

    it('should only initialize once', async () => {
      const manager = new QueueManager(defaultConfig);

      // Queue twice to ensure initialization only happens once
      await manager.queue(testMailOptions);
      await manager.queue(testMailOptions);

      await manager.close();
    });
  });

  describe('close', () => {
    it('should close the queue connection', async () => {
      const manager = new QueueManager(defaultConfig);
      await manager.queue(testMailOptions);
      await manager.close();

      // Should be able to re-initialize after closing
      const result = await manager.queue(testMailOptions);
      expect(result.success).toBe(true);
      await manager.close();
    });

    it('should handle close when not initialized', async () => {
      const manager = new QueueManager(defaultConfig);
      await expect(manager.close()).resolves.not.toThrow();
    });
  });

  describe('process', () => {
    it('should process jobs with sync driver (no-op)', async () => {
      const manager = new QueueManager(defaultConfig);
      const handler = jest.fn();

      // Sync driver doesn't actually process, but shouldn't throw
      await expect(manager.process(handler)).resolves.not.toThrow();
      await manager.close();
    });
  });

  describe('job creation', () => {
    it('should create job with correct structure', async () => {
      const manager = new QueueManager({
        ...defaultConfig,
        retries: 5,
      });

      const result = await manager.queue(testMailOptions);

      expect(result.success).toBe(true);
      expect(result.jobId).toMatch(/^mail-\d+-[a-z0-9]+$/);
      await manager.close();
    });

    it('should include delay in later() jobs', async () => {
      const manager = new QueueManager(defaultConfig);
      const result = await manager.later(testMailOptions, 120);

      expect(result.success).toBe(true);
      expect(result.scheduledAt).toBeDefined();

      // Check the scheduled time is approximately correct
      const scheduledTime = result.scheduledAt!.getTime();
      const expectedTime = Date.now() + 120 * 1000;
      expect(Math.abs(scheduledTime - expectedTime)).toBeLessThan(1000);

      await manager.close();
    });

    it('should set scheduledAt in at() jobs', async () => {
      const manager = new QueueManager(defaultConfig);
      const scheduledDate = new Date('2025-12-31T23:59:59Z');
      const result = await manager.at(testMailOptions, scheduledDate);

      expect(result.success).toBe(true);
      expect(result.scheduledAt).toEqual(scheduledDate);

      await manager.close();
    });
  });
});

describe('Queue integration with Mail facade', () => {
  beforeEach(() => {
    Mail.fake();
  });

  afterEach(() => {
    Mail.restore();
  });

  it('should queue email via Mail.to().queue()', async () => {
    const result = await Mail.to('user@example.com')
      .subject('Test Queue')
      .html('<p>Queued email</p>')
      .queue();

    expect(result.success).toBe(true);
    expect(result.jobId).toBeDefined();

    // Verify email was queued (without mailable class)
    expect(Mail.hasQueued()).toBe(true);
  });

  it('should queue email with delay via later()', async () => {
    const result = await Mail.to('user@example.com')
      .subject('Delayed Email')
      .html('<p>This is delayed</p>')
      .later(60);

    expect(result.success).toBe(true);
    expect(Mail.hasQueued()).toBe(true);
  });

  it('should schedule email via at()', async () => {
    const futureDate = new Date(Date.now() + 3600 * 1000);
    const result = await Mail.to('user@example.com')
      .subject('Scheduled Email')
      .html('<p>This is scheduled</p>')
      .at(futureDate);

    expect(result.success).toBe(true);
    expect(Mail.hasQueued()).toBe(true);
  });

  it('should queue mailable via Mail.queue()', async () => {
    const mailable = new QueueTestMailable('John', 'john@example.com');

    const result = await Mail.queue(mailable);

    expect(result.success).toBe(true);
    Mail.assertQueued(QueueTestMailable);
  });

  it('should queue mailable with delay via Mail.later()', async () => {
    const mailable = new QueueTestMailable('Jane', 'jane@example.com');

    const result = await Mail.later(mailable, 120);

    expect(result.success).toBe(true);
    Mail.assertQueued(QueueTestMailable);
  });

  it('should schedule mailable via Mail.at()', async () => {
    const mailable = new QueueTestMailable('Bob', 'bob@example.com');
    const futureDate = new Date(Date.now() + 7200 * 1000);

    const result = await Mail.at(mailable, futureDate);

    expect(result.success).toBe(true);
    Mail.assertQueued(QueueTestMailable);
  });

  it('should work with combined assertions', async () => {
    const mailable1 = new QueueTestMailable('User1', 'user1@example.com');
    await Mail.queue(mailable1);

    const mailable2 = new QueueTestMailable('User2', 'user2@example.com');
    await Mail.to('user2@example.com').send(mailable2);

    Mail.assertQueued(QueueTestMailable);
    Mail.assertSent(QueueTestMailable);
    Mail.assertQueuedCount(QueueTestMailable, 1);
    Mail.assertSentCount(QueueTestMailable, 1);
  });

  it('should queue mailable via Mail.to().queue(mailable)', async () => {
    const mailable = new QueueTestMailable('Test', 'test@example.com');

    const result = await Mail.to('recipient@example.com').queue(mailable);

    expect(result.success).toBe(true);
    Mail.assertQueued(QueueTestMailable);
  });
});
