/**
 * Queue Example - Demonstrates email queuing functionality
 *
 * This example shows how to:
 * - Configure queue with different drivers (sync, bull, bullmq)
 * - Queue emails for background processing
 * - Delay emails by a specific number of seconds
 * - Schedule emails for a specific time
 * - Process queued emails
 *
 * Note: For Bull/BullMQ drivers, you need Redis running:
 *   docker run -d -p 6379:6379 redis:alpine
 */

import { Mail, Mailable, QueueManager } from '../src';
import type { QueueConfig, MailOptions } from '../src/types';

// Example Mailable class
class WelcomeMailable extends Mailable {
  constructor(
    private userName: string,
    private activationLink: string
  ) {
    super();
  }

  build(): this {
    return this.from('noreply@example.com')
      .subject(`Welcome ${this.userName}!`)
      .html(`
        <h1>Welcome to Our Platform!</h1>
        <p>Hi ${this.userName},</p>
        <p>Thank you for signing up. Please click the link below to activate your account:</p>
        <a href="${this.activationLink}">Activate Account</a>
      `);
  }
}

class OrderConfirmationMailable extends Mailable {
  constructor(
    private orderId: string,
    private total: number
  ) {
    super();
  }

  build(): this {
    return this.from('orders@example.com')
      .subject(`Order #${this.orderId} Confirmed`)
      .html(`
        <h1>Order Confirmation</h1>
        <p>Your order #${this.orderId} has been confirmed.</p>
        <p>Total: $${this.total.toFixed(2)}</p>
        <p>Thank you for your purchase!</p>
      `);
  }
}

async function syncDriverExample(): Promise<void> {
  console.log('=== Sync Driver Example (for development/testing) ===\n');

  // Configure with sync driver (emails are queued but not processed in background)
  Mail.configure({
    default: 'smtp',
    from: { address: 'noreply@example.com', name: 'My App' },
    mailers: {
      smtp: {
        driver: 'smtp',
        host: 'smtp.example.com',
        port: 587,
        auth: { user: 'user', pass: 'pass' },
      },
    },
    queue: {
      driver: 'sync',
      defaultQueue: 'mail',
    },
  });

  // Queue an email immediately
  const result1 = await Mail.to('user@example.com')
    .subject('Quick Update')
    .html('<p>This is a quick update!</p>')
    .queue();

  console.log('Queued email:', result1);

  // Queue an email with 60 second delay
  const result2 = await Mail.to('user@example.com')
    .subject('Delayed Message')
    .html('<p>This message was delayed by 60 seconds.</p>')
    .later(60);

  console.log('Delayed email:', result2);

  // Schedule an email for a specific time
  const futureTime = new Date(Date.now() + 3600 * 1000); // 1 hour from now
  const result3 = await Mail.to('user@example.com')
    .subject('Scheduled Message')
    .html('<p>This message was scheduled for a specific time.</p>')
    .at(futureTime);

  console.log('Scheduled email:', result3);
}

