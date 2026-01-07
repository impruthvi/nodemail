/**
 * Testing Example - Mail::fake() for testing
 *
 * This example demonstrates how to use Mail.fake() in your tests
 * to verify that emails are being sent correctly without actually
 * sending them.
 *
 * Similar to Laravel's Mail::fake() functionality.
 */

import { Mail, Mailable } from '../src';

// ============================================
// Step 1: Define your Mailable classes
// ============================================

class WelcomeEmail extends Mailable {
  constructor(
    public userName: string,
    public appName: string
  ) {
    super();
  }

  build(): this {
    return this.subject(`Welcome to ${this.appName}!`)
      .html(`
        <h1>Hello ${this.userName}!</h1>
        <p>Welcome to ${this.appName}. We're excited to have you!</p>
      `)
      .cc('admin@example.com');
  }
}

class PasswordResetEmail extends Mailable {
  constructor(public resetToken: string) {
    super();
  }

  build(): this {
    return this.subject('Reset Your Password')
      .html(`
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="https://example.com/reset?token=${this.resetToken}">Reset Password</a>
      `);
  }
}

class OrderConfirmation extends Mailable {
  constructor(
    public orderId: string,
    public total: number
  ) {
    super();
  }

  build(): this {
    return this.subject(`Order #${this.orderId} Confirmed`)
      .html(`
        <h1>Order Confirmed!</h1>
        <p>Your order #${this.orderId} for $${this.total} has been confirmed.</p>
      `)
      .attach('/receipts/receipt.pdf', 'receipt.pdf');
  }
}

// ============================================
// Step 2: Your application code (to be tested)
// ============================================

async function registerUser(email: string, name: string) {
  // ... create user in database ...

  // Send welcome email
  await Mail.to(email).send(new WelcomeEmail(name, 'MyApp'));
}

async function requestPasswordReset(email: string) {
  // ... generate reset token ...
  const token = 'abc123';

  // Send reset email
  await Mail.to(email).send(new PasswordResetEmail(token));
}

async function processOrder(customerEmail: string, orderId: string, total: number) {
  // ... process payment, create order ...

  // Send confirmation
  await Mail.to(customerEmail).send(new OrderConfirmation(orderId, total));
}

// ============================================
// Step 3: Testing with Mail.fake()
// ============================================

