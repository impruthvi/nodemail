#!/usr/bin/env node
/**
 * Nodemail CLI - Command-line tools for queue management and development
 */

import { Command } from 'commander';
import { queueWork } from './commands/queue-work.js';
import { queueStatus } from './commands/queue-status.js';
import { queueClear } from './commands/queue-clear.js';
import { queueRetry } from './commands/queue-retry.js';
import { preview } from './commands/preview.js';
import { sendTest } from './commands/send-test.js';
import { makeMailable } from './commands/make-mailable.js';
import { configCheck } from './commands/config-check.js';

const program = new Command();

program
  .name('nodemail')
  .description(
    'CLI tools for @impruthvi/nodemail - queue management, email preview, and development utilities'
  )
  .version('1.1.0');

// Queue commands
program
  .command('queue:work')
  .description('Start processing queued emails')
  .option('-q, --queue <name>', 'Queue name to process', 'mail')
  .option('-c, --concurrency <number>', 'Number of concurrent jobs', '5')
  .option('--config <path>', 'Path to config file')
  .action(queueWork);

program
  .command('queue:status')
  .description('Show queue job counts')
  .option('-q, --queue <name>', 'Queue name', 'mail')
  .option('--config <path>', 'Path to config file')
  .action(queueStatus);

program
  .command('queue:clear')
  .description('Clear jobs by status')
  .argument('<status>', 'Job status to clear (failed, completed, delayed, waiting)')
  .option('-q, --queue <name>', 'Queue name', 'mail')
  .option('--config <path>', 'Path to config file')
  .action(queueClear);

program
  .command('queue:retry')
  .description('Retry all failed jobs')
  .option('-q, --queue <name>', 'Queue name', 'mail')
  .option('--config <path>', 'Path to config file')
  .action(queueRetry);

// Email tools
program
  .command('preview')
  .description('Preview an email in the browser')
  .argument('<mailable>', 'Path to Mailable class file')
  .option('-d, --data <json>', 'JSON data to pass to the Mailable constructor')
  .option('--config <path>', 'Path to config file')
  .action(preview);

program
  .command('send:test')
  .description('Send a test email to verify configuration')
  .requiredOption('--to <email>', 'Recipient email address')
  .option('-s, --subject <text>', 'Email subject', 'Nodemail Test Email')
  .option('-f, --from <email>', 'Sender email address')
  .option('--config <path>', 'Path to config file')
  .action(sendTest);

// Code generation
program
  .command('make:mailable')
  .description('Generate a new Mailable class')
  .argument('<name>', 'Name of the Mailable class (e.g., WelcomeMail)')
  .option('-m, --markdown', 'Create a MarkdownMailable instead')
  .option('-p, --path <dir>', 'Directory to create the file in', 'src/mailables')
  .action(makeMailable);

// Configuration
program
  .command('config:check')
  .description('Validate mail configuration')
  .option('--config <path>', 'Path to config file')
  .option('-t, --test', 'Test provider connections')
  .action(configCheck);

program.parse();
