# nodemail

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)

> 🚧 **Work in Progress** - A unified mail service for Node.js/TypeScript inspired by Laravel's elegant Mail system.

**nodemail** aims to bring the simplicity and elegance of Laravel's Mail system to the Node.js ecosystem with full TypeScript support.

## 🎯 Vision

A lightweight, developer-friendly email library where you can:
- Switch email providers by just changing environment variables
- Use elegant, class-based Mailable patterns  
- Keep your package lightweight (install only what you need)
- Write clean, maintainable email code

Inspired by [Laravel's Mail system](https://laravel.com/docs/mail).

## ✨ Planned Features

- 🎯 **Multiple Providers** - SMTP, SendGrid, AWS SES, Mailgun, Resend, Postmark
- 🪶 **Lightweight** - Only ~25MB with SMTP, install additional providers as needed
- 📝 **Mailable Classes** - Reusable, testable email definitions
- 🔔 **Notifications** - Multi-channel notification system
- 📋 **Markdown Mail** - Beautiful emails from markdown
- 🧪 **Testing Utilities** - Mail::fake() for testing
- 📦 **Queue Support** - Background email sending
- 🎨 **Template Engines** - Handlebars, EJS, Pug
- 🌍 **i18n Support** - Multi-language emails
- 🔒 **Type-Safe** - Full TypeScript support

## 📦 Installation

```bash
npm install nodemail
```

**Lightweight by default!** Only includes SMTP support (~25MB).

### Adding More Providers (Optional)

```bash
# SendGrid
npm install @sendgrid/mail

# AWS SES  
npm install @aws-sdk/client-ses

# Mailgun
npm install mailgun.js

# Resend
npm install resend

# Postmark
npm install postmark
```

## 🚀 Quick Example (Planned API)

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

**Phase 2: Core Implementation** 🚧 Next
- Mail Manager & Facade
- Provider implementations (SMTP, SendGrid, SES, etc.)
- Mailable base classes
- Configuration system
- Message builder

**Phase 3+: Advanced Features** 📋 Planned
- Notification system
- Queue integration  
- Template engines
- Testing utilities (Mail::fake())
- CLI tools
- Markdown mail

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

**nodemail** brings this same elegance to Node.js/TypeScript:

```typescript
// nodemail (TypeScript)
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
