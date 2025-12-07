import { Mail } from '../src';
import { config } from 'dotenv';

config();

/**
 * Example: Using EJS templates
 * 
 * Install dependencies:
 * npm install ejs
 */

async function main() {
  // Configure Mail with EJS template engine
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
      extension: '.ejs',
      cache: true,
    },
  });

  try {
    // Send email using EJS template
    const response = await Mail.to('customer@example.com')
      .subject('Your Invoice')
      .template('invoice')
      .data({
        invoiceNumber: 'INV-2025-001',
        customerName: 'Jane Smith',
        items: [
          { name: 'Pro Plan Subscription', quantity: 1, price: 99.99 },
          { name: 'Additional Storage', quantity: 2, price: 19.99 },
        ],
        total: 139.97,
      })
      .send();

    console.log('✅ Email sent successfully with EJS template!');
    console.log('Response:', response);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

void main();
