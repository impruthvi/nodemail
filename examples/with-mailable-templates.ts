import { Mailable, Mail } from '../src';
import { config } from 'dotenv';

config();

/**
 * Example: Using Mailable class with templates
 * 
 * This demonstrates how to create reusable email classes
 * that use template engines for rendering
 */

class WelcomeEmail extends Mailable {
  constructor(
    private user: { name: string; email: string },
    private appName: string
  ) {
    super();
  }

  build() {
    return this.subject(`Welcome to ${this.appName}!`)
      .view('welcome', {
        name: this.user.name,
        email: this.user.email,
        appName: this.appName,
        joinDate: new Date().toLocaleDateString(),
      });
  }
}

class InvoiceEmail extends Mailable {
  constructor(
    private invoice: {
      number: string;
      customer: string;
      items: Array<{ name: string; quantity: number; price: number }>;
      total: number;
    }
  ) {
    super();
  }

  build() {
    return this.subject(`Invoice #${this.invoice.number}`)
      .view('invoice', {
        invoiceNumber: this.invoice.number,
        customerName: this.invoice.customer,
        items: this.invoice.items,
        total: this.invoice.total,
      });
  }
}

async function main() {
  // Configure with Handlebars for welcome email
  Mail.configure({
    default: 'smtp',
    from: {
      address: process.env.MAIL_FROM_ADDRESS || 'noreply@example.com',
      name: process.env.MAIL_FROM_NAME || 'Example App',
    },
    mailers: {
      smtp: {
        driver: 'smtp',
        host: process.env.MAIL_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.MAIL_PORT || '587'),
        auth: {
          user: process.env.MAIL_USERNAME || '',
          pass: process.env.MAIL_PASSWORD || '',
        },
      },
    },
    templates: {
      engine: 'handlebars',
      viewsPath: './examples/views',
      cache: true,
    },
  });

  try {
    // Method 1: Laravel-style - Mail.to().send(mailable)
    console.log('📧 Method 1: Sending welcome email (Laravel-style)...');
    const welcomeEmail = new WelcomeEmail(
      { name: 'John Doe', email: 'john@example.com' },
      'NodeMail'
    );

    const response1 = await Mail.to('john@example.com').send(welcomeEmail);

    console.log('✅ Welcome email sent!');
    console.log('Response:', response1);

    // Switch to EJS for invoice email
    Mail.configure({
      default: 'smtp',
      from: {
        address: process.env.MAIL_FROM_ADDRESS || 'noreply@example.com',
        name: process.env.MAIL_FROM_NAME || 'Example App',
      },
      mailers: {
        smtp: {
          driver: 'smtp',
          host: process.env.MAIL_HOST || 'smtp.ethereal.email',
          port: parseInt(process.env.MAIL_PORT || '587'),
          auth: {
            user: process.env.MAIL_USERNAME || '',
            pass: process.env.MAIL_PASSWORD || '',
          },
        },
      },
      templates: {
        engine: 'ejs',
        viewsPath: './examples/views',
        cache: true,
      },
    });

    // Method 2: Direct mailable send
    console.log('\n📧 Method 2: Sending invoice email (Direct)...');
    const invoiceEmail = new InvoiceEmail({
      number: 'INV-2025-001',
      customer: 'Jane Smith',
      items: [
        { name: 'Pro Plan', quantity: 1, price: 99.99 },
        { name: 'Extra Storage', quantity: 2, price: 19.99 },
      ],
      total: 139.97,
    });

    // Set mail manager and send directly
    invoiceEmail.setMailManager(Mail['getInstance']());
    const response2 = await invoiceEmail.to('jane@example.com').send();

    console.log('✅ Invoice email sent!');
    console.log('Response:', response2);

    console.log('\n🎉 Both methods work perfectly!');
    console.log('✨ Method 1 (Recommended): Mail.to().send(mailable)');
    console.log('✨ Method 2 (Alternative): mailable.to().send()');
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

void main();
