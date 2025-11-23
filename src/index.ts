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

// Types
export * from './types';

// Version
export const VERSION = '0.1.0';
