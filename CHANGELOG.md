# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.2] - 2026-03-30

### Changed

- **Badge URLs** — fixed README badges pointing to old `nodemail.impruthvi.me` domain, now correctly point to `laramail.impruthvi.me`.
- **Comparison table** — trimmed to 8 defensible rows where laramail genuinely wins; removed rows that could mislead developers familiar with nodemailer (template engines, TypeScript support).
- **npm keywords** — added `email-testing`, `mail-testing`, `nodemailer-mock`, `fake-mailer`, `test-email` for better npm search discovery.

## [1.4.1] - 2026-03-30

### Changed

- **README hero** — repositioned around `Mail.fake()` + zero-setup email testing as the headline feature. "AdonisJS mailer, but framework-agnostic" is now the one-line pitch. Provider switching moves to second paragraph.
- **npm description** — updated to lead with `Mail.fake()` + `Mail.assertSent()` for zero-setup email testing.

## [1.4.0] - 2026-03-22

### Added

- **Typed Error Classes** — `ConfigurationError`, `ValidationError`, `ProviderError`, `AllProvidersFailedError` replace generic `Error` throws across all source files. Users can now use `instanceof` for granular error handling.
- **CLI Command Tests** — 65 new tests covering all 8 CLI commands (`config:check`, `send:test`, `make:mailable`, `preview`, `queue:status`, `queue:retry`, `queue:clear`, `queue:work`) and config loader utilities.
- **Error Class Tests** — 37 tests for typed error hierarchy, instanceof discrimination, and integration with core modules.
- **SendGrid Provider Tests** — 11 tests covering constructor, send, address formatting, attachments, and error handling.
- **SES Provider Tests** — 13 tests covering constructor with/without credentials, send, address formatting, and error handling.
- **SMTP Connection Pooling** — `pool`, `maxConnections`, `maxMessages` options in `SmtpConfig` passed through to nodemailer transport.
- 129 new tests (774 total across 51 suites)

## [1.3.0] - 2026-03-15

### Added

- **Log Transport** — `LogProvider` for development: logs formatted email details to console instead of sending. Warns if used in production.
- **Custom Providers** — `Mail.extend(driver, factory)` to register custom mail providers. Custom providers are checked before built-in drivers, allowing overrides.
- **Always-To Redirect** — `Mail.alwaysTo(address)` redirects all emails to a single address, clearing CC/BCC. Perfect for staging environments. Also applies to `preview()`. Skipped in fake mode.
- 35 new tests (645 total)

## [1.2.0] - 2026-03-15

### Changed

- **Package renamed** from `@impruthvi/nodemail` to `laramail`
- CLI command changed from `npx nodemail` to `npx laramail`
- Config file pattern changed from `nodemail.config.*` to `laramail.config.*`
- Queue prefix default changed from `nodemail` to `laramail`
- README restructured (1076 → 368 lines)

### Added

- **README comparison table** — feature comparison vs nodemailer, @sendgrid/mail, and resend
- **Unified `MessageBuilder`** — single fluent builder for both real and fake mode, exported as public API
- **Custom driver support** — driver type now accepts custom strings via `(string & {})` for `Mail.extend()` readiness
- **Auto-synced VERSION** — `VERSION` export now reads from `package.json` automatically, no more drift

### Removed

- **Postinstall script** — removed thank-you message on install (zero user value, was an attack surface)
- **`MailtrapConfig` type** — removed dead type with no implementation

### Changed

- Merged `FakeableMessageBuilder` and `MessageBuilder` into a single `MessageBuilder` class (`src/core/MessageBuilder.ts`), eliminating ~170 lines of duplication
- CLI `config:check` now accepts custom driver names without erroring (preparing for `Mail.extend()`)

## [1.1.3] - 2026-03-05

### Fixed

- Fixed `queue:clear` CLI command to use `--status/-s` option instead of positional argument
- CLI now matches documented usage: `npx nodemail queue:clear --status failed`

## [1.1.1] - 2026-03-04

### Fixed

- Type handling and error management in preview and queue commands
- Improved async/sync handling in image embedding and priority tests

### Changed

- Added comprehensive test coverage for MailFacade, MailManager, Mailable, and QueueManager

## [1.1.0] - 2026-03-04

### Added

- **Enhanced CLI** (Phase 9 complete)
  - New `nodemail` CLI tool with 8 commands
  - `queue:work` - Start processing queued emails with concurrency control
  - `queue:status` - Show queue job counts (waiting, active, completed, failed, delayed, paused)
  - `queue:clear` - Clear jobs by status (completed, failed, delayed, waiting)
  - `queue:retry` - Retry failed jobs with optional limit
  - `preview` - Preview email in browser without sending (requires `open` package)
  - `send:test` - Send test email to verify configuration
  - `make:mailable` - Generate Mailable class with markdown/template options
  - `config:check` - Validate configuration with optional connection testing
