import { Mail } from '../src';
import { config } from 'dotenv';

config();

/**
 * Example: Using Handlebars templates
 * 
 * Install dependencies:
 * npm install handlebars
 */

async function main() {
  // Configure Mail with template engine
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
      extension: '.hbs',
      cache: true,
    },
  });

  try {
    // Send email using Handlebars template
    const response = await Mail.to('user@example.com')
      .subject('Welcome to Our App!')
      .template('welcome')
      .data({
        name: 'John Doe',
        email: 'john@example.com',
        appName: 'NodeMail',
        joinDate: new Date().toLocaleDateString(),
      })
      .send();

    console.log('✅ Email sent successfully with Handlebars template!');
    console.log('Response:', response);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

void main();
