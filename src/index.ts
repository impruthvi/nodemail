/**
 * Main entry point for nodemail package
 * Exports all public APIs
 */

export { Mail } from './core/MailFacade';
export { MailManager } from './core/MailManager';
export { Mailable } from './core/Mailable';
export { Message } from './core/Message';

// Providers
export { SmtpProvider } from './providers/SmtpProvider';
export { SendGridProvider } from './providers/SendGridProvider';
export { SesProvider } from './providers/SesProvider';
export { MailgunProvider } from './providers/MailgunProvider';
export { ResendProvider } from './providers/ResendProvider';
export { PostmarkProvider } from './providers/PostmarkProvider';

// Template Engines
export type { TemplateEngine, TemplateEngineOptions } from './templates';
export { HandlebarsEngine, EjsEngine, PugEngine } from './templates';

// Testing Utilities
export { MailFake, AssertableMessage } from './testing';
export type { SentMessage } from './testing';

// Types
export * from './types';

// Version
export const VERSION = '0.5.0';
