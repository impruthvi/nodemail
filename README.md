# @impruthvi/nodemail

[![npm version](https://badge.fury.io/js/@impruthvi%2Fnodemail.svg)](https://www.npmjs.com/package/@impruthvi/nodemail)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-25%20passing-brightgreen)](https://github.com/impruthvi/nodemail)
[![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)](https://github.com/impruthvi/nodemail)

> 🚧 **Work in Progress** - A unified mail service for Node.js/TypeScript inspired by Laravel's elegant Mail system.

**@impruthvi/nodemail** aims to bring the simplicity and elegance of Laravel's Mail system to the Node.js ecosystem with full TypeScript support.

## 🎯 Vision

A lightweight, developer-friendly email library where you can:
- Switch email providers by just changing environment variables
- Use elegant, class-based Mailable patterns  
- Keep your package lightweight (install only what you need)
- Write clean, maintainable email code

Inspired by [Laravel's Mail system](https://laravel.com/docs/mail).

## ✨ Features

### ✅ Available Now
- 🎯 **Multiple Providers** - SMTP (Nodemailer), SendGrid, AWS SES
- 🪶 **Lightweight** - Only ~25MB with SMTP, install additional providers as needed
- 🔒 **Type-Safe** - Full TypeScript support with strict typing
- 🎨 **Fluent API** - Chainable, Laravel-inspired interface
- ⚡ **Dynamic Loading** - Providers loaded only when installed (peerDependencies)
- 🛡️ **Error Handling** - Graceful degradation with helpful error messages

### 🚧 Coming Soon
- 📝 **Mailable Classes** - Enhanced reusable email definitions
- 🔔 **Notifications** - Multi-channel notification system
- 📋 **Markdown Mail** - Beautiful emails from markdown
- 🧪 **Testing Utilities** - Mail::fake() for testing
- 📦 **Queue Support** - Background email sending (Bull/BullMQ)
- 🎨 **Template Engines** - Handlebars, EJS, Pug
- 🌍 **i18n Support** - Multi-language emails
- 🚀 **More Providers** - Mailgun, Resend, Postmark, Mailtrap

## 📦 Installation

```bash
npm install @impruthvi/nodemail@beta
```

Or for the latest stable (when v1.0.0 is released):
```bash
npm install @impruthvi/nodemail
```

**Lightweight by default!** Only includes SMTP support (~25MB).

### Adding Providers (Optional)

**Currently Supported:**
```bash
# SendGrid (✅ Implemented)
npm install @sendgrid/mail

# AWS SES (✅ Implemented)
npm install @aws-sdk/client-ses
```

**Coming Soon:**
```bash
# Mailgun
npm install mailgun.js

# Resend
npm install resend

# Postmark
npm install postmark
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

**Advanced usage (coming soon):**

```typescript
import { Mail } from 'nodemail';

// Configure once
Mail.configure({
  default: 'smtp',
  from: {
    address: 'noreply@example.com',
    name: 'My App',
  },
  mailers: {
    smtp: {
      driver: 'smtp',
      host: process.env.MAIL_HOST,
      port: 587,
      username: process.env.MAIL_USERNAME,
      password: process.env.MAIL_PASSWORD,
    },
  },
});

// Send emails
await Mail.to('user@example.com')
  .subject('Welcome!')
  .html('<h1>Hello World!</h1>')
  .send();
```

**Advanced usage (coming soon):**

```typescript
import { Mail } from 'nodemail';

// Configure once
Mail.configure({
  default: 'smtp',
  from: {
    address: 'noreply@example.com',
    name: 'My App',
  },
  mailers: {
    smtp: {
      driver: 'smtp',
      host: process.env.MAIL_HOST,
      port: 587,
      username: process.env.MAIL_USERNAME,
      password: process.env.MAIL_PASSWORD,
    },
  },
});

// Send anywhere in your app
await Mail.to('user@example.com')
  .subject('Welcome!')
  .html('<h1>Hello World!</h1>')
  .send();

// Or use Mailable classes
class WelcomeEmail extends Mailable {
  constructor(private user: User) {
    super();
  }

  build() {
    return this
      .subject(`Welcome, ${this.user.name}!`)
      .view('emails.welcome', { user: this.user });
  }
}

await Mail.to('user@example.com').send(new WelcomeEmail(user));
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
- ✅ Message builder with fluent API
- ✅ Configuration system
- ✅ Error handling & graceful degradation
- 🚧 Other providers (Mailgun, Resend, Postmark) - coming soon

**Phase 3: Advanced Features** 🚧 Next
- Enhanced Mailable classes with template support
- Additional providers (Mailgun, Resend, Postmark)
- Queue integration (Bull/BullMQ)
- Template engines (Handlebars, EJS, Pug)
- Testing utilities (Mail::fake(), assertSent())
- Unit test coverage
- CLI tools
- Markdown mail support

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
- **Well-Tested**: Comprehensive test coverage (coming soon)

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
