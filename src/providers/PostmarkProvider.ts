import type { MailProvider, MailOptions, MailResponse, MailAddress } from '../types';

/**
 * Postmark email provider
 * Requires: npm install postmark
 */
export class PostmarkProvider implements MailProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;

  constructor(config: { serverToken: string }) {
    if (!config.serverToken) {
      throw new Error('Postmark server token is required');
    }

    try {
      // Dynamic import - disable type safety for optional peer dependency
      /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      const postmark = require('postmark');
      this.client = new postmark.ServerClient(config.serverToken);
      /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    } catch {
      throw new Error(
        'Postmark provider requires "postmark" package. ' +
          'Install with: npm install postmark',
      );
    }
  }

  async send(options: MailOptions): Promise<MailResponse> {
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
      const postmarkMessage: any = {
        From: options.from ? this.formatAddress(options.from) : undefined,
        To: this.formatRecipients(Array.isArray(options.to) ? options.to : [options.to]).join(', '),
        Subject: options.subject,
      };

      // Add CC recipients
      if (options.cc) {
        const cc = Array.isArray(options.cc) ? options.cc : [options.cc];
        postmarkMessage.Cc = this.formatRecipients(cc).join(', ');
      }

      // Add BCC recipients
      if (options.bcc) {
        const bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
        postmarkMessage.Bcc = this.formatRecipients(bcc).join(', ');
      }

      // Add HTML or text content
      if (options.html) {
        postmarkMessage.HtmlBody = options.html;
      }
      if (options.text) {
        postmarkMessage.TextBody = options.text;
      }

      // Add reply-to
      if (options.replyTo) {
        postmarkMessage.ReplyTo = this.formatAddress(options.replyTo);
      }

      // Add custom headers
      if (options.headers) {
        postmarkMessage.Headers = Object.entries(options.headers).map(
          ([Name, Value]) => ({ Name, Value }),
        );
      }

      // Add attachments
      if (options.attachments && options.attachments.length > 0) {
        postmarkMessage.Attachments = options.attachments.map((att) => ({
          Name: att.filename,
          Content: att.content,
          ContentType: att.contentType || 'application/octet-stream',
          ContentID: att.cid,
        }));
      }

      const result = await this.client.sendEmail(postmarkMessage);
      /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
      
      return {
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        messageId: result?.MessageID,
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: `Postmark send failed: ${error.message}`,
        };
      }
      return {
        success: false,
        error: 'Postmark send failed with unknown error',
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
