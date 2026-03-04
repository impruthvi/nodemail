/**
 * queue:status command - Show queue job counts
 */

import { output } from '../utils/output.js';
import { loadConfig } from '../utils/config-loader.js';
import { MailManager } from '../../core/MailManager.js';

interface QueueStatusOptions {
  queue: string;
  config?: string;
}

export async function queueStatus(options: QueueStatusOptions): Promise<void> {
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

    const counts = await queueManager.getJobCounts(options.queue);

    if (!counts) {
      await output.error('Queue driver does not support job counts.');
      process.exit(1);
    }

    await output.heading(`Queue Status: ${options.queue}`);
    output.divider();
    await output.keyValue('Waiting', counts.waiting);
    await output.keyValue('Active', counts.active);
    await output.keyValue('Delayed', counts.delayed);
    await output.keyValue('Failed', counts.failed);
    await output.keyValue('Completed', counts.completed);
    output.divider();

    const total = counts.waiting + counts.active + counts.delayed + counts.failed;
    await output.keyValue('Total Pending', total);

    // Close connection
    await queueManager.close();
  } catch (error) {
    await output.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
