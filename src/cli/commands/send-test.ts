/**
 * send:test command - Send a test email to verify configuration
 */

import { output, Spinner } from '../utils/output.js';
import { loadConfig } from '../utils/config-loader.js';
import { MailManager } from '../../core/MailManager.js';

interface SendTestOptions {
  to: string;
  subject: string;
  from?: string;
  config?: string;
}

export async function sendTest(options: SendTestOptions): Promise<void> {
  const spinner = new Spinner('Sending test email...');

  try {
    const { config, configPath } = await loadConfig(options.config);
    await output.info(`Using config: ${configPath}`);

    const manager = new MailManager(config);

    const from = options.from || config.from;
    const html = generateTestEmailHtml(options.to, config.default);

    spinner.start();

    const result = await manager.send({
      to: options.to,
      subject: options.subject,
      from: typeof from === 'string' ? from : `${from.name} <${from.address}>`,
      html,
      text: `This is a test email from Laramail CLI.\n\nSent to: ${options.to}\nMailer: ${config.default}\nTimestamp: ${new Date().toISOString()}`,
    });

    if (result.success) {
      await spinner.succeed('Test email sent successfully!');
      output.newline();
      await output.keyValue('Message ID', result.messageId || 'N/A');
      await output.keyValue('Provider', config.default);
      await output.keyValue('To', options.to);
    } else {
      await spinner.fail(`Failed to send: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    spinner.stop();
    await output.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function generateTestEmailHtml(to: string, mailer: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .success { color: #27ae60; font-size: 48px; margin-bottom: 10px; }
    h1 { margin: 0; font-size: 24px; }
    .details { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; width: 120px; color: #666; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="success">✓</div>
    <h1>Laramail Test Email</h1>
  </div>
  <div class="content">
    <p>Your email configuration is working correctly! This test email was sent using the Laramail CLI.</p>
    
    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Recipient:</span>
        <span>${to}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Mailer:</span>
        <span>${mailer}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Timestamp:</span>
        <span>${new Date().toISOString()}</span>
      </div>
    </div>
    
    <div class="footer">
      <p>Sent by <a href="https://github.com/impruthvi/laramail">laramail</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
