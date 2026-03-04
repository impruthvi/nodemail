/**
 * queue:clear command - Clear jobs by status
 */

import { output } from '../utils/output.js';
import { loadConfig } from '../utils/config-loader.js';
import { MailManager } from '../../core/MailManager.js';

interface QueueClearOptions {
  queue: string;
  config?: string;
}

const VALID_STATUSES = ['failed', 'completed', 'delayed', 'waiting'] as const;
type JobStatus = (typeof VALID_STATUSES)[number];

export async function queueClear(status: string, options: QueueClearOptions): Promise<void> {
  try {
    // Validate status
    if (!VALID_STATUSES.includes(status as JobStatus)) {
      await output.error(`Invalid status: ${status}`);
      await output.info(`Valid statuses: ${VALID_STATUSES.join(', ')}`);
      process.exit(1);
    }

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

    await output.info(`Clearing ${status} jobs from queue "${options.queue}"...`);

    const cleared = await queueManager.clearJobs(status as JobStatus, options.queue);

    await output.success(`Cleared ${cleared} ${status} jobs`);

    // Close connection
    await queueManager.close();
  } catch (error) {
    await output.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
