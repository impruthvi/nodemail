# laramail

[![npm version](https://badge.fury.io/js/laramail.svg)](https://www.npmjs.com/package/laramail)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fnodemail.impruthvi.me%2Fstats.json&query=%24.tests&label=tests&suffix=%20passing&color=brightgreen)](https://github.com/impruthvi/laramail)
[![Coverage](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fnodemail.impruthvi.me%2Fstats.json&query=%24.coverage&label=coverage&suffix=%25&color=brightgreen)](https://github.com/impruthvi/laramail)
[![Documentation](https://img.shields.io/badge/docs-laramail-blue)](https://nodemail.impruthvi.me/)

**Laravel's elegant Mail system, reimagined for Node.js/TypeScript.**

Switch providers with one config change. Test with `Mail.fake()`. Send with `Mail.to(user).send(new WelcomeEmail())`.

```typescript
// That's it. Same API whether you use SMTP, SendGrid, SES, Mailgun, Resend, or Postmark.
await Mail.to('user@example.com').send(new WelcomeEmail(user));
```

## How laramail Compares

| Feature | laramail | nodemailer | @sendgrid/mail | resend |
|---------|:--------:|:----------:|:--------------:|:------:|
| Multi-provider support | 6 built-in | SMTP only | SendGrid only | Resend only |
| Switch provider via config | Yes | No | No | No |
| Provider failover | Auto chain | No | No | No |
| Mailable classes | Laravel-style | No | No | No |
| `Mail.fake()` testing | Yes | No | No | No |
| Template engines | HBS, EJS, Pug | No | Limited | No |
| Markdown emails | Components | No | No | No |
| Queue support | Bull / BullMQ | No | No | No |
| Rate limiting | Sliding window | No | No | No |
| Email events | Hooks | No | No | No |
| Log transport | Built-in | No | No | No |
| Custom providers | `Mail.extend()` | No | No | No |
| Staging redirect | `Mail.alwaysTo()` | No | No | No |
| CLI tools | 8 commands | No | No | No |
| TypeScript | First-class | @types needed | Yes | Yes |

## Installation

```bash
npm install laramail
```

Add providers and engines as needed — only install what you use:

```bash
npm install @sendgrid/mail    # SendGrid
npm install @aws-sdk/client-ses  # AWS SES
npm install mailgun.js form-data # Mailgun
npm install resend               # Resend
npm install postmark             # Postmark
npm install handlebars           # Template engine
npm install ejs                  # Template engine
npm install pug                  # Template engine
npm install marked juice         # Markdown emails
npm install bullmq               # Queue support
```

## Quick Start

```typescript
import { Mail } from 'laramail';

// 1. Configure once
Mail.configure({
  default: 'smtp',
  from: { address: 'noreply@example.com', name: 'My App' },
  mailers: {
    smtp: {
      driver: 'smtp',
      host: process.env.SMTP_HOST,
      port: 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    },
  },
});

// 2. Send emails
await Mail.to('user@example.com')
  .subject('Welcome!')
  .html('<h1>Hello World!</h1>')
  .send();
```

**Switch providers** by changing the driver — no code changes:

```typescript
mailers: {
  sendgrid: { driver: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY },
  ses:      { driver: 'ses', region: 'us-east-1', accessKeyId: '...', secretAccessKey: '...' },
  mailgun:  { driver: 'mailgun', domain: '...', apiKey: '...' },
  resend:   { driver: 'resend', apiKey: '...' },
  postmark: { driver: 'postmark', serverToken: '...' },
}
```

## Mailable Classes

Create reusable, testable email classes — just like Laravel:

```typescript
import { Mailable } from 'laramail';

class WelcomeEmail extends Mailable {
  constructor(private user: { name: string }) {
    super();
  }

  build() {
    return this
      .subject(`Welcome, ${this.user.name}!`)
      .html(`<h1>Hello ${this.user.name}!</h1>`);
  }
}

await Mail.to('user@example.com').send(new WelcomeEmail(user));
```

## Testing with Mail.fake()

Test emails without sending — Laravel-style assertions:

```typescript
beforeEach(() => Mail.fake());
afterEach(() => Mail.restore());

it('sends welcome email', async () => {
  await Mail.to('user@example.com').send(new WelcomeEmail('John'));

  Mail.assertSent(WelcomeEmail);
  Mail.assertSent(WelcomeEmail, (mail) =>
    mail.hasTo('user@example.com') && mail.subjectContains('Welcome')
  );
  Mail.assertSentCount(WelcomeEmail, 1);
  Mail.assertNotSent(PasswordResetEmail);
});
```

**Available assertions:** `assertSent`, `assertSentCount`, `assertNotSent`, `assertNothingSent`, `assertQueued`, `assertNothingQueued`, `simulateFailures`, `resetFailures`

**AssertableMessage methods:** `hasTo`, `hasCc`, `hasBcc`, `hasSubject`, `subjectContains`, `htmlContains`, `textContains`, `hasAttachment`, `hasPriority`, `hasHeader`, `isMarkdown`, `wasFailoverUsed`, `getProvider`

## Template Engines

Use Handlebars, EJS, or Pug for email templates:

```typescript
Mail.configure({
  // ...mailer config
  templates: {
    engine: 'handlebars', // or 'ejs' or 'pug'
    viewsPath: './views/emails',
    cache: true,
  },
});

await Mail.to('user@example.com')
  .subject('Welcome!')
  .template('welcome')
  .data({ name: 'John', appName: 'My App' })
  .send();
```

## Markdown Emails

Write emails in Markdown with built-in components:

```typescript
import { MarkdownMailable } from 'laramail';

class WelcomeEmail extends MarkdownMailable {
  build(): this {
    return this.subject('Welcome!').markdown(`
# Hello, {{name}}!

Thanks for joining.

[button url="https://example.com" color="primary"]Get Started[/button]

[panel]Need help? Contact support@example.com[/panel]
    `, { name: this.user.name });
  }
}
```

**Components:** `[button url="..." color="primary|success|error"]`, `[panel]...[/panel]`, `[table]...[/table]`

## Provider Failover

Automatic failover to backup providers with retries and monitoring:

```typescript
Mail.configure({
  default: 'smtp',
  mailers: { smtp: { ... }, sendgrid: { ... }, ses: { ... } },
  failover: {
    chain: ['sendgrid', 'ses'],
    maxRetriesPerProvider: 2,
    retryDelay: 1000,
    onFailover: (event) => console.log(`${event.failedMailer} → ${event.nextMailer}`),
  },
});
```

## Queue Support

Background sending with Bull or BullMQ:

```typescript
Mail.configure({
  // ...mailer config
  queue: {
    driver: 'bullmq',
    connection: { host: 'localhost', port: 6379 },
    retries: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

await Mail.to('user@example.com').queue(new WelcomeEmail(user));          // Immediate
await Mail.to('user@example.com').later(60, new WelcomeEmail(user));      // 60s delay
await Mail.to('user@example.com').at(scheduledDate, new WelcomeEmail(user)); // Scheduled
await Mail.processQueue();                                                 // Worker
```

## Email Events

Hook into the email lifecycle:

```typescript
Mail.onSending((event) => {
  console.log(`Sending to ${event.options.to}`);
  event.options.headers = { ...event.options.headers, 'X-Tracking': '123' };
  // return false to cancel
});

Mail.onSent((event) => console.log(`Sent! ID: ${event.response.messageId}`));
Mail.onFailed((event) => console.error(`Failed: ${event.error}`));
```

## Rate Limiting

Per-provider sliding window rate limiting:

```typescript
Mail.configure({
  // ...mailer config
  rateLimit: { maxPerWindow: 100, windowMs: 60000 },
});

// Per-mailer override
mailers: {
  smtp: {
    driver: 'smtp', host: '...',
    rateLimit: { maxPerWindow: 10, windowMs: 1000 },
  },
}
```

When exceeded, returns `{ success: false }` — never throws.

## Log Transport

Use the `log` driver during development — emails are printed to console instead of sent:

```typescript
Mail.configure({
  default: 'log',
  from: { address: 'dev@example.com', name: 'Dev' },
  mailers: {
    log: { driver: 'log' },
  },
});

await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();
// Prints formatted email to console — no SMTP needed
```

## Custom Providers

Register your own mail provider with `Mail.extend()`:

```typescript
import { Mail } from 'laramail';

Mail.extend('custom-api', (config) => ({
  async send(options) {
    const res = await fetch('https://api.example.com/send', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    return { success: res.ok, messageId: (await res.json()).id };
  },
}));

Mail.configure({
  default: 'api',
  from: { address: 'noreply@example.com', name: 'App' },
  mailers: { api: { driver: 'custom-api' } },
});
```

## Staging Redirect (alwaysTo)

Redirect all emails to a single address — perfect for staging environments:

```typescript
Mail.alwaysTo('dev-team@example.com');
// All emails now go to dev-team@example.com, CC/BCC cleared
// Call Mail.alwaysTo(undefined) to disable

// Or via config:
Mail.configure({
  // ...
  alwaysTo: 'dev-team@example.com',
});
```

## Email Preview

Preview rendered emails without sending:

```typescript
const preview = await Mail.to('user@example.com')
  .subject('Hello')
  .html('<p>Hi</p>')
  .priority('high')
  .preview();

console.log(preview.html, preview.headers);
```

## Complete Fluent API

```typescript
await Mail.to('user@example.com')
  .subject('Complete Example')
  .html('<h1>Hello!</h1>')
  .text('Hello!')
  .from('custom@example.com')
  .cc(['manager@example.com'])
  .bcc('archive@example.com')
  .replyTo('support@example.com')
  .attachments([{ filename: 'report.pdf', path: './report.pdf' }])
  .priority('high')
  .headers({ 'X-Custom': 'value' })
  .send();
```

## CLI Tools

```bash
npx laramail queue:work              # Process queued emails
npx laramail queue:status            # Show queue job counts
npx laramail queue:clear -s failed   # Clear failed jobs
npx laramail queue:retry             # Retry failed jobs
npx laramail preview --mailable ./src/mail/WelcomeEmail.ts
npx laramail send:test --to you@example.com
npx laramail make:mailable WelcomeEmail
npx laramail make:mailable NewsletterEmail --markdown
npx laramail config:check            # Validate configuration
npx laramail config:check --test     # Test provider connections
```

### Configuration File

```typescript
// laramail.config.ts
import { defineConfig } from 'laramail';

export default defineConfig({
  default: 'smtp',
  from: { address: 'noreply@example.com', name: 'My App' },
  mailers: {
    smtp: {
      driver: 'smtp',
      host: process.env.SMTP_HOST,
      port: 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    },
  },
});
```

## Why laramail?

If you've used Laravel's Mail, you know how elegant it is:

```php
// Laravel (PHP)
Mail::to($user->email)->send(new WelcomeEmail($user));
```

**laramail** brings this same elegance to Node.js:

```typescript
// laramail (TypeScript)
await Mail.to(user.email).send(new WelcomeEmail(user));
```

**Lightweight by design** — base package is ~25MB (SMTP only). Add providers as needed.

## Contributing

```bash
git clone https://github.com/impruthvi/laramail.git
cd laramail
npm install
npm run build
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © [Pruthvi](https://github.com/impruthvi)

## Support

- [Documentation](https://nodemail.impruthvi.me/)
- [GitHub Issues](https://github.com/impruthvi/laramail/issues)
- [GitHub Discussions](https://github.com/impruthvi/laramail/discussions)

---

**If laramail helps you, give it a star!** It helps others discover the project.
