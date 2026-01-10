/**
 * BullMQ Driver - Queue driver using BullMQ
 * Requires: npm install bullmq ioredis
 */

import type {
  QueueConfig,
  QueueDriver,
  QueuedMailJob,
  QueueJobResult,
  MailResponse,
} from '../../types';

// Dynamic import types
type BullMQQueue = import('bullmq').Queue;
type BullMQWorker = import('bullmq').Worker;
type BullMQJob = import('bullmq').Job;

export class BullMQDriver implements QueueDriver {
  private queues: Map<string, BullMQQueue> = new Map();
  private workers: Map<string, BullMQWorker> = new Map();
  private config: QueueConfig;
  private Queue: typeof import('bullmq').Queue | null = null;
  private Worker: typeof import('bullmq').Worker | null = null;

  constructor(config: QueueConfig) {
    this.config = config;
  }

  /**
   * Load BullMQ dynamically
   */
  private async loadBullMQ(): Promise<void> {
    if (this.Queue && this.Worker) return;

    try {
      const bullmq = await import('bullmq');
      this.Queue = bullmq.Queue;
      this.Worker = bullmq.Worker;
    } catch {
      throw new Error(
        'BullMQ is not installed. Please install it with: npm install bullmq ioredis'
      );
    }
  }

  /**
   * Get or create a queue instance
   */
  private async getQueue(name: string): Promise<BullMQQueue> {
    await this.loadBullMQ();

    const queueName = `${this.config.prefix}:${name}`;
    let queue = this.queues.get(queueName);

    if (!queue) {
      const connectionOptions = this.getConnectionOptions();
      queue = new this.Queue!(queueName, {
        connection: connectionOptions,
        defaultJobOptions: {
          attempts: this.config.retries || 3,
          backoff: {
            type: this.config.backoff?.type || 'exponential',
            delay: this.config.backoff?.delay || 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      });
      this.queues.set(queueName, queue);
    }

    return queue;
  }

  /**
   * Get Redis connection options
   */
  private getConnectionOptions(): Record<string, unknown> {
    const conn = this.config.connection || {};

    if (conn.url) {
      return { url: conn.url };
    }

    return {
      host: conn.host || 'localhost',
      port: conn.port || 6379,
      password: conn.password,
      db: conn.db || 0,
    };
  }

  /**
   * Add a job to the queue
   */
  async add(job: QueuedMailJob, queueName?: string): Promise<QueueJobResult> {
    const name = queueName || this.config.defaultQueue || 'mail';
    const queue = await this.getQueue(name);

    try {
      const bullJob = await queue.add('send-mail', job, {
        jobId: job.id,
      });

      return {
        success: true,
        jobId: bullJob.id || job.id,
        queue: name,
      };
    } catch (error) {
      return {
        success: false,
        jobId: job.id,
        queue: name,
        error: error instanceof Error ? error.message : 'Failed to add job to queue',
      };
    }
  }

  /**
   * Add a delayed job to the queue
   */
  async addDelayed(
    job: QueuedMailJob,
    delaySeconds: number,
    queueName?: string
  ): Promise<QueueJobResult> {
    const name = queueName || this.config.defaultQueue || 'mail';
    const queue = await this.getQueue(name);

    try {
      const bullJob = await queue.add('send-mail', job, {
        jobId: job.id,
        delay: delaySeconds * 1000,
      });

      return {
        success: true,
        jobId: bullJob.id || job.id,
        queue: name,
        scheduledAt: new Date(Date.now() + delaySeconds * 1000),
      };
    } catch (error) {
      return {
        success: false,
        jobId: job.id,
        queue: name,
        error: error instanceof Error ? error.message : 'Failed to add delayed job to queue',
      };
    }
  }

  /**
   * Add a job scheduled for a specific time
   */
  async addScheduled(
    job: QueuedMailJob,
    date: Date,
    queueName?: string
  ): Promise<QueueJobResult> {
    const delayMs = date.getTime() - Date.now();
    if (delayMs < 0) {
      // If the date is in the past, execute immediately
      return this.add(job, queueName);
    }
    return this.addDelayed(job, Math.floor(delayMs / 1000), queueName);
  }

  /**
   * Process jobs from the queue
   */
  process(
    queueName: string,
    handler: (job: QueuedMailJob) => Promise<MailResponse>
  ): void {
    // We need to wrap this in an async IIFE since process can't be async
    void (async () => {
      await this.loadBullMQ();

      const fullQueueName = `${this.config.prefix}:${queueName}`;
      const connectionOptions = this.getConnectionOptions();

      const worker = new this.Worker!(
        fullQueueName,
        async (bullJob: BullMQJob) => {
          const mailJob = bullJob.data as QueuedMailJob;
          mailJob.attempts = (bullJob.attemptsMade || 0) + 1;

          const result = await handler(mailJob);

          if (!result.success) {
            throw new Error(result.error || 'Failed to send email');
          }

          return result;
        },
        {
          connection: connectionOptions,
          concurrency: 5,
        }
      );

      worker.on('completed', (job: BullMQJob) => {
        // Using warn since console.log is disallowed
        console.warn(`[Queue] Job ${String(job.id)} completed`);
      });

      worker.on('failed', (job: BullMQJob | undefined, error: Error) => {
        console.error(`[Queue] Job ${String(job?.id)} failed:`, error.message);
      });

      this.workers.set(fullQueueName, worker);
    })();
  }

  /**
   * Close all queue connections
   */
  async close(): Promise<void> {
    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    this.workers.clear();

    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();
  }
}
