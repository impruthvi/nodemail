/**
 * QueueManager - Manages mail queue operations
 * Supports Bull and BullMQ queue drivers
 */

import type {
  QueueConfig,
  QueueDriver,
  QueuedMailJob,
  QueueJobResult,
  MailOptions,
  MailResponse,
} from '../types';

export class QueueManager {
  private driver: QueueDriver | null = null;
  private config: QueueConfig;
  private initialized = false;

  constructor(config: QueueConfig) {
    this.config = {
      driver: config.driver || 'sync',
      defaultQueue: config.defaultQueue || 'mail',
      prefix: config.prefix || 'nodemail',
      retries: config.retries ?? 3,
      backoff: config.backoff || { type: 'exponential', delay: 1000 },
      connection: config.connection || { host: 'localhost', port: 6379 },
    };
  }

  /**
   * Initialize the queue driver
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    switch (this.config.driver) {
      case 'bullmq':
        this.driver = await this.createBullMQDriver();
        break;
      case 'bull':
        this.driver = await this.createBullDriver();
        break;
      case 'sync':
        this.driver = this.createSyncDriver();
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unsupported queue driver: ${this.config.driver}`);
    }

    this.initialized = true;
  }

  /**
   * Create BullMQ driver
   */
  private async createBullMQDriver(): Promise<QueueDriver> {
    const { BullMQDriver } = await import('./drivers/BullMQDriver.js');
    return new BullMQDriver(this.config);
  }

  /**
   * Create Bull driver
   */
  private async createBullDriver(): Promise<QueueDriver> {
    const { BullDriver } = await import('./drivers/BullDriver.js');
    return new BullDriver(this.config);
  }

  /**
   * Create sync driver (executes immediately, for testing/development)
   */
  private createSyncDriver(): QueueDriver {
    return {
      add: (job: QueuedMailJob): Promise<QueueJobResult> => {
        // Sync driver stores jobs for later processing
        return Promise.resolve({
          success: true,
          jobId: job.id,
          queue: this.config.defaultQueue!,
        });
      },
      addDelayed: (job: QueuedMailJob, delay: number): Promise<QueueJobResult> => {
        return Promise.resolve({
          success: true,
          jobId: job.id,
          queue: this.config.defaultQueue!,
          scheduledAt: new Date(Date.now() + delay * 1000),
        });
      },
      addScheduled: (job: QueuedMailJob, date: Date): Promise<QueueJobResult> => {
        return Promise.resolve({
          success: true,
          jobId: job.id,
          queue: this.config.defaultQueue!,
          scheduledAt: date,
        });
      },
      process: () => {
        // Sync driver doesn't process in background
      },
      close: (): Promise<void> => {
        // Nothing to close
        return Promise.resolve();
      },
    };
  }

  /**
   * Get the queue driver, initializing if needed
   */
  private async getDriver(): Promise<QueueDriver> {
    if (!this.driver) {
      await this.initialize();
    }
    return this.driver!;
  }

  /**
   * Add a mail job to the queue
   */
  async queue(mailOptions: MailOptions, queueName?: string): Promise<QueueJobResult> {
    const driver = await this.getDriver();
    const job = this.createJob(mailOptions);
    return driver.add(job, queueName || this.config.defaultQueue);
  }

  /**
   * Add a delayed mail job to the queue
   */
  async later(
    mailOptions: MailOptions,
    delaySeconds: number,
    queueName?: string
  ): Promise<QueueJobResult> {
    const driver = await this.getDriver();
    const job = this.createJob(mailOptions, delaySeconds);
    return driver.addDelayed(job, delaySeconds, queueName || this.config.defaultQueue);
  }

  /**
   * Schedule a mail job for a specific time
   */
  async at(
    mailOptions: MailOptions,
    date: Date,
    queueName?: string
  ): Promise<QueueJobResult> {
    const driver = await this.getDriver();
    const delayMs = date.getTime() - Date.now();
    const job = this.createJob(mailOptions, Math.floor(delayMs / 1000));
    job.scheduledAt = date;
    return driver.addScheduled(job, date, queueName || this.config.defaultQueue);
  }

  /**
   * Start processing jobs from the queue
   */
  async process(
    handler: (job: QueuedMailJob) => Promise<MailResponse>,
    queueName?: string
  ): Promise<void> {
    const driver = await this.getDriver();
    driver.process(queueName || this.config.defaultQueue!, handler);
  }

  /**
   * Close the queue connection
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this.initialized = false;
    }
  }

  /**
   * Create a mail job object
   */
  private createJob(mailOptions: MailOptions, delay?: number): QueuedMailJob {
    const job: QueuedMailJob = {
      id: this.generateJobId(),
      mailOptions,
      attempts: 0,
      maxAttempts: this.config.retries!,
      createdAt: new Date(),
    };

    if (delay !== undefined) {
      job.delay = delay;
    }

    return job;
  }

  /**
   * Generate a unique job ID
   */
  private generateJobId(): string {
    return `mail-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get the current configuration
   */
  getConfig(): QueueConfig {
    return this.config;
  }
}
