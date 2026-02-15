/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */

import { BullDriver } from '../../src/queue/drivers/BullDriver';
import type { QueueConfig, QueuedMailJob } from '../../src/types';

describe('BullDriver', () => {
  let driver: BullDriver;
  let config: QueueConfig;
  let mockQueue: any;
  let MockBullConstructor: jest.Mock;

  const makeJob = (id = 'job-1'): QueuedMailJob => ({
    id,
    mailOptions: {
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Test</p>',
    },
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      driver: 'bull',
      defaultQueue: 'mail',
      prefix: 'nodemail',
      retries: 3,
      backoff: { type: 'exponential', delay: 1000 },
      connection: { host: 'localhost', port: 6379 },
    };

    mockQueue = {
      add: jest.fn(),
      process: jest.fn(),
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    MockBullConstructor = jest.fn().mockReturnValue(mockQueue);

    driver = new BullDriver(config);
    // Inject mock Bull constructor so loadBull() is bypassed
    (driver as any).Bull = MockBullConstructor;
  });

  describe('add()', () => {
    it('should add a job to the queue successfully', async () => {
      mockQueue.add.mockResolvedValue({ id: 'bull-1' });
      const result = await driver.add(makeJob());

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('bull-1');
      expect(result.queue).toBe('mail');
    });

    it('should use provided queue name', async () => {
      mockQueue.add.mockResolvedValue({ id: 'bull-2' });
      const result = await driver.add(makeJob(), 'custom-queue');

      expect(result.success).toBe(true);
      expect(result.queue).toBe('custom-queue');
    });

    it('should handle Error on failure', async () => {
      mockQueue.add.mockRejectedValue(new Error('Redis connection failed'));
      const result = await driver.add(makeJob());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis connection failed');
    });

    it('should handle non-Error on failure', async () => {
      mockQueue.add.mockRejectedValue('string error');
      const result = await driver.add(makeJob());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add job to queue');
    });

    it('should fall back to default queue name', async () => {
      const noDefaultConfig: QueueConfig = {
        ...config,
        defaultQueue: undefined,
      };
      const d = new BullDriver(noDefaultConfig);
      (d as any).Bull = MockBullConstructor;
      mockQueue.add.mockResolvedValue({ id: '1' });

      const result = await d.add(makeJob());
      expect(result.queue).toBe('mail');
    });
  });

  describe('addDelayed()', () => {
    it('should add a delayed job successfully', async () => {
      mockQueue.add.mockResolvedValue({ id: 'bull-d1' });
      const result = await driver.addDelayed(makeJob(), 60);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('bull-d1');
      expect(result.scheduledAt).toBeInstanceOf(Date);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-mail',
        expect.any(Object),
        expect.objectContaining({ delay: 60000 })
      );
    });

    it('should handle Error on failure', async () => {
      mockQueue.add.mockRejectedValue(new Error('Queue full'));
      const result = await driver.addDelayed(makeJob(), 30);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue full');
    });

    it('should handle non-Error on failure', async () => {
      mockQueue.add.mockRejectedValue(42);
      const result = await driver.addDelayed(makeJob(), 30);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add delayed job to queue');
    });
  });

  describe('addScheduled()', () => {
    it('should call add() for past dates', async () => {
      mockQueue.add.mockResolvedValue({ id: 'bull-s1' });
      const pastDate = new Date(Date.now() - 10000);
      const result = await driver.addScheduled(makeJob(), pastDate);

      expect(result.success).toBe(true);
    });

    it('should call addDelayed() for future dates', async () => {
      mockQueue.add.mockResolvedValue({ id: 'bull-s2' });
      const futureDate = new Date(Date.now() + 60000);
      const result = await driver.addScheduled(makeJob(), futureDate);

      expect(result.success).toBe(true);
      expect(result.scheduledAt).toBeInstanceOf(Date);
    });
  });

  describe('process()', () => {
    it('should set up processing on the queue', async () => {
      const handler = jest.fn();
      driver.process('mail', handler);

      // Wait for async IIFE
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockQueue.process).toHaveBeenCalledWith('send-mail', 5, expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should call handler with job data during processing', async () => {
      const handler = jest.fn().mockResolvedValue({ success: true, messageId: '123' });
      driver.process('mail', handler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const processCallback = mockQueue.process.mock.calls[0][2];
      const mockBullJob = {
        data: makeJob(),
        attemptsMade: 0,
      };

      const result = await processCallback(mockBullJob);
      expect(handler).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw if handler returns failure', async () => {
      const handler = jest.fn().mockResolvedValue({ success: false, error: 'Send failed' });
      driver.process('mail', handler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const processCallback = mockQueue.process.mock.calls[0][2];
      const mockBullJob = { data: makeJob(), attemptsMade: 0 };

      await expect(processCallback(mockBullJob)).rejects.toThrow('Send failed');
    });

    it('should throw generic error when handler result has no error message', async () => {
      const handler = jest.fn().mockResolvedValue({ success: false });
      driver.process('mail', handler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const processCallback = mockQueue.process.mock.calls[0][2];
      const mockBullJob = { data: makeJob(), attemptsMade: 0 };

      await expect(processCallback(mockBullJob)).rejects.toThrow('Failed to send email');
    });

    it('should handle completed and failed events', async () => {
      const handler = jest.fn();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      driver.process('mail', handler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const completedCallback = mockQueue.on.mock.calls.find((c: any[]) => c[0] === 'completed')![1];
      completedCallback({ id: 'job-1' });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('job-1'));

      const failedCallback = mockQueue.on.mock.calls.find((c: any[]) => c[0] === 'failed')![1];
      failedCallback({ id: 'job-2' }, new Error('boom'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('job-2'), 'boom');

      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('close()', () => {
    it('should close all queues', async () => {
      mockQueue.add.mockResolvedValue({ id: '1' });
      await driver.add(makeJob());

      await driver.close();
      expect(mockQueue.close).toHaveBeenCalled();
    });

    it('should work with no queues', async () => {
      await driver.close();
      expect(mockQueue.close).not.toHaveBeenCalled();
    });
  });

  describe('queue caching', () => {
    it('should reuse cached queue for same name', async () => {
      mockQueue.add.mockResolvedValue({ id: '1' });
      await driver.add(makeJob(), 'mail');
      await driver.add(makeJob('job-2'), 'mail');

      // Bull constructor should only be called once for the same queue
      expect(MockBullConstructor).toHaveBeenCalledTimes(1);
    });

    it('should create separate queues for different names', async () => {
      mockQueue.add.mockResolvedValue({ id: '1' });
      await driver.add(makeJob(), 'queue-a');
      await driver.add(makeJob('job-2'), 'queue-b');

      expect(MockBullConstructor).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRedisOptions', () => {
    it('should use URL when provided', async () => {
      const urlConfig: QueueConfig = {
        ...config,
        connection: { url: 'redis://myhost:6380' },
      };
      const urlDriver = new BullDriver(urlConfig);
      (urlDriver as any).Bull = MockBullConstructor;
      mockQueue.add.mockResolvedValue({ id: '1' });
      await urlDriver.add(makeJob());

      expect(MockBullConstructor).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ redis: 'redis://myhost:6380' })
      );
    });

    it('should use host/port when URL not provided', async () => {
      mockQueue.add.mockResolvedValue({ id: '1' });
      await driver.add(makeJob());

      expect(MockBullConstructor).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          redis: expect.objectContaining({ host: 'localhost', port: 6379 }),
        })
      );
    });

    it('should use defaults when connection is empty', async () => {
      const emptyConfig: QueueConfig = {
        ...config,
        connection: {},
      };
      const emptyDriver = new BullDriver(emptyConfig);
      (emptyDriver as any).Bull = MockBullConstructor;
      mockQueue.add.mockResolvedValue({ id: '1' });
      await emptyDriver.add(makeJob());

      expect(MockBullConstructor).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          redis: expect.objectContaining({ host: 'localhost', port: 6379, db: 0 }),
        })
      );
    });

    it('should use defaults when no connection config', async () => {
      const noConnConfig: QueueConfig = {
        driver: 'bull',
        defaultQueue: 'mail',
        prefix: 'nodemail',
      };
      const d = new BullDriver(noConnConfig);
      (d as any).Bull = MockBullConstructor;
      mockQueue.add.mockResolvedValue({ id: '1' });
      await d.add(makeJob());

      expect(MockBullConstructor).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          redis: expect.objectContaining({ host: 'localhost', port: 6379, db: 0 }),
        })
      );
    });
  });

  describe('loadBull()', () => {
    it('should skip loading if already loaded', async () => {
      // Bull is already set via beforeEach, so this should work
      mockQueue.add.mockResolvedValue({ id: '1' });
      const result = await driver.add(makeJob());
      expect(result.success).toBe(true);
    });

    it('should throw when Bull is not installed', async () => {
      const freshDriver = new BullDriver(config);
      // Don't set Bull, so it will try dynamic import which will fail
      await expect(freshDriver.add(makeJob())).rejects.toThrow(
        'Bull is not installed'
      );
    });
  });
});
