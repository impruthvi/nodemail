/**
 * config:check command - Validate mail configuration
 */

import { output, Spinner } from '../utils/output.js';
import { loadConfig, getConfigPath } from '../utils/config-loader.js';
import { MailManager } from '../../core/MailManager.js';

interface ConfigCheckOptions {
  config?: string;
  test?: boolean;
}

export async function configCheck(options: ConfigCheckOptions): Promise<void> {
  try {
    await output.heading('Configuration Check');

    // Check if config file exists
    const configPath = getConfigPath(options.config);
    if (!configPath) {
      await output.error('No configuration file found');
      await output.info(
        'Create a nodemail.config.ts or nodemail.config.js file in your project root'
      );
      process.exit(1);
    }

    await output.success(`Config file found: ${configPath}`);

    // Try to load the config
    const spinner = new Spinner('Loading configuration...');
    spinner.start();

    let config;
    try {
      const result = await loadConfig(options.config);
      config = result.config;
      await spinner.succeed('Configuration loaded successfully');
    } catch (error) {
      await spinner.fail('Failed to load configuration');
      await output.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    // Validate required fields
    output.newline();
    await output.info('Validating configuration...');
    output.newline();

    let hasErrors = false;

    // Check default mailer
    if (!config.default) {
      await output.error('Missing "default" mailer');
      hasErrors = true;
    } else {
      await output.success(`Default mailer: ${config.default}`);
    }

    // Check from address
    if (!config.from) {
      await output.error('Missing "from" address');
      hasErrors = true;
    } else {
      const fromStr =
        typeof config.from === 'string'
          ? config.from
          : `${config.from.name} <${config.from.address}>`;
      await output.success(`From address: ${fromStr}`);
    }

    // Check mailers
    if (!config.mailers || Object.keys(config.mailers).length === 0) {
      await output.error('No mailers configured');
      hasErrors = true;
    } else {
      output.newline();
      await output.info(`Configured mailers (${Object.keys(config.mailers).length}):`);

      for (const [name, mailerConfig] of Object.entries(config.mailers)) {
        const isDefault = name === config.default;
        const driver = (mailerConfig as { driver: string }).driver;
        await output.keyValue(`  ${name}${isDefault ? ' (default)' : ''}`, driver);

        // Validate driver-specific required fields
        const errors = validateMailerConfig(name, mailerConfig as Record<string, unknown>);
        for (const error of errors) {
          await output.error(`    ${error}`);
          hasErrors = true;
        }
      }
    }

    // Check if default mailer exists
    if (config.default && config.mailers && !config.mailers[config.default]) {
      await output.error(`Default mailer "${config.default}" is not configured`);
      hasErrors = true;
    }

    // Check queue configuration
    output.newline();
    if (config.queue) {
      await output.success(`Queue configured: ${config.queue.driver}`);
    } else {
      await output.info('Queue: not configured');
    }

    // Check template configuration
    if (config.templates) {
      const engine =
        typeof config.templates.engine === 'string' ? config.templates.engine : 'custom';
      await output.success(`Templates configured: ${engine}`);
    } else {
      await output.info('Templates: not configured');
    }

    output.newline();

    if (hasErrors) {
      await output.error('Configuration has errors. Please fix them before using nodemail.');
      process.exit(1);
    }

    await output.success('Configuration is valid!');

    // Test provider connections if requested
    if (options.test) {
      output.newline();
      await output.heading('Testing Provider Connections');

      const manager = new MailManager(config);

      for (const name of Object.keys(config.mailers)) {
        const testSpinner = new Spinner(`Testing ${name}...`);
        testSpinner.start();

        try {
          // Create a preview to test the provider setup
          // This doesn't actually send anything
          const testManager = manager.mailer(name);
          await testManager.preview({
            to: 'test@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
          });
          await testSpinner.succeed(`${name}: OK`);
        } catch (error) {
          await testSpinner.fail(
            `${name}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
  } catch (error) {
    await output.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function validateMailerConfig(_name: string, config: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const driver = config['driver'] as string;

  if (!driver) {
    errors.push('Missing "driver" field');
    return errors;
  }

  switch (driver) {
    case 'smtp':
      if (!config['host']) errors.push('Missing "host" field');
      if (!config['port']) errors.push('Missing "port" field');
      break;
    case 'sendgrid':
      if (!config['apiKey']) errors.push('Missing "apiKey" field');
      break;
    case 'ses':
      if (!config['region']) errors.push('Missing "region" field');
      break;
    case 'mailgun':
      if (!config['domain']) errors.push('Missing "domain" field');
      if (!config['apiKey']) errors.push('Missing "apiKey" field');
      break;
    case 'resend':
      if (!config['apiKey']) errors.push('Missing "apiKey" field');
      break;
    case 'postmark':
      if (!config['serverToken']) errors.push('Missing "serverToken" field');
      break;
    case 'mailtrap':
      if (!config['token']) errors.push('Missing "token" field');
      if (!config['inboxId']) errors.push('Missing "inboxId" field');
      break;
    default:
      errors.push(`Unknown driver: ${driver}`);
  }

  return errors;
}
