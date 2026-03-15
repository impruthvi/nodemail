import type { MailOptions, MailResponse, MailAddress, MailProvider } from '../types';

function formatAddress(address: string | MailAddress): string {
  if (typeof address === 'string') return address;
  return address.name ? `${address.name} <${address.address}>` : address.address;
}

function formatRecipientList(
  recipients: string | string[] | MailAddress | MailAddress[] | undefined
): string {
  if (!recipients) return '';
  if (Array.isArray(recipients)) {
    return recipients.map((r) => formatAddress(r)).join(', ');
  }
  return formatAddress(recipients);
}

export class LogProvider implements MailProvider {
  constructor() {
    if (typeof process !== 'undefined' && process.env['NODE_ENV'] === 'production') {
      console.warn('[laramail] LogProvider is intended for development only. Do not use in production.');
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async send(options: MailOptions): Promise<MailResponse> {
    const lines: string[] = [];
    const border = '='.repeat(60);

    lines.push(border);
    lines.push('  MAIL LOG');
    lines.push(border);
    lines.push(`  To:      ${formatRecipientList(options.to)}`);

    if (options.from) {
      lines.push(`  From:    ${formatAddress(options.from)}`);
    }

    lines.push(`  Subject: ${options.subject}`);

    if (options.cc) {
      lines.push(`  CC:      ${formatRecipientList(options.cc)}`);
    }

    if (options.bcc) {
      lines.push(`  BCC:     ${formatRecipientList(options.bcc)}`);
    }

    if (options.priority) {
      lines.push(`  Priority: ${options.priority}`);
    }

    if (options.attachments && options.attachments.length > 0) {
      lines.push(`  Attachments: ${options.attachments.length}`);
    }

    lines.push('-'.repeat(60));

    if (options.html) {
      const body = options.html.length > 500 ? options.html.substring(0, 500) + '...' : options.html;
      lines.push(`  Body (HTML):`);
      lines.push(`  ${body}`);
    } else if (options.text) {
      const body = options.text.length > 500 ? options.text.substring(0, 500) + '...' : options.text;
      lines.push(`  Body (Text):`);
      lines.push(`  ${body}`);
    }

    lines.push(border);

    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));

    return {
      success: true,
      messageId: `log-${Date.now()}`,
    };
  }
}
