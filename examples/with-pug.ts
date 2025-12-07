import { Mail } from '../src';
import { config } from 'dotenv';

config();

/**
 * Example: Using Pug templates
 * 
 * Install dependencies:
 * npm install pug
 */

async function main() {
  // Configure Mail with Pug template engine
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
      engine: 'pug',
      viewsPath: './examples/views',
      extension: '.pug',
      cache: true,
    },
  });

  try {
    // Send email using Pug template
    const response = await Mail.to('user@example.com')
      .subject('Account Notification')
      .template('notification')
      .data({
        title: 'Account Notification',
        message: 'Important Account Update',
        username: 'Alex Johnson',
        urgent: true,
        items: [
          'Password changed successfully',
          'New device login detected',
          'Security settings updated',
        ],
        timestamp: new Date().toLocaleString(),
      })
      .send();

    console.log('✅ Email sent successfully with Pug template!');
    console.log('Response:', response);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

void main();
