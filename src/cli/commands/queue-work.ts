/**
 * queue:work command - Start processing queued emails
 */

import { output, Spinner } from '../utils/output.js';
import { loadConfig } from '../utils/config-loader.js';
import { MailManager } from '../../core/MailManager.js';

interface QueueWorkOptions {
  queue: string;
  concurrency: string;
  config?: string;
}

export async function queueWork(options: QueueWorkOptions): Promise<void> {
  const spinner = new Spinner('Loading configuration...');
  spinner.start();

  try {
    const { config, configPath } = await loadConfig(options.config);
    await spinner.succeed(`Loaded config from ${configPath}`);

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

    await output.heading('Queue Worker');
    await output.keyValue('Queue', options.queue);
    await output.keyValue('Concurrency', options.concurrency);
    await output.keyValue('Driver', config.queue.driver);
    output.divider();
    output.newline();
    await output.info('Worker started. Press Ctrl+C to stop.');
    output.newline();

    // Start processing
    await queueManager.process(async (job) => {
      await output.info(`Processing job ${job.id}...`);
      const result = await manager.send(job.mailOptions);
      if (result.success) {
        await output.success(`Job ${job.id} completed`);
      } else {
        await output.error(`Job ${job.id} failed: ${result.error}`);
      }
      return result;
    }, options.queue);

    // Keep the process running
    process.on('SIGINT', () => {
      output.newline();
      void (async () => {
        await output.info('Shutting down worker...');
        await queueManager.close();
        await output.success('Worker stopped');
        process.exit(0);
      })();
    });

    // Prevent the process from exiting
    await new Promise(() => {
      // Keep running indefinitely
    });
  } catch (error) {
    spinner.stop();
    await output.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
