import type { MailProvider, MailOptions, MailResponse, MailAddress } from '../types';

/**
 * Mailgun email provider
 * Requires: npm install mailgun.js form-data
 */
export class MailgunProvider implements MailProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
  private domain: string;

  constructor(config: {
    apiKey: string;
    domain: string;
    region?: 'us' | 'eu';
    host?: string;
  }) {
    if (!config.apiKey) {
      throw new Error('Mailgun API key is required');
    }

    if (!config.domain) {
      throw new Error('Mailgun domain is required');
    }

    this.domain = config.domain;

    try {
      // Dynamic import - disable type safety for optional peer dependency
      /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
      const Mailgun = require('mailgun.js');
      const formData = require('form-data');
      const mailgun = new Mailgun(formData);

      const clientOptions: any = {
        key: config.apiKey,
      };

      if (config.region === 'eu') {
        clientOptions.url = 'https://api.eu.mailgun.net';
      } else if (config.host) {
        clientOptions.url = config.host;
      }

      this.client = mailgun.client(clientOptions);
      /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
    } catch {
      throw new Error(
        'Mailgun provider requires "mailgun.js" and "form-data" packages. ' +
          'Install with: npm install mailgun.js form-data',
      );
    }
  }

  async send(options: MailOptions): Promise<MailResponse> {
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
      const mailgunMessage: any = {
        from: options.from ? this.formatAddress(options.from) : undefined,
        to: this.formatRecipients(Array.isArray(options.to) ? options.to : [options.to]),
        subject: options.subject,
      };

      // Add CC recipients
      if (options.cc) {
        const cc = Array.isArray(options.cc) ? options.cc : [options.cc];
        mailgunMessage.cc = this.formatRecipients(cc);
      }

      // Add BCC recipients
      if (options.bcc) {
        const bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
        mailgunMessage.bcc = this.formatRecipients(bcc);
      }

      // Add HTML or text content
      if (options.html) {
        mailgunMessage.html = options.html;
      }
      if (options.text) {
        mailgunMessage.text = options.text;
      }

      // Add reply-to
      if (options.replyTo) {
        mailgunMessage['h:Reply-To'] = this.formatAddress(options.replyTo);
      }

      // Add custom headers
      if (options.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          mailgunMessage[`h:${key}`] = value;
        }
      }

      // Add attachments
      if (options.attachments && options.attachments.length > 0) {
        mailgunMessage.attachment = options.attachments.map((att) => ({
          filename: att.filename,
          data: att.content ? Buffer.from(att.content) : undefined,
        }));
      }

      const result = await this.client.messages.create(this.domain, mailgunMessage);
      /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
      
      return {
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        messageId: result?.id,
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: `Mailgun send failed: ${error.message}`,
        };
      }
      return {
        success: false,
        error: 'Mailgun send failed with unknown error',
      };
    }
  }

  /**
   * Format a single address (string or MailAddress object)
   */
  private formatAddress(address: string | MailAddress): string {
    if (typeof address === 'string') {
      return address;
    }
    return address.name ? `${address.name} <${address.address}>` : address.address;
  }

  /**
   * Format multiple recipients
   */
  private formatRecipients(
    addresses: Array<string | MailAddress>,
  ): string | string[] {
    if (addresses.length === 1 && addresses[0]) {
      return this.formatAddress(addresses[0]);
    }
    return addresses.map((addr) => this.formatAddress(addr));
  }
}
