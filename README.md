# @impruthvi/nodemail

[![npm version](https://badge.fury.io/js/@impruthvi%2Fnodemail.svg)](https://www.npmjs.com/package/@impruthvi/nodemail)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-172%20passing-brightgreen)](https://github.com/impruthvi/nodemail)
[![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)](https://github.com/impruthvi/nodemail)

**@impruthvi/nodemail** brings the simplicity and elegance of Laravel's Mail system to the Node.js ecosystem with full TypeScript support.

## 🎯 Vision

A lightweight, developer-friendly email library where you can:
- Switch email providers by just changing environment variables
- Use elegant, class-based Mailable patterns  
- Keep your package lightweight (install only what you need)
- Write clean, maintainable email code

Inspired by [Laravel's Mail system](https://laravel.com/docs/mail).

## ✨ Features

### ✅ Available Now (v0.5.0)
- 🎯 **Multiple Providers** - SMTP (Nodemailer), SendGrid, AWS SES, Mailgun, Resend, Postmark
- 🎨 **Template Engines** - Handlebars, EJS, Pug support with dynamic loading
- 📝 **Mailable Classes** - Reusable email definitions with template support
- 🧪 **Testing Utilities** - Mail::fake() for testing (Laravel-style assertions)
- 🪶 **Lightweight** - Only ~25MB with SMTP, install additional providers as needed
- 🔒 **Type-Safe** - Full TypeScript support with strict typing
- ✨ **Complete Fluent API** - Chain to(), subject(), html(), template(), data(), cc(), bcc(), attachments(), headers()
- ⚡ **Dynamic Loading** - Providers and templates loaded only when installed (peerDependencies)
- 🛡️ **Error Handling** - Graceful degradation with helpful error messages

### 🚧 Coming Soon
- 🔔 **Notifications** - Multi-channel notification system
- 📋 **Markdown Mail** - Beautiful emails from markdown
- 📦 **Queue Support** - Background email sending (Bull/BullMQ)
- 🌍 **i18n Support** - Multi-language emails
- 🚀 **More Providers** - Mailtrap and others

## 📦 Installation

```bash
npm install @impruthvi/nodemail
```

Or install a specific version:
```bash
npm install @impruthvi/nodemail@0.5.0
```

**Lightweight by default!** Only includes SMTP support (~25MB).

### Adding Providers (Optional)

**Currently Supported:**
```bash
# SendGrid (✅ Implemented)
npm install @sendgrid/mail

# AWS SES (✅ Implemented)
npm install @aws-sdk/client-ses

# Mailgun (✅ Implemented)
npm install mailgun.js form-data

# Resend (✅ Implemented)
npm install resend

# Postmark (✅ Implemented)
npm install postmark
```

### Adding Template Engines (Optional)

**Currently Supported:**
```bash
# Handlebars (✅ Implemented)
npm install handlebars

# EJS (✅ Implemented)
npm install ejs

# Pug (✅ Implemented)
npm install pug
```

## 🚀 Quick Start

### SMTP (Nodemailer)

```typescript
import { Mail } from 'nodemail';

Mail.configure({
  default: 'smtp',
  from: {
    address: 'noreply@example.com',
    name: 'My App',
  },
  mailers: {
    smtp: {
      driver: 'smtp',
      host: process.env.SMTP_HOST,
      port: 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
  },
});

// Send emails
await Mail.to('user@example.com')
  .subject('Welcome!')
  .html('<h1>Hello World!</h1>')
  .send();
```

### SendGrid

```typescript
// npm install @sendgrid/mail
import { Mail } from '@impruthvi/nodemail';

Mail.configure({
  default: 'sendgrid',
  from: { address: 'noreply@example.com', name: 'My App' },
  mailers: {
    sendgrid: {
      driver: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY,
    },
  },
});
```

### AWS SES

```typescript
// npm install @aws-sdk/client-ses
import { Mail } from '@impruthvi/nodemail';

Mail.configure({
  default: 'ses',
  from: { address: 'noreply@example.com', name: 'My App' },
  mailers: {
    ses: {
      driver: 'ses',
      region: 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  },
});
```

### Mailgun

```typescript
// npm install mailgun.js form-data
import { Mail } from '@impruthvi/nodemail';

Mail.configure({
  default: 'mailgun',
  from: { address: 'noreply@yourdomain.com', name: 'My App' },
  mailers: {
    mailgun: {
      driver: 'mailgun',
      domain: process.env.MAILGUN_DOMAIN,
      apiKey: process.env.MAILGUN_API_KEY,
      region: 'us', // or 'eu'
    },
  },
});
```

### Resend

```typescript
// npm install resend
import { Mail } from '@impruthvi/nodemail';

Mail.configure({
  default: 'resend',
  from: { address: 'noreply@yourdomain.com', name: 'My App' },
  mailers: {
    resend: {
      driver: 'resend',
      apiKey: process.env.RESEND_API_KEY,
    },
  },
});
```

### Postmark

```typescript
// npm install postmark
import { Mail } from '@impruthvi/nodemail';

Mail.configure({
  default: 'postmark',
  from: { address: 'noreply@yourdomain.com', name: 'My App' },
  mailers: {
    postmark: {
      driver: 'postmark',
      serverToken: process.env.POSTMARK_SERVER_TOKEN,
    },
  },
});
```

## 🎨 Template Engines

### Using Handlebars

```typescript
// npm install handlebars
import { Mail } from '@impruthvi/nodemail';

Mail.configure({
  default: 'smtp',
  from: { address: 'noreply@example.com', name: 'My App' },
  mailers: { /* your mailer config */ },
  templates: {
    engine: 'handlebars',
    viewsPath: './views/emails',
    extension: '.hbs',
    cache: true,
  },
});

// Send with template
await Mail.to('user@example.com')
  .subject('Welcome!')
  .template('welcome')
  .data({ name: 'John', appName: 'My App' })
  .send();
```

**Template file** (`views/emails/welcome.hbs`):
```handlebars
<h1>Welcome, {{name}}!</h1>
<p>Thank you for joining {{appName}}.</p>
```

### Using EJS

```typescript
// npm install ejs
Mail.configure({
  templates: {
    engine: 'ejs',
    viewsPath: './views/emails',
    extension: '.ejs',
  },
});

await Mail.to('customer@example.com')
  .subject('Your Invoice')
  .template('invoice')
  .data({ items: [...], total: 99.99 })
  .send();
```

### Using Pug

```typescript
// npm install pug
Mail.configure({
  templates: {
    engine: 'pug',
    viewsPath: './views/emails',
    cache: true,
  },
});

await Mail.to('user@example.com')
  .subject('Notification')
  .template('notification')
  .data({ title: 'Update', message: 'New features!' })
  .send();
```

## 📨 Complete Fluent API

```typescript
await Mail.to('user@example.com')
  .subject('Complete Example')
  .html('<h1>Hello!</h1>')
  .text('Hello!')
  .from('custom@example.com')
  .cc(['manager@example.com', 'team@example.com'])
  .bcc('archive@example.com')
  .replyTo('support@example.com')
  .attachments([
    { filename: 'report.pdf', path: './files/report.pdf' },
    { filename: 'image.png', content: buffer },
  ])
  .headers({ 'X-Custom-Header': 'value' })
  .send();
```

## 📝 Mailable Classes

Create reusable email classes with Laravel-like syntax:

```typescript
import { Mailable } from '@impruthvi/nodemail';

class WelcomeEmail extends Mailable {
  constructor(
    private user: { name: string; email: string },
    private appName: string
  ) {
    super();
  }

  build() {
    return this
      .subject(`Welcome to ${this.appName}!`)
      .view('welcome', {
        name: this.user.name,
        email: this.user.email,
        appName: this.appName,
      });
  }
}

// Method 1: Laravel-style (recommended)
await Mail.to('user@example.com').send(new WelcomeEmail(user, 'My App'));

// Method 2: Direct sending
await new WelcomeEmail(user, 'My App').to('user@example.com').send();
```

## 🧪 Testing with Mail::fake()

Test your emails without actually sending them - just like Laravel's `Mail::fake()`:

```typescript
import { Mail, Mailable } from '@impruthvi/nodemail';

// Your Mailable class
class WelcomeEmail extends Mailable {
  constructor(public userName: string) {
    super();
  }

  build() {
    return this
      .subject(`Welcome, ${this.userName}!`)
      .html(`<h1>Hello ${this.userName}!</h1>`);
  }
}

// In your tests
describe('User Registration', () => {
  beforeEach(() => {
    Mail.fake(); // Enable fake mode
  });

  afterEach(() => {
    Mail.restore(); // Restore real mailer
  });

  it('sends welcome email on registration', async () => {
    // Your application code that sends email
    await Mail.to('user@example.com').send(new WelcomeEmail('John'));

    // Assert email was sent
    Mail.assertSent(WelcomeEmail);

    // Assert with conditions
    Mail.assertSent(WelcomeEmail, (mail) => {
      return mail.hasTo('user@example.com') &&
             mail.subjectContains('Welcome');
    });

    // Assert sent count
    Mail.assertSentCount(WelcomeEmail, 1);

    // Assert other mailables were NOT sent
    Mail.assertNotSent(PasswordResetEmail);
  });

  it('does not send email when validation fails', async () => {
    // Code that doesn't send email
    Mail.assertNothingSent();
  });
});
```

### Available Assertions

| Method | Description |
|--------|-------------|
| `Mail.fake()` | Enable fake mode (store emails instead of sending) |
| `Mail.restore()` | Restore real mailer |
| `Mail.assertSent(Mailable)` | Assert mailable was sent |
| `Mail.assertSent(Mailable, callback)` | Assert with custom conditions |
| `Mail.assertSentCount(Mailable, count)` | Assert sent exactly N times |
| `Mail.assertNotSent(Mailable)` | Assert mailable was NOT sent |
| `Mail.assertNothingSent()` | Assert no emails were sent |
| `Mail.assertQueued(Mailable)` | Assert mailable was queued |
| `Mail.assertNothingQueued()` | Assert nothing was queued |
| `Mail.sent()` | Get all sent messages |
| `Mail.sent(Mailable)` | Get sent messages of specific type |

### AssertableMessage Methods

When inspecting sent messages, you can use these helper methods:

```typescript
const sent = Mail.sent(WelcomeEmail)[0];

// Check recipients
sent.hasTo('user@example.com');      // Check TO
sent.hasCc('cc@example.com');        // Check CC
sent.hasBcc('bcc@example.com');      // Check BCC

// Check content
sent.hasSubject('Welcome!');         // Exact subject match
sent.subjectContains('Welcome');     // Subject contains
sent.htmlContains('Hello');          // HTML contains
sent.textContains('Hello');          // Plain text contains

// Check attachments
sent.hasAttachments();               // Has any attachments
sent.hasAttachment('file.pdf');      // Has specific attachment

// Check headers
sent.hasHeader('X-Custom');          // Has header
sent.hasHeader('X-Custom', 'value'); // Header with value

// Get values
sent.getTo();                        // Get recipients array
sent.getSubject();                   // Get subject
sent.getHtml();                      // Get HTML content
```

## 🛠️ Current Status

**Phase 1: Project Setup** ✅ Complete
- TypeScript 5.6 configuration
- ESLint 9 (flat config)
- Modern tooling setup
- Package structure
- Core type definitions
- Lightweight architecture (peerDependencies)

**Phase 2: Core Implementation** ✅ Complete
- ✅ Mail Manager & Facade
- ✅ SMTP Provider (nodemailer)
- ✅ SendGrid Provider (@sendgrid/mail)
- ✅ AWS SES Provider (@aws-sdk/client-ses)
- ✅ Message builder with complete fluent API
- ✅ Configuration system
- ✅ Error handling & graceful degradation

**Phase 3: Additional Providers** ✅ Complete
- ✅ Mailgun Provider (mailgun.js)
- ✅ Resend Provider (resend)
- ✅ Postmark Provider (postmark)
- ✅ Dynamic loading for all providers
- ✅ Comprehensive provider tests

**Phase 4: Template Engines & Mailable** ✅ Complete
- ✅ Template engines (Handlebars, EJS, Pug)
- ✅ Laravel-like Mailable classes with template support
- ✅ Complete fluent API (cc, bcc, replyTo, attachments, headers)
- ✅ Dynamic template loading with caching

**Phase 5: Testing Utilities** ✅ Complete (v0.5.0)
- ✅ Mail::fake() for testing
- ✅ assertSent(), assertNotSent(), assertNothingSent()
- ✅ assertQueued(), assertNothingQueued()
- ✅ AssertableMessage with inspection methods
- ✅ Comprehensive test suite (172 tests)
- ✅ 85%+ code coverage

**Phase 6: Advanced Features** 🚧 Coming Soon
- Queue integration (Bull/BullMQ)
- CLI tools
- Markdown mail support
- Multi-channel notifications
- i18n support

## 🤝 Contributing

This project is in early development. Contributions, ideas, and feedback are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/impruthvi/nodemail.git
cd nodemail

# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint

# Format code
npm run format
```

## 💡 Why nodemail?

### Inspired by Laravel, Built for Node.js

If you've used Laravel's Mail system, you know how elegant it is:

```php
// Laravel (PHP)
Mail::to($user->email)->send(new WelcomeEmail($user));
```

**@impruthvi/nodemail** brings this same elegance to Node.js/TypeScript:

```typescript
// @impruthvi/nodemail (TypeScript)
await Mail.to(user.email).send(new WelcomeEmail(user));
```

### Lightweight by Design

Unlike other packages that bundle everything:
- **Base package**: ~25MB (SMTP only)
- **Add providers as needed**: `npm install @sendgrid/mail`
- **No bloat**: Only install what you use

## 📊 Package Philosophy

- **Modular**: Install only the providers you need
- **Type-Safe**: Full TypeScript support with strict typing
- **Developer-Friendly**: Clean, intuitive API
- **Production-Ready**: Built with best practices
- **Well-Tested**: 172 passing tests with 85%+ coverage

## 📄 License

MIT © [Pruthvi](https://github.com/impruthvi)

## 🙏 Acknowledgments

Inspired by [Laravel's Mail system](https://laravel.com/docs/mail) - bringing elegant email handling to Node.js.

## 📞 Support & Community

- 📫 [GitHub Issues](https://github.com/impruthvi/nodemail/issues) - Bug reports and feature requests
- 💬 [GitHub Discussions](https://github.com/impruthvi/nodemail/discussions) - Questions and community chat

---

**⭐ If you like this idea, please star the repo!** It helps gauge interest and motivates development.

**🚀 Want to contribute?** Check out the issues labeled `good first issue` or `help wanted`.
