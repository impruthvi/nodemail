import { config } from 'dotenv';
import { Mail } from '../src';

// Load environment variables
config();

async function main() {
  try {
    console.log('📧 Sending email via Postmark...\n');

    const response = await Mail.to('recipient@example.com')
      .subject('Test Email from Postmark Provider')
      .html('<h1>Hello from Postmark!</h1><p>This email was sent using laramail with Postmark.</p>')
      .text('Hello from Postmark! This email was sent using laramail with Postmark.')
      .send();

    console.log('✅ Email sent successfully!');
    console.log('Response:', response);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    process.exit(1);
  }
}

void main();
