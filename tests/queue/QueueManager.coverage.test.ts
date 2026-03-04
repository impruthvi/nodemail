/**
 * QueueManager Coverage Tests - Additional tests for branch coverage
 */

import { QueueManager } from '../../src/queue/QueueManager';
import type { QueueConfig, MailOptions } from '../../src/types';

describe('QueueManager - Coverage Tests', () => {
  const testMailOptions: MailOptions = {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Test Email',
    html: '<h1>Hello</h1>',
  };

  describe('getJobCounts() with sync driver', () => {
    it('should return null when driver does not support getJobCounts', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      const counts = await manager.getJobCounts();

      expect(counts).toBeNull();
      await manager.close();
    });

    it('should return null with custom queue name', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      const counts = await manager.getJobCounts('custom-queue');

      expect(counts).toBeNull();
      await manager.close();
    });
  });

  describe('clearJobs() with sync driver', () => {
    it('should throw error when driver does not support clear', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      await expect(manager.clearJobs('failed')).rejects.toThrow(
        'Queue driver does not support clearing jobs'
      );
      await manager.close();
    });

    it('should throw error for completed status', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      await expect(manager.clearJobs('completed')).rejects.toThrow(
        'Queue driver does not support clearing jobs'
      );
      await manager.close();
    });

    it('should throw error for delayed status', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      await expect(manager.clearJobs('delayed')).rejects.toThrow(
        'Queue driver does not support clearing jobs'
      );
      await manager.close();
    });

    it('should throw error for waiting status', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      await expect(manager.clearJobs('waiting')).rejects.toThrow(
        'Queue driver does not support clearing jobs'
      );
      await manager.close();
    });

    it('should throw error with custom queue name', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      await expect(manager.clearJobs('failed', 'priority-queue')).rejects.toThrow(
        'Queue driver does not support clearing jobs'
      );
      await manager.close();
    });
  });

  describe('retryFailedJobs() with sync driver', () => {
    it('should throw error when driver does not support retryFailed', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      await expect(manager.retryFailedJobs()).rejects.toThrow(
        'Queue driver does not support retrying failed jobs'
      );
      await manager.close();
    });

    it('should throw error with custom queue name', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      await expect(manager.retryFailedJobs('priority-queue')).rejects.toThrow(
        'Queue driver does not support retrying failed jobs'
      );
      await manager.close();
    });
  });

  describe('getFailedJobs() with sync driver', () => {
    it('should return empty array when driver does not support getFailedJobs', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      const failed = await manager.getFailedJobs();

      expect(failed).toEqual([]);
      await manager.close();
    });

    it('should return empty array with custom queue name', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      const failed = await manager.getFailedJobs('custom-queue');

      expect(failed).toEqual([]);
      await manager.close();
    });

    it('should return empty array with custom limit', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      const failed = await manager.getFailedJobs('mail', 50);

      expect(failed).toEqual([]);
      await manager.close();
    });
  });

  describe('process() with sync driver', () => {
    it('should process jobs with sync driver (no-op)', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);
      const handler = jest.fn();

      await expect(manager.process(handler)).resolves.not.toThrow();
      await manager.close();
    });

    it('should process jobs from custom queue', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);
      const handler = jest.fn();

      await expect(manager.process(handler, 'priority-queue')).resolves.not.toThrow();
      await manager.close();
    });
  });

  describe('config defaults', () => {
    it('should use default backoff configuration', () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);
      const actualConfig = manager.getConfig();

      expect(actualConfig.backoff).toEqual({ type: 'exponential', delay: 1000 });
    });

    it('should use default connection configuration', () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);
      const actualConfig = manager.getConfig();

      expect(actualConfig.connection).toEqual({ host: 'localhost', port: 6379 });
    });

    it('should respect retries set to 0', () => {
      const config: QueueConfig = { driver: 'sync', retries: 0 };
      const manager = new QueueManager(config);
      const actualConfig = manager.getConfig();

      expect(actualConfig.retries).toBe(0);
    });

    it('should use default prefix', () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);
      const actualConfig = manager.getConfig();

      expect(actualConfig.prefix).toBe('nodemail');
    });

    it('should use custom prefix', () => {
      const config: QueueConfig = { driver: 'sync', prefix: 'myapp' };
      const manager = new QueueManager(config);
      const actualConfig = manager.getConfig();

      expect(actualConfig.prefix).toBe('myapp');
    });
  });

  describe('queue operations with sync driver', () => {
    it('should queue with custom queue name', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      const result = await manager.queue(testMailOptions, 'priority');

      expect(result.success).toBe(true);
      await manager.close();
    });

    it('should later with custom queue name', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);

      const result = await manager.later(testMailOptions, 60, 'delayed-queue');

      expect(result.success).toBe(true);
      expect(result.scheduledAt).toBeDefined();
      await manager.close();
    });

    it('should at with custom queue name', async () => {
      const config: QueueConfig = { driver: 'sync' };
      const manager = new QueueManager(config);
      const futureDate = new Date(Date.now() + 3600000);

      const result = await manager.at(testMailOptions, futureDate, 'scheduled-queue');

      expect(result.success).toBe(true);
      expect(result.scheduledAt).toEqual(futureDate);
      await manager.close();
    });
  });

  describe('unsupported driver', () => {
    it('should throw error for unsupported driver', async () => {
      const config: QueueConfig = { driver: 'invalid' as 'sync' };
      const manager = new QueueManager(config);

      await expect(manager.queue(testMailOptions)).rejects.toThrow(
        'Unsupported queue driver: invalid'
      );
    });
  });
});