async function runTests() {
  console.log('='.repeat(60));
  console.log('Mail::fake() Testing Examples');
  console.log('='.repeat(60));

  // ----------------------------------------
  // Test 1: Basic assertion - mail was sent
  // ----------------------------------------
  console.log('\n[Test 1] Basic assertion - mail was sent');

  Mail.fake();

  await registerUser('john@example.com', 'John');

  try {
    Mail.assertSent(WelcomeEmail);
    console.log('  ✓ WelcomeEmail was sent');
  } catch {
    console.log('  ✗ WelcomeEmail was NOT sent');
  }

  Mail.restore();

  // ----------------------------------------
  // Test 2: Assert with callback
  // ----------------------------------------
  console.log('\n[Test 2] Assert with callback - verify recipient');

  Mail.fake();

  await registerUser('jane@example.com', 'Jane');

  try {
    Mail.assertSent(WelcomeEmail, (mail) => {
      return mail.hasTo('jane@example.com') && mail.subjectContains('Welcome');
    });
    console.log('  ✓ WelcomeEmail was sent to jane@example.com with correct subject');
  } catch {
    console.log('  ✗ Assertion failed');
  }

  Mail.restore();

  // ----------------------------------------
  // Test 3: Assert sent count
  // ----------------------------------------
  console.log('\n[Test 3] Assert sent count');

  Mail.fake();

  await registerUser('user1@example.com', 'User1');
  await registerUser('user2@example.com', 'User2');
  await registerUser('user3@example.com', 'User3');

  try {
    Mail.assertSentCount(WelcomeEmail, 3);
    console.log('  ✓ WelcomeEmail was sent exactly 3 times');
  } catch {
    console.log('  ✗ Sent count mismatch');
  }

  Mail.restore();

  // ----------------------------------------
  // Test 4: Assert NOT sent
  // ----------------------------------------
  console.log('\n[Test 4] Assert NOT sent');

  Mail.fake();

  await registerUser('john@example.com', 'John');

  try {
    Mail.assertNotSent(PasswordResetEmail);
    console.log('  ✓ PasswordResetEmail was NOT sent (as expected)');
  } catch {
    console.log('  ✗ PasswordResetEmail was unexpectedly sent');
  }

  Mail.restore();

  // ----------------------------------------
  // Test 5: Assert nothing sent
  // ----------------------------------------
  console.log('\n[Test 5] Assert nothing sent');

  Mail.fake();

  // Don't send any emails
  try {
    Mail.assertNothingSent();
    console.log('  ✓ No emails were sent (as expected)');
  } catch {
    console.log('  ✗ Some emails were unexpectedly sent');
  }

  Mail.restore();

  // ----------------------------------------
  // Test 6: Inspect sent messages
  // ----------------------------------------
  console.log('\n[Test 6] Inspect sent messages');

  Mail.fake();

  await registerUser('alice@example.com', 'Alice');
  await requestPasswordReset('bob@example.com');
  await processOrder('charlie@example.com', 'ORD-001', 99.99);

  const allSent = Mail.sent();
  console.log(`  Total emails sent: ${allSent.length}`);

  const welcomeEmails = Mail.sent(WelcomeEmail);
  console.log(`  WelcomeEmail count: ${welcomeEmails.length}`);

  const orderEmails = Mail.sent(OrderConfirmation);
  console.log(`  OrderConfirmation count: ${orderEmails.length}`);

  // Inspect a specific email
  const lastEmail = allSent[allSent.length - 1];
  console.log(`\n  Last email details:`);
  console.log(`    Subject: ${lastEmail.getSubject()}`);
  console.log(`    To: ${lastEmail.getTo().join(', ')}`);
  console.log(`    Has attachments: ${lastEmail.hasAttachments()}`);

  Mail.restore();

  // ----------------------------------------
  // Test 7: Check message content
  // ----------------------------------------
  console.log('\n[Test 7] Check message content');

  Mail.fake();

  await registerUser('david@example.com', 'David');

  const sent = Mail.sent(WelcomeEmail)[0];

  console.log(`  Has correct recipient: ${sent.hasTo('david@example.com')}`);
  console.log(`  Has CC: ${sent.hasCc('admin@example.com')}`);
  console.log(`  Subject contains "Welcome": ${sent.subjectContains('Welcome')}`);
  console.log(`  HTML contains "David": ${sent.htmlContains('David')}`);
  console.log(`  HTML contains "MyApp": ${sent.htmlContains('MyApp')}`);

  Mail.restore();

  // ----------------------------------------
  // Test 8: Queue assertions
  // ----------------------------------------
  console.log('\n[Test 8] Queue assertions');

  Mail.fake();

  // Queue an email (simulates background job)
  await Mail.to('user@example.com').queue(new WelcomeEmail('User', 'MyApp'));

  try {
    Mail.assertQueued(WelcomeEmail);
    console.log('  ✓ WelcomeEmail was queued');
  } catch {
    console.log('  ✗ WelcomeEmail was NOT queued');
  }

  try {
    Mail.assertNothingSent();
    console.log('  ✓ Nothing was sent directly (only queued)');
  } catch {
    console.log('  ✗ Something was sent directly');
  }

  Mail.restore();

  // ----------------------------------------
  // Summary
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('All tests completed!');
  console.log('='.repeat(60));
  console.log(`
Key Mail::fake() methods:
  - Mail.fake()                    Enable fake mode
  - Mail.restore()                 Restore real mailer
  - Mail.assertSent(Mailable)      Assert mailable was sent
  - Mail.assertSentCount(M, n)     Assert sent n times
  - Mail.assertNotSent(Mailable)   Assert NOT sent
  - Mail.assertNothingSent()       Assert nothing sent
  - Mail.assertQueued(Mailable)    Assert mailable was queued
  - Mail.sent()                    Get all sent messages
  - Mail.sent(Mailable)            Get sent messages of type

AssertableMessage methods:
  - hasTo(email)                   Check recipient
  - hasCc(email)                   Check CC
  - hasBcc(email)                  Check BCC
  - hasSubject(subject)            Check exact subject
  - subjectContains(text)          Check subject contains
  - hasHtml()                      Has HTML content
  - htmlContains(text)             HTML contains text
  - hasAttachment(filename)        Has attachment
  - getTo(), getCc(), getBcc()     Get recipients
  - getSubject(), getHtml()        Get content
`);
}

// Run the tests
runTests().catch(console.error);
