import { Mail } from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure mail with SMTP
Mail.configure({
  default: 'smtp',
  from: {
    address: 'noreply@example.com',
    name: 'Nodemail Test',
  },
  mailers: {
    smtp: {
      driver: 'smtp',
      host: process.env.SMTP_HOST ?? 'smtp.mailtrap.io',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASS ?? '',
      },
    },
  },
});

async function sendTestEmail() {
  try {
    console.log('Sending test email...');

    const result = await Mail.to('test@example.com')
      .subject('Test Email from Nodemail')
      .html('<h1>Hello from Nodemail!</h1><p>This is a test email.</p>')
      .text('Hello from Nodemail! This is a test email.')
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
