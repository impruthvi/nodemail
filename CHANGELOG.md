# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
