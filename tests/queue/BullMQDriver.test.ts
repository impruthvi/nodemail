/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */

import { BullMQDriver } from '../../src/queue/drivers/BullMQDriver';
import type { QueueConfig, QueuedMailJob } from '../../src/types';

describe('BullMQDriver', () => {
  let driver: BullMQDriver;
  let config: QueueConfig;
  let mockQueue: any;
  let mockWorker: any;
  let MockQueueConstructor: jest.Mock;
  let MockWorkerConstructor: jest.Mock;

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
      driver: 'bullmq',
      defaultQueue: 'mail',
      prefix: 'nodemail',
      retries: 3,
      backoff: { type: 'exponential', delay: 1000 },
      connection: { host: 'localhost', port: 6379 },
    };

    mockQueue = {
      add: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockWorker = {
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    MockQueueConstructor = jest.fn().mockReturnValue(mockQueue);
    MockWorkerConstructor = jest.fn().mockReturnValue(mockWorker);

    driver = new BullMQDriver(config);
    // Inject mocks to bypass dynamic import
    (driver as any).Queue = MockQueueConstructor;
    (driver as any).Worker = MockWorkerConstructor;
  });

  describe('add()', () => {
    it('should add a job successfully', async () => {
      mockQueue.add.mockResolvedValue({ id: 'bmq-1' });
      const result = await driver.add(makeJob());

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('bmq-1');
      expect(result.queue).toBe('mail');
    });

    it('should use provided queue name', async () => {
      mockQueue.add.mockResolvedValue({ id: 'bmq-2' });
      const result = await driver.add(makeJob(), 'custom');

      expect(result.queue).toBe('custom');
    });

    it('should handle null job id (fallback to job.id)', async () => {
      mockQueue.add.mockResolvedValue({ id: null });
      const result = await driver.add(makeJob('fallback-id'));

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('fallback-id');
    });

    it('should handle Error on failure', async () => {
      mockQueue.add.mockRejectedValue(new Error('Connection refused'));
      const result = await driver.add(makeJob());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should handle non-Error on failure', async () => {
      mockQueue.add.mockRejectedValue('unknown');
      const result = await driver.add(makeJob());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add job to queue');
    });
  });

  describe('addDelayed()', () => {
    it('should add a delayed job successfully', async () => {
      mockQueue.add.mockResolvedValue({ id: 'bmq-d1' });
      const result = await driver.addDelayed(makeJob(), 120);

      expect(result.success).toBe(true);
      expect(result.scheduledAt).toBeInstanceOf(Date);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-mail',
        expect.any(Object),
        expect.objectContaining({ delay: 120000 })
      );
    });

    it('should handle null job id in delayed response', async () => {
      mockQueue.add.mockResolvedValue({ id: null });
      const result = await driver.addDelayed(makeJob('d-fallback'), 10);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('d-fallback');
    });

    it('should handle Error on failure', async () => {
      mockQueue.add.mockRejectedValue(new Error('Queue error'));
      const result = await driver.addDelayed(makeJob(), 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue error');
    });

    it('should handle non-Error on failure', async () => {
      mockQueue.add.mockRejectedValue(null);
      const result = await driver.addDelayed(makeJob(), 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add delayed job to queue');
    });
  });

  describe('addScheduled()', () => {
    it('should call add() for past dates', async () => {
      mockQueue.add.mockResolvedValue({ id: 'bmq-s1' });
      const pastDate = new Date(Date.now() - 10000);
      const result = await driver.addScheduled(makeJob(), pastDate);

      expect(result.success).toBe(true);
    });

    it('should call addDelayed() for future dates', async () => {
      mockQueue.add.mockResolvedValue({ id: 'bmq-s2' });
      const futureDate = new Date(Date.now() + 60000);
      const result = await driver.addScheduled(makeJob(), futureDate);

      expect(result.success).toBe(true);
      expect(result.scheduledAt).toBeInstanceOf(Date);
    });
  });

  describe('process()', () => {
    it('should create a worker and listen for events', async () => {
      const handler = jest.fn();
      driver.process('mail', handler);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(MockWorkerConstructor).toHaveBeenCalledWith(
        'nodemail:mail',
        expect.any(Function),
        expect.objectContaining({ concurrency: 5 })
      );
      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should call handler with job data', async () => {
      const handler = jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' });
      driver.process('mail', handler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const workerCallback = MockWorkerConstructor.mock.calls[0][1];
      const mockBullMQJob = {
        data: makeJob(),
        attemptsMade: 1,
      };

      const result = await workerCallback(mockBullMQJob);
      expect(handler).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle zero attemptsMade', async () => {
      const handler = jest.fn().mockResolvedValue({ success: true });
      driver.process('mail', handler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const workerCallback = MockWorkerConstructor.mock.calls[0][1];
      const mockBullMQJob = {
        data: makeJob(),
        attemptsMade: 0,
      };

      await workerCallback(mockBullMQJob);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ attempts: 1 }));
    });

    it('should throw if handler returns failure', async () => {
      const handler = jest.fn().mockResolvedValue({ success: false, error: 'Delivery failed' });
      driver.process('mail', handler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const workerCallback = MockWorkerConstructor.mock.calls[0][1];
      const mockBullMQJob = { data: makeJob(), attemptsMade: 0 };

      await expect(workerCallback(mockBullMQJob)).rejects.toThrow('Delivery failed');
    });

    it('should throw generic error when no error message', async () => {
      const handler = jest.fn().mockResolvedValue({ success: false });
      driver.process('mail', handler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const workerCallback = MockWorkerConstructor.mock.calls[0][1];
      const mockBullMQJob = { data: makeJob(), attemptsMade: 0 };

      await expect(workerCallback(mockBullMQJob)).rejects.toThrow('Failed to send email');
    });

    it('should handle completed and failed events', async () => {
      const handler = jest.fn();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      driver.process('mail', handler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const completedCb = mockWorker.on.mock.calls.find((c: any[]) => c[0] === 'completed')![1];
      completedCb({ id: 'j-1' });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('j-1'));

      const failedCb = mockWorker.on.mock.calls.find((c: any[]) => c[0] === 'failed')![1];
      failedCb({ id: 'j-2' }, new Error('boom'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('j-2'), 'boom');

      // Test with undefined job
      failedCb(undefined, new Error('no job'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('undefined'), 'no job');

      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('close()', () => {
    it('should close all workers and queues', async () => {
      mockQueue.add.mockResolvedValue({ id: '1' });
      await driver.add(makeJob());

      // Create a worker
      driver.process('mail', jest.fn());
      await new Promise((resolve) => setTimeout(resolve, 10));

      await driver.close();
      expect(mockWorker.close).toHaveBeenCalled();
      expect(mockQueue.close).toHaveBeenCalled();
    });

    it('should work with no queues or workers', async () => {
      await driver.close();
      expect(mockWorker.close).not.toHaveBeenCalled();
      expect(mockQueue.close).not.toHaveBeenCalled();
    });
  });

  describe('queue caching', () => {
    it('should reuse cached queue for same name', async () => {
      mockQueue.add.mockResolvedValue({ id: '1' });
      await driver.add(makeJob(), 'mail');
      await driver.add(makeJob('job-2'), 'mail');

      expect(MockQueueConstructor).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConnectionOptions', () => {
    it('should use URL when provided', async () => {
      const urlConfig: QueueConfig = {
        ...config,
        connection: { url: 'redis://myhost:6380' },
      };
      const urlDriver = new BullMQDriver(urlConfig);
      (urlDriver as any).Queue = MockQueueConstructor;
      (urlDriver as any).Worker = MockWorkerConstructor;
      mockQueue.add.mockResolvedValue({ id: '1' });
      await urlDriver.add(makeJob());

      expect(MockQueueConstructor).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          connection: { url: 'redis://myhost:6380' },
        })
      );
    });

    it('should use host/port defaults when connection is empty', async () => {
      const emptyConfig: QueueConfig = {
        ...config,
        connection: {},
      };
      const emptyDriver = new BullMQDriver(emptyConfig);
      (emptyDriver as any).Queue = MockQueueConstructor;
      (emptyDriver as any).Worker = MockWorkerConstructor;
      mockQueue.add.mockResolvedValue({ id: '1' });
      await emptyDriver.add(makeJob());

      expect(MockQueueConstructor).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          connection: expect.objectContaining({ host: 'localhost', port: 6379, db: 0 }),
        })
      );
    });
  });

  describe('loadBullMQ()', () => {
    it('should skip loading if already loaded', async () => {
      mockQueue.add.mockResolvedValue({ id: '1' });
      const result = await driver.add(makeJob());
      expect(result.success).toBe(true);
    });

    it('should throw when BullMQ is not installed', async () => {
      const freshDriver = new BullMQDriver(config);
      await expect(freshDriver.add(makeJob())).rejects.toThrow(
        'BullMQ is not installed'
      );
    });
  });
});
