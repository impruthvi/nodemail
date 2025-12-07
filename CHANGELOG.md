# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2025-12-07

### Added
- **Template Engine Support** (Phase 4 complete)
  - HandlebarsEngine with dynamic loading and caching
  - EjsEngine with dynamic loading and caching
  - PugEngine with dynamic loading and caching
  - TemplateEngine interface for custom engines
- **Complete Fluent API** - All email options now chainable
  - Added `cc()` method for carbon copy recipients
  - Added `bcc()` method for blind carbon copy recipients
  - Added `replyTo()` method for reply-to addresses
  - Added `attachments()` method for file attachments
  - Added `headers()` method for custom headers
- **Laravel-like Mailable Pattern** - Elegant email class API
  - `Mailable.to()` method for setting recipients
  - `Mailable.send()` method for direct sending
  - `Mail.to().send(mailable)` Laravel-style syntax (recommended)
  - `mailable.to().send()` alternative direct syntax
  - Protected methods: `cc()`, `bcc()`, `replyTo()`, `attach()`, `withHeaders()`
- Enhanced MailManager with automatic template rendering
- Added template configuration to MailConfig
  - Support for 'handlebars', 'ejs', 'pug' engines
  - Custom engine instance support
  - Configurable views path, extension, and caching
- Template engine tests (34 new tests)
  - HandlebarsEngine.test.ts (11 tests)
  - EjsEngine.test.ts (11 tests)
  - PugEngine.test.ts (12 tests)
- Mailable tests (10 new tests)
  - Comprehensive Mailable class testing
  - Template support validation
  - Laravel-style API testing
- Template examples
  - examples/with-handlebars.ts
  - examples/with-ejs.ts
  - examples/with-pug.ts
  - examples/with-mailable-templates.ts (refactored)
  - examples/views/ directory with sample templates
- Test utilities
  - test-smtp-ethereal.ts for instant SMTP testing
  - test-templates.ts for template engine validation

### Changed
- **BREAKING**: Refactored Mailable class to Laravel-like pattern
  - Removed `getMailOptions()` method
  - Now uses `build()` method with fluent API
  - Direct sending capability added
- Updated package.json to version 0.4.0
- Added handlebars, ejs, pug to peerDependencies (all optional)
- Enhanced MessageBuilder.send() to accept Mailable instances
- Updated test suite: 122 total tests (17 new tests added)
- Code coverage: 85%+ overall
- Template engines coverage: 93.5%
- ESLint configuration for all directories (src, examples, tests)

### Fixed
- Type safety for template engine configuration
- Promise handling in template rendering
- ESLint warnings for template engine dynamic loading
- ESLint parsing errors for examples directory
- Floating promise warnings in example files

## [0.3.0] - 2025-11-25

### Added
- **New email providers** (3 additional providers)
  - MailgunProvider with dynamic loading
  - ResendProvider with dynamic loading
  - PostmarkProvider with dynamic loading
- Example files for new providers
  - examples/mailgun.ts
  - examples/resend.ts
  - examples/postmark.ts
- Support for all provider-specific features
  - Mailgun: EU region support, custom headers
  - Resend: Tags and custom headers
  - Postmark: Message streams and tags
- Updated MailManager to support 6 total providers

### Changed
- Updated README with documentation for Mailgun, Resend, and Postmark
- Updated package.json to version 0.3.0
- Added form-data as peer dependency for Mailgun
- Updated provider installation instructions

### Fixed
- TypeScript strict mode compliance for new providers
- ESLint warnings with proper annotations

## [0.2.0] - 2025-11-23

### Added
- **Complete test suite** with 95%+ coverage (25 tests)
  - Unit tests for SmtpProvider (12 tests)
  - Unit tests for MailManager (13 tests)
  - MessageBuilder fluent API tests
- Jest configuration excluding optional dependencies from coverage
- Tests for provider factory pattern and caching

### Changed
- Updated README with current feature status
- PROGRESS.md now reflects Phase 2 completion

## [0.1.0] - 2025-11-23

### Added
- **Core email functionality**
  - Mail facade with fluent API (`Mail.to().subject().send()`)
  - MailManager with provider factory pattern
  - MessageBuilder with chainable methods
  
- **Email providers** (3 total)
  - SMTP provider via nodemailer ✅ Tested
  - SendGrid provider via @sendgrid/mail
  - AWS SES provider via @aws-sdk/client-ses
  
- **Features**
  - Multiple recipients (to, cc, bcc)
  - HTML and text content
  - Email attachments (SMTP, SendGrid)
  - Address formatting with names
  - Reply-to support
  - Custom headers
  - Error handling with graceful degradation
  
- **Type safety**
  - Full TypeScript support
  - Strict mode enabled
  - Complete type definitions
  
- **Architecture**
  - Lightweight core (~25MB with SMTP only)
  - Optional providers as peerDependencies
  - Provider caching for performance
  - Dynamic provider loading
  
- **Documentation**
  - README with examples for all providers
  - Examples folder with working demos
  - Installation guide for each provider
  - CONTRIBUTING.md
  
- **Development**
  - ESLint 9 with flat config
  - Prettier formatting
  - TypeScript 5.6.3
  - Jest testing framework
  - Build and lint scripts

### Fixed
- TypeScript strict mode compliance
- ESLint warnings in provider implementations
- Address formatting for MailAddress objects

## [0.0.1] - 2025-11-23

### Added
- Initial project setup
- Package structure
- Git repository initialization
- MIT License
