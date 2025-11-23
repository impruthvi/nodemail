import { Mail } from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure mail with SendGrid
Mail.configure({
  default: 'sendgrid',
  from: {
    address: 'noreply@example.com',
    name: 'Nodemail Test',
  },
  mailers: {
    sendgrid: {
      driver: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY ?? '',
    },
  },
});

async function sendTestEmail() {
  try {
    console.log('Sending test email via SendGrid...');

    const result = await Mail.to('test@example.com')
      .subject('Test Email from Nodemail (SendGrid)')
      .html('<h1>Hello from Nodemail!</h1><p>This email was sent via SendGrid.</p>')
      .text('Hello from Nodemail! This email was sent via SendGrid.')
      .send();

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', result.messageId);
    } else {
      console.error('❌ Failed to send email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
sendTestEmail().catch(console.error);
