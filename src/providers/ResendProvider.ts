import type { MailProvider, MailOptions, MailResponse, MailAddress } from '../types';

/**
 * Resend email provider
 * Requires: npm install resend
 */
export class ResendProvider implements MailProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;

  constructor(config: { apiKey: string }) {
    if (!config.apiKey) {
      throw new Error('Resend API key is required');
    }

    try {
      // Dynamic import - disable type safety for optional peer dependency
      /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
      const { Resend } = require('resend');
      this.client = new Resend(config.apiKey);
      /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
    } catch {
      throw new Error(
        'Resend provider requires "resend" package. ' +
          'Install with: npm install resend',
      );
    }
  }

  async send(options: MailOptions): Promise<MailResponse> {
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
      const resendMessage: any = {
        from: options.from ? this.formatAddress(options.from) : undefined,
        to: this.formatRecipients(Array.isArray(options.to) ? options.to : [options.to]),
        subject: options.subject,
      };

      // Add CC recipients
      if (options.cc) {
        const cc = Array.isArray(options.cc) ? options.cc : [options.cc];
        resendMessage.cc = this.formatRecipients(cc);
      }

      // Add BCC recipients
      if (options.bcc) {
        const bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
        resendMessage.bcc = this.formatRecipients(bcc);
      }

      // Add HTML or text content
      if (options.html) {
        resendMessage.html = options.html;
      } else if (options.text) {
        resendMessage.text = options.text;
      }

      // Add reply-to
      if (options.replyTo) {
        resendMessage.reply_to = this.formatAddress(options.replyTo);
      }

      // Add custom headers
      if (options.headers) {
        resendMessage.headers = options.headers;
      }

      // Add attachments
      if (options.attachments && options.attachments.length > 0) {
        resendMessage.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content ? Buffer.from(att.content) : undefined,
        }));
      }

      const result = await this.client.emails.send(resendMessage);
      /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
      
      return {
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        messageId: result?.data?.id,
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: `Resend send failed: ${error.message}`,
        };
      }
      return {
        success: false,
        error: 'Resend send failed with unknown error',
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
  private formatRecipients(addresses: Array<string | MailAddress>): string[] {
    return addresses.map((addr) => this.formatAddress(addr));
  }
}
