import nodemailer, { Transporter } from 'nodemailer';
import { MailOptions, MailResponse, SmtpConfig, MailAddress } from '../types';

function formatAddress(address: string | MailAddress): string {
  if (typeof address === 'string') {
    return address;
  }
  return address.name ? `"${address.name}" <${address.address}>` : address.address;
}

function formatAddresses(
  addresses: string | string[] | MailAddress | MailAddress[]
): string {
  if (Array.isArray(addresses)) {
    return addresses.map((addr) => formatAddress(addr)).join(', ');
  }
  return formatAddress(addresses);
}

export class SmtpProvider {
  private transporter: Transporter;

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? false,
      auth: config.auth
        ? {
            user: String(config.auth.user),
            pass: String(config.auth.pass),
          }
        : undefined,
      ...config.options,
    } as nodemailer.TransportOptions);
  }

  async send(options: MailOptions): Promise<MailResponse> {
    try {
      const mailOptions = {
        from: options.from ? formatAddress(options.from) : undefined,
        to: formatAddresses(options.to),
        cc: options.cc ? formatAddresses(options.cc) : undefined,
        bcc: options.bcc ? formatAddresses(options.bcc) : undefined,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          contentType: att.contentType,
        })),
        replyTo: options.replyTo ? formatAddress(options.replyTo) : undefined,
        headers: options.headers,
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info: { messageId?: string; response?: string } =
        await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId ?? '',
        response: info.response ?? '',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return false;
    }
  }
}
