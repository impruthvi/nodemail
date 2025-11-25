import { config } from 'dotenv';
import { Mail } from '../src';

// Load environment variables
config();

async function main() {
  try {
    console.log('📧 Sending email via Resend...\n');

    const response = await Mail.to('recipient@example.com')
      .subject('Test Email from Resend Provider')
      .html('<h1>Hello from Resend!</h1><p>This email was sent using @impruthvi/nodemail with Resend.</p>')
      .text('Hello from Resend! This email was sent using @impruthvi/nodemail with Resend.')
      .send();

    console.log('✅ Email sent successfully!');
    console.log('Response:', response);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    process.exit(1);
  }
}

main();
