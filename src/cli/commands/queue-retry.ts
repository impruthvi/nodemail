/**
 * queue:retry command - Retry all failed jobs
 */

import { output } from '../utils/output.js';
import { loadConfig } from '../utils/config-loader.js';
import { MailManager } from '../../core/MailManager.js';

interface QueueRetryOptions {
  queue: string;
  config?: string;
}

export async function queueRetry(options: QueueRetryOptions): Promise<void> {
  try {
    const { config } = await loadConfig(options.config);

    if (!config.queue) {
      await output.error('Queue is not configured. Add a "queue" section to your config.');
      process.exit(1);
    }

    const manager = new MailManager(config);
    const queueManager = manager.getQueueManager();

    if (!queueManager) {
      await output.error('Queue manager could not be initialized.');
      process.exit(1);
    }

    // First show how many failed jobs there are
    const counts = await queueManager.getJobCounts(options.queue);

    if (counts && counts.failed === 0) {
      await output.info('No failed jobs to retry.');
      await queueManager.close();
      return;
    }

    await output.info(`Retrying ${counts?.failed ?? 'unknown number of'} failed jobs...`);

    const retried = await queueManager.retryFailedJobs(options.queue);

    await output.success(`Retried ${retried} failed jobs`);

    // Close connection
    await queueManager.close();
  } catch (error) {
    await output.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
