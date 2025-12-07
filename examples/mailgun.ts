import { config } from 'dotenv';
import { Mail } from '../src';

// Load environment variables
config();

async function main() {
  try {
    console.log('📧 Sending email via Mailgun...\n');

    const response = await Mail.to('recipient@example.com')
      .subject('Test Email from Mailgun Provider')
      .html('<h1>Hello from Mailgun!</h1><p>This email was sent using @impruthvi/nodemail with Mailgun.</p>')
      .text('Hello from Mailgun! This email was sent using @impruthvi/nodemail with Mailgun.')
      .cc('cc@example.com')
      .send();

    console.log('✅ Email sent successfully!');
    console.log('Response:', response);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    process.exit(1);
  }
}

void main();