async function mailableQueueExample(): Promise<void> {
  console.log('\n=== Mailable Queue Example ===\n');

  Mail.configure({
    default: 'smtp',
    from: { address: 'noreply@example.com', name: 'My App' },
    mailers: {
      smtp: {
        driver: 'smtp',
        host: 'smtp.example.com',
        port: 587,
        auth: { user: 'user', pass: 'pass' },
      },
    },
    queue: {
      driver: 'sync',
      defaultQueue: 'mail',
      retries: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  });

  // Queue a mailable
  const welcome = new WelcomeMailable('John Doe', 'https://example.com/activate/abc123');
  const result1 = await Mail.to('john@example.com').queue(welcome);
  console.log('Queued welcome email:', result1);

  // Queue with delay
  const order = new OrderConfirmationMailable('ORD-12345', 99.99);
  const result2 = await Mail.to('john@example.com').later(120, order);
  console.log('Delayed order confirmation:', result2);

  // Direct queue via Mail.queue()
  const welcome2 = new WelcomeMailable('Jane Doe', 'https://example.com/activate/xyz789');
  const result3 = await Mail.queue(welcome2);
  console.log('Direct queue result:', result3);
}

async function queueManagerDirectExample(): Promise<void> {
  console.log('\n=== QueueManager Direct Usage ===\n');

  const queueConfig: QueueConfig = {
    driver: 'sync',
    defaultQueue: 'priority-mail',
    prefix: 'myapp',
    retries: 5,
    backoff: { type: 'fixed', delay: 2000 },
  };

  const queueManager = new QueueManager(queueConfig);

  const mailOptions: MailOptions = {
    from: 'noreply@example.com',
    to: 'recipient@example.com',
    subject: 'Direct Queue Test',
    html: '<p>This email was queued directly via QueueManager.</p>',
  };

  // Queue immediately
  const result1 = await queueManager.queue(mailOptions);
  console.log('Queued:', result1);

  // Queue with delay
  const result2 = await queueManager.later(mailOptions, 30);
  console.log('Delayed 30s:', result2);

  // Schedule for specific time
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const result3 = await queueManager.at(mailOptions, tomorrow);
  console.log('Scheduled for tomorrow:', result3);

  await queueManager.close();
  console.log('Queue manager closed');
}

function bullMQConfigExample(): void {
  console.log('\n=== BullMQ Configuration Example ===\n');

  // This is just showing the configuration - requires Redis running
  const config = {
    default: 'smtp',
    from: { address: 'noreply@example.com', name: 'My App' },
    mailers: {
      smtp: {
        driver: 'smtp' as const,
        host: 'smtp.example.com',
        port: 587,
        auth: { user: 'user', pass: 'pass' },
      },
    },
    queue: {
      driver: 'bullmq' as const,
      connection: {
        host: 'localhost',
        port: 6379,
        // password: 'your-redis-password',
        // db: 0,
      },
      defaultQueue: 'mail',
      prefix: 'myapp',
      retries: 3,
      backoff: { type: 'exponential' as const, delay: 1000 },
    },
  };

  console.log('BullMQ configuration:');
  console.log(JSON.stringify(config, null, 2));
  console.log('\nTo use BullMQ:');
  console.log('1. Install: npm install bullmq ioredis');
  console.log('2. Start Redis: docker run -d -p 6379:6379 redis:alpine');
  console.log('3. Configure Mail with the above config');
  console.log('4. Start a worker to process queued emails');
}

function bullConfigExample(): void {
  console.log('\n=== Bull (Legacy) Configuration Example ===\n');

  // This is just showing the configuration - requires Redis running
  const config = {
    default: 'smtp',
    from: { address: 'noreply@example.com', name: 'My App' },
    mailers: {
      smtp: {
        driver: 'smtp' as const,
        host: 'smtp.example.com',
        port: 587,
        auth: { user: 'user', pass: 'pass' },
      },
    },
    queue: {
      driver: 'bull' as const,
      connection: {
        host: 'localhost',
        port: 6379,
      },
      defaultQueue: 'mail',
      prefix: 'myapp',
      retries: 3,
    },
  };

  console.log('Bull configuration:');
  console.log(JSON.stringify(config, null, 2));
  console.log('\nTo use Bull:');
  console.log('1. Install: npm install bull');
  console.log('2. Start Redis: docker run -d -p 6379:6379 redis:alpine');
  console.log('3. Configure Mail with the above config');
}

async function testingQueueExample(): Promise<void> {
  console.log('\n=== Testing Queue with Mail.fake() ===\n');

  // Enable fake mode for testing
  Mail.fake();

  // Queue some emails
  await Mail.to('user1@example.com')
    .subject('Test Queue 1')
    .html('<p>Test 1</p>')
    .queue();

  await Mail.to('user2@example.com')
    .subject('Test Queue 2')
    .html('<p>Test 2</p>')
    .later(60);

  const mailable = new WelcomeMailable('Test User', 'https://example.com/activate');
  await Mail.to('user3@example.com').queue(mailable);

  // Assert emails were queued
  try {
    Mail.assertQueued(WelcomeMailable);
    console.log('WelcomeMailable was queued');

    const queuedCount = Mail.queued().length;
    console.log(`Total queued emails: ${queuedCount}`);

    // Check specific queued email
    const queued = Mail.queued();
    queued.forEach((msg, i) => {
      console.log(`Queued email ${i + 1}: ${msg.getSubject()}`);
    });
  } catch (e) {
    console.error('Assertion failed:', e);
  }

  // Restore real mail functionality
  Mail.restore();
  console.log('\nMail.fake() restored');
}

// Run examples
async function main(): Promise<void> {
  try {
    await syncDriverExample();
    await mailableQueueExample();
    await queueManagerDirectExample();
    bullMQConfigExample();
    bullConfigExample();
    await testingQueueExample();

    console.log('\n=== All examples completed! ===');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

void main();
