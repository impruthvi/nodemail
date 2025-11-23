import { MailOptions, MailResponse, SendGridConfig, MailAddress } from '../types';

// SendGrid is a peer dependency - user must install it
type SendGridMail = {
  setApiKey: (apiKey: string) => void;
  send: (msg: unknown) => Promise<[{ headers: Record<string, unknown>; statusCode: number; statusMessage?: string }]>;
};

let sendGridMail: SendGridMail | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  sendGridMail = require('@sendgrid/mail');
} catch {
  // SendGrid not installed - will throw error when trying to use
}

function formatAddress(address: string | MailAddress): string {
  if (typeof address === 'string') {
    return address;
  }
  return address.name ? `${address.name} <${address.address}>` : address.address;
}

function formatAddresses(
  addresses: string | string[] | MailAddress | MailAddress[]
): string | string[] {
  if (Array.isArray(addresses)) {
    return addresses.map((addr) => formatAddress(addr));
  }
  return formatAddress(addresses);
}

export class SendGridProvider {
  private apiKey: string;

  constructor(config: SendGridConfig) {
    if (!sendGridMail) {
      throw new Error(
        'SendGrid provider requires @sendgrid/mail package. Install it with: npm install @sendgrid/mail'
      );
    }

    this.apiKey = config.apiKey;
    sendGridMail.setApiKey(this.apiKey);
  }

  async send(options: MailOptions): Promise<MailResponse> {
    if (!sendGridMail) {
      return {
        success: false,
        error: 'SendGrid not available',
      };
    }

    try {
      const msg = {
        to: formatAddresses(options.to),
        from: options.from ? formatAddress(options.from) : undefined,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc ? formatAddresses(options.cc) : undefined,
        bcc: options.bcc ? formatAddresses(options.bcc) : undefined,
        replyTo: options.replyTo ? formatAddress(options.replyTo) : undefined,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content?.toString('base64') ?? '',
          type: att.contentType,
          disposition: 'attachment',
        })),
        headers: options.headers,
      };

      const [response] = await sendGridMail.send(msg);

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
        response: `${response.statusCode} ${response.statusMessage ?? ''}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
