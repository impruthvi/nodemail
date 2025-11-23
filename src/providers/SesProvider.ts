import { MailOptions, MailResponse, SesConfig, MailAddress } from '../types';

// AWS SES is a peer dependency - user must install it
type SESClient = {
  send: (command: unknown) => Promise<{ MessageId?: string }>;
};

type SendEmailCommand = new (params: unknown) => unknown;

let SESClient: (new (config: unknown) => SESClient) | null = null;
let SendEmailCommand: SendEmailCommand | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const sesModule = require('@aws-sdk/client-ses');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  SESClient = sesModule.SESClient;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  SendEmailCommand = sesModule.SendEmailCommand;
} catch {
  // AWS SDK not installed - will throw error when trying to use
}

function formatAddress(address: string | MailAddress): string {
  if (typeof address === 'string') {
    return address;
  }
  return address.name ? `"${address.name}" <${address.address}>` : address.address;
}

function formatAddresses(
  addresses: string | string[] | MailAddress | MailAddress[]
): string[] {
  if (Array.isArray(addresses)) {
    return addresses.map((addr) => formatAddress(addr));
  }
  return [formatAddress(addresses)];
}

export class SesProvider {
  private client: SESClient;

  constructor(config: SesConfig) {
    if (!SESClient || !SendEmailCommand) {
      throw new Error(
        'AWS SES provider requires @aws-sdk/client-ses package. Install it with: npm install @aws-sdk/client-ses'
      );
    }

    this.client = new SESClient({
      region: config.region,
      ...(config.accessKeyId && config.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            },
          }
        : {}),
    });
  }

  async send(options: MailOptions): Promise<MailResponse> {
    if (!SendEmailCommand) {
      return {
        success: false,
        error: 'AWS SES not available',
      };
    }

    try {
      // AWS SES requires either HTML or Text, not both in raw format
      const body: { Html?: { Charset: string; Data: string }; Text?: { Charset: string; Data: string } } = {};
      
      if (options.html) {
        body.Html = {
          Charset: 'UTF-8',
          Data: options.html,
        };
      }
      
      if (options.text) {
        body.Text = {
          Charset: 'UTF-8',
          Data: options.text,
        };
      }

      const params = {
        Source: options.from ? formatAddress(options.from) : undefined,
        Destination: {
          ToAddresses: formatAddresses(options.to),
          CcAddresses: options.cc ? formatAddresses(options.cc) : undefined,
          BccAddresses: options.bcc ? formatAddresses(options.bcc) : undefined,
        },
        Message: {
          Subject: {
            Charset: 'UTF-8',
            Data: options.subject,
          },
          Body: body,
        },
        ReplyToAddresses: options.replyTo ? [formatAddress(options.replyTo)] : undefined,
      };

      const command = new SendEmailCommand(params);
      const response = await this.client.send(command);

      return {
        success: true,
        messageId: response.MessageId ?? '',
        response: 'Email sent via AWS SES',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
