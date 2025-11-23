import { Mail } from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure mail with AWS SES
Mail.configure({
  default: 'ses',
  from: {
    address: 'noreply@example.com',
    name: 'Nodemail Test',
  },
  mailers: {
    ses: {
      driver: 'ses',
      region: process.env.AWS_REGION ?? 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  },
});

async function sendTestEmail() {
  try {
    console.log('Sending test email via AWS SES...');

    const result = await Mail.to('test@example.com')
      .subject('Test Email from Nodemail (AWS SES)')
      .html('<h1>Hello from Nodemail!</h1><p>This email was sent via AWS SES.</p>')
      .text('Hello from Nodemail! This email was sent via AWS SES.')
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
