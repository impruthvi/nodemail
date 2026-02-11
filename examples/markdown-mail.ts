/**
 * Markdown Mail Example
 *
 * Demonstrates using MarkdownMailable to send beautifully formatted
 * emails written in Markdown with components (button, panel, table).
 *
 * Prerequisites:
 *   npm install marked juice
 *
 * Run:
 *   npx tsx examples/markdown-mail.ts
 */

import { Mail, MarkdownMailable } from '../src';

// ============================================================
// 1. Simple Markdown Mailable
// ============================================================

class WelcomeEmail extends MarkdownMailable {
  constructor(
    private user: { name: string; email: string },
    private appName: string
  ) {
    super();
  }

  build(): this {
    return this
      .subject(`Welcome to ${this.appName}!`)
      .from('noreply@example.com')
      .markdown(`# Welcome, {{name}}!

Thank you for joining **{{appName}}**. We're excited to have you on board.

[button url="https://example.com/dashboard" color="primary"]Go to Dashboard[/button]

## Getting Started

Here are a few things you can do right away:

1. Complete your profile
2. Explore our features
3. Connect with other users

[panel]
**Need help?** Our support team is available 24/7.
Reply to this email or visit our [help center](https://example.com/help).
[/panel]

Best regards,
The {{appName}} Team`, {
        name: this.user.name,
        appName: this.appName,
      });
  }
}

// ============================================================
// 2. Markdown Mailable with Table Component
// ============================================================

class InvoiceEmail extends MarkdownMailable {
  constructor(
    private invoice: {
      id: string;
      items: { name: string; qty: number; price: number }[];
      total: number;
    }
  ) {
    super();
  }

  build(): this {
    const tableRows = this.invoice.items
      .map((item) => `| ${item.name} | ${item.qty} | $${item.price.toFixed(2)} |`)
      .join('\n');

    const totalStr = '$' + this.invoice.total.toFixed(2);

    return this
      .subject('Invoice #' + this.invoice.id)
      .from('billing@example.com')
      .markdown(
        '# Invoice #{{invoiceId}}\n\n' +
        "Thank you for your purchase! Here's a summary of your order:\n\n" +
        '[table]\n' +
        '| Item | Qty | Price |\n' +
        '|------|-----|-------|\n' +
        tableRows + '\n' +
        '[/table]\n\n' +
        '**Total: {{total}}**\n\n' +
        '[button url="https://example.com/invoices/{{invoiceId}}" color="success"]View Invoice[/button]\n\n' +
        '[panel]\n' +
        'Payment has been processed. You will receive a receipt within 24 hours.\n' +
        '[/panel]', {
          invoiceId: this.invoice.id,
          total: totalStr,
        });
  }
}

// ============================================================
// 3. Markdown Mailable with Custom Theme
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class BrandedEmail extends MarkdownMailable {
  constructor(private message: string) {
    super();
  }

  build(): this {
    return this
      .subject('Company Update')
      .from('updates@example.com')
      .markdown(`# Company Update

${this.message}

[button url="https://example.com/news"]Read More[/button]`)
      .theme({
        css: `
          body { font-family: Georgia, serif; }
          h1 { color: #1a1a2e; }
          .button-primary { background-color: #e94560; }
          .panel { border-left-color: #e94560; }
        `,
        headerHtml: '<img src="https://example.com/logo.png" alt="Company Logo" width="150">',
        footerHtml: '<p>&copy; 2026 Example Corp. All rights reserved.</p>',
      });
  }
}

// ============================================================
// Main: Demonstrate sending markdown emails
// ============================================================

async function main() {
  // Configure Mail (using Ethereal for testing)
  Mail.configure({
    default: 'smtp',
    from: {
      address: 'noreply@example.com',
      name: 'Example App',
    },
    mailers: {
      smtp: {
        driver: 'smtp',
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
    },
    // Optional: global markdown configuration
    markdown: {
      customCss: '.button { border-radius: 8px; }',
    },
  });

  // --- Example 1: Welcome Email ---
  console.log('Sending welcome email...');
  const user = { name: 'John Doe', email: 'john@example.com' };

  try {
    const result = await Mail.to(user.email).send(
      new WelcomeEmail(user, 'Awesome App')
    );
    console.log('Welcome email sent:', result.messageId);
  } catch {
    console.log('Welcome email example (skipped - no SMTP configured)');
  }

  // --- Example 2: Invoice Email ---
  console.log('\nSending invoice email...');
  const invoice = {
    id: 'INV-2026-001',
    items: [
      { name: 'Pro Plan (Monthly)', qty: 1, price: 29.99 },
      { name: 'Extra Storage (50GB)', qty: 2, price: 9.99 },
    ],
    total: 49.97,
  };

  try {
    const result = await Mail.to('billing@example.com').send(
      new InvoiceEmail(invoice)
    );
    console.log('Invoice email sent:', result.messageId);
  } catch {
    console.log('Invoice email example (skipped - no SMTP configured)');
  }

  // --- Example 3: Using Mail.fake() for testing ---
  console.log('\n--- Testing with Mail.fake() ---');
  Mail.fake();

  await Mail.to('test@example.com').send(
    new WelcomeEmail({ name: 'Test User', email: 'test@example.com' }, 'TestApp')
  );

  // Assertions
  Mail.assertSent(WelcomeEmail);

  const sent = Mail.sent(WelcomeEmail)[0];
  console.log('isMarkdown:', sent.isMarkdown());
  console.log('markdownContains "Welcome":', sent.markdownContains('Welcome'));
  console.log('markdownContains "[button":', sent.markdownContains('[button'));
  console.log('subject:', sent.getSubject());
  console.log('to:', sent.getTo());

  Mail.restore();
  console.log('\nAll markdown mail examples completed!');
}

main().catch(console.error);