- **Configuration file support**
  - Auto-detection of `nodemail.config.ts/js/mjs/cjs` in project root
  - `defineConfig` helper export for TypeScript autocomplete
- **Queue driver enhancements**
  - Added `getJobCounts()` method to QueueDriver interface
  - Added `clear()` method to clear jobs by status
  - Added `retryFailed()` method to retry failed jobs
  - Added `getFailedJobs()` method to list failed jobs
  - New `QueueJobCounts` and `FailedJob` types

### Changed

- Updated package.json to version 1.1.0
- Added `bin` entry for `nodemail` CLI command
- Added `chalk` and `open` as optional dependencies
- Extended `QueueDriver` interface with new inspection methods
- Implemented new methods in BullMQDriver and BullDriver

### Fixed

- TypeScript strict mode compliance for CLI commands
- Index signature property access in config validation

## [1.0.1] - 2026-02-15

### Added

- **Embedded Images** - CID support for inline images in HTML emails
- **Email Priority Levels** - `high`, `normal`, `low` priority with X-Priority headers
  - `Message.priority()` method for setting priority
  - `AssertableMessage.hasPriority()` and `getPriority()` for testing
- **Email Events System** - Lifecycle hooks for logging, analytics, and cancellation
  - `Mail.onSending()` - Hook before send (can cancel with `return false`, can mutate options)
  - `Mail.onSent()` - Hook after successful send
  - `Mail.onFailed()` - Hook on send failure
  - `Mail.clearListeners()` - Remove all event listeners
- **Email Preview** - Render emails without sending
  - `MessageBuilder.preview()` - Preview via fluent builder
  - `Mail.preview(mailable)` - Preview a Mailable instance
  - Full preprocessing (markdown, templates, priority headers) without firing events
- **Rate Limiting** - Per-provider sliding window algorithm
  - Global rate limit configuration
  - Per-mailer rate limit overrides
  - `onRateLimited` callback for monitoring
  - Returns `{ success: false }` when rate limited (no throw)

### Changed

- Updated package.json to version 1.0.1
- 522 passing tests

## [1.0.0] - 2026-01-20

### Added

- **Provider Failover** (Phase 8 complete)
  - `FailoverManager` with automatic provider chain
  - Configurable retries per provider (`maxRetriesPerProvider`)
  - Retry delays between attempts (`retryDelay`)
  - Failover delays between providers (`failoverDelay`)
  - `onFailover` callback for monitoring/logging failover events
  - Per-mailer failover configuration overrides
  - Response metadata: `provider`, `failoverUsed`, `failoverAttempts`
- **MailFake failover testing**
  - `Mail.simulateFailures(n)` - Simulate failures for first N sends
  - `Mail.resetFailures()` - Clear failure simulation state
  - `AssertableMessage.wasFailoverUsed()`, `getProvider()`, `getFailoverAttempts()`

### Changed

- Updated package.json to version 1.0.0
- 269 passing tests

## [0.7.0] - 2026-01-05

### Added

- **Markdown Mail** (Phase 7 complete)
  - `MarkdownMailable` base class for markdown-based emails
  - `MarkdownRenderer` with CSS inlining via `juice`
  - Built-in components:
    - `[button url="..." color="primary|success|error"]...[/button]`
    - `[panel]...[/panel]`
    - `[table]...[/table]`
  - Default responsive email theme
  - Custom themes and CSS support via `theme()` method
  - Markdown configuration in `MailConfig`
- **AssertableMessage markdown assertions**
  - `isMarkdown()` - Check if built from markdown
  - `getMarkdown()` - Get raw markdown source
  - `markdownContains()` - Check markdown source content

### Changed

- Updated package.json to version 0.7.0
- Added `marked` and `juice` as peer dependencies (optional)

## [0.6.0] - 2025-12-20

### Added

- **Queue Management** (Phase 6 complete)
  - `QueueManager` with Bull and BullMQ drivers
  - `BullMQDriver` - Modern queue driver using BullMQ
  - `BullDriver` - Legacy queue driver using Bull
  - Immediate queueing via `Mail.to().queue()`
  - Delayed sending via `Mail.to().later(seconds, mailable)`
  - Scheduled delivery via `Mail.to().at(date, mailable)`
  - Automatic retries with configurable backoff (fixed, exponential)
  - `Mail.processQueue()` for worker processes
- **MailFake queue assertions**
  - `Mail.assertQueued(Mailable)` - Assert mailable was queued
  - `Mail.assertNothingQueued()` - Assert nothing was queued
  - `Mail.hasQueued()` - Check if any messages were queued

### Changed

- Updated package.json to version 0.6.0
- Added `bullmq` and `bull` as peer dependencies (optional)
- Queue configuration added to `MailConfig`

## [0.5.0] - 2025-12-12

### Added

