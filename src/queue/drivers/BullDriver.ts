/**
 * Bull Driver - Queue driver using Bull (legacy)
 * Requires: npm install bull
 */

import type {
  QueueConfig,
  QueueDriver,
  QueuedMailJob,
  QueueJobResult,
  MailResponse,
} from '../../types';

// Dynamic import types
type BullQueue = import('bull').Queue;
type BullJob = import('bull').Job;

export class BullDriver implements QueueDriver {
  private queues: Map<string, BullQueue> = new Map();
  private config: QueueConfig;
  private Bull: typeof import('bull') | null = null;

  constructor(config: QueueConfig) {
    this.config = config;
  }

  /**
   * Load Bull dynamically
   */
  private async loadBull(): Promise<void> {
    if (this.Bull) return;

    try {
      // Bull uses default export
      const bull = await import('bull');
      this.Bull = bull.default || bull;
    } catch {
      throw new Error(
        'Bull is not installed. Please install it with: npm install bull'
      );
    }
  }

  /**
   * Get or create a queue instance
   */
  private async getQueue(name: string): Promise<BullQueue> {
    await this.loadBull();

    const queueName = `${this.config.prefix}:${name}`;
    let queue = this.queues.get(queueName);

    if (!queue) {
      const redisOptions = this.getRedisOptions();
      queue = new this.Bull!(queueName, {
        redis: redisOptions,
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
  private getRedisOptions(): string | Record<string, unknown> {
    const conn = this.config.connection || {};

    if (conn.url) {
      return conn.url;
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
        jobId: String(bullJob.id),
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
        jobId: String(bullJob.id),
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
      const queue = await this.getQueue(queueName);

      // Bull's process method doesn't return a promise
      void queue.process('send-mail', 5, async (bullJob: BullJob) => {
        const mailJob = bullJob.data as QueuedMailJob;
        mailJob.attempts = bullJob.attemptsMade + 1;

        const result = await handler(mailJob);

        if (!result.success) {
          throw new Error(result.error || 'Failed to send email');
        }

        return result;
      });

      queue.on('completed', (job: BullJob) => {
        // Using warn since console.log is disallowed
        console.warn(`[Queue] Job ${String(job.id)} completed`);
      });

      queue.on('failed', (job: BullJob, error: Error) => {
        console.error(`[Queue] Job ${String(job.id)} failed:`, error.message);
      });
    })();
  }

  /**
   * Close all queue connections
   */
  async close(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();
  }
}