- **Testing Utilities** (Phase 5 complete)
  - `Mail.fake()` - Enable fake mode (store emails instead of sending)
  - `Mail.restore()` - Restore real mailer
  - `MailFake` class for test mode management
  - `AssertableMessage` class for inspecting sent messages
- **Assertions**
  - `Mail.assertSent(Mailable)` - Assert mailable was sent
  - `Mail.assertSent(Mailable, callback)` - Assert with custom conditions
  - `Mail.assertSentCount(Mailable, count)` - Assert sent exactly N times
  - `Mail.assertNotSent(Mailable)` - Assert mailable was NOT sent
  - `Mail.assertNothingSent()` - Assert no emails were sent
  - `Mail.sent()` - Get all sent messages
  - `Mail.sent(Mailable)` - Get sent messages of specific type
  - `Mail.hasSent()` - Check if any messages were sent
- **AssertableMessage methods**
  - `hasTo()`, `hasCc()`, `hasBcc()` - Check recipients
  - `hasSubject()`, `subjectContains()` - Check subject
  - `htmlContains()`, `textContains()` - Check content
  - `hasAttachments()`, `hasAttachment()` - Check attachments
  - `hasHeader()` - Check headers
  - `getTo()`, `getSubject()`, `getHtml()` - Get values

### Changed

- Updated package.json to version 0.5.0

## [0.4.0] - 2025-12-07

### Added

- **Template Engine Support** (Phase 4 complete)
  - `HandlebarsEngine` with dynamic loading and caching
  - `EjsEngine` with dynamic loading and caching
  - `PugEngine` with dynamic loading and caching
  - `TemplateEngine` interface for custom engines
- **Complete Fluent API** - All email options now chainable
  - `cc()` method for carbon copy recipients
  - `bcc()` method for blind carbon copy recipients
  - `replyTo()` method for reply-to addresses
  - `attachments()` method for file attachments
  - `headers()` method for custom headers
- **Laravel-like Mailable Pattern**
  - `Mailable.to()` method for setting recipients
  - `Mailable.send()` method for direct sending
  - `Mail.to().send(mailable)` Laravel-style syntax (recommended)
  - Protected methods: `cc()`, `bcc()`, `replyTo()`, `attach()`, `withHeaders()`
- Template configuration in `MailConfig`
  - Support for 'handlebars', 'ejs', 'pug' engines
  - Custom engine instance support
  - Configurable views path, extension, and caching

### Changed

- **BREAKING**: Refactored Mailable class to Laravel-like pattern
  - Removed `getMailOptions()` method
  - Now uses `build()` method with fluent API
- Updated package.json to version 0.4.0
- Added handlebars, ejs, pug to peerDependencies (all optional)
- Enhanced `MessageBuilder.send()` to accept Mailable instances
- 122 total tests

### Fixed

- Type safety for template engine configuration
- Promise handling in template rendering

## [0.3.0] - 2025-11-25

### Added

- **New email providers** (3 additional providers)
  - `MailgunProvider` with dynamic loading
  - `ResendProvider` with dynamic loading
  - `PostmarkProvider` with dynamic loading
- Provider-specific features
  - Mailgun: EU region support, custom headers
  - Resend: Tags and custom headers
  - Postmark: Message streams and tags

### Changed

- Updated package.json to version 0.3.0
- MailManager now supports 6 total providers
- Added `form-data` as peer dependency for Mailgun

### Fixed

- TypeScript strict mode compliance for new providers

## [0.2.0] - 2025-11-23

### Added

- **Complete test suite** with 95%+ coverage
  - Unit tests for SmtpProvider (12 tests)
  - Unit tests for MailManager (13 tests)
  - MessageBuilder fluent API tests
- Jest configuration excluding optional dependencies from coverage

### Changed

- Updated package.json to version 0.2.0
- 25 passing tests

## [0.1.0] - 2025-11-23

### Added

- **Core email functionality**
  - `Mail` facade with fluent API (`Mail.to().subject().send()`)
  - `MailManager` with provider factory pattern
  - `MessageBuilder` with chainable methods
- **Email providers** (3 total)
  - `SmtpProvider` via nodemailer
  - `SendGridProvider` via @sendgrid/mail
  - `SesProvider` via @aws-sdk/client-ses
- **Features**
  - Multiple recipients (to, cc, bcc)
  - HTML and text content
  - Email attachments
  - Address formatting with names
  - Reply-to support
  - Custom headers
  - Error handling with graceful degradation
- **Architecture**
  - Lightweight core (~25MB with SMTP only)
  - Optional providers as peerDependencies
  - Provider caching for performance
  - Dynamic provider loading
- Full TypeScript support with strict mode

## [0.0.1] - 2025-11-23

### Added

- Initial project setup
- Package structure
- TypeScript 5.6 configuration
- ESLint 9 with flat config
- MIT License
