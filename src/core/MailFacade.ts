/**
 * Mail Facade - Laravel-style static access to mail functionality
 * Provides simple API: Mail.to().send()
 */

import { MailManager } from './MailManager';
import type { MailConfig } from '../types';

class MailFacade {
  private static instance: MailManager | null = null;

  /**
   * Configure the mail system
   */
  static configure(config: MailConfig): void {
    this.instance = new MailManager(config);
  }

  /**
   * Get the mail manager instance
   */
  private static getInstance(): MailManager {
    if (!this.instance) {
      throw new Error('Mail not configured. Call Mail.configure() before using Mail facade.');
    }
    return this.instance;
  }

  /**
   * Start building an email to the given address
   */
  static to(address: string | string[]) {
    return this.getInstance().to(address);
  }

  /**
   * Get a specific mailer instance
   */
  static mailer(name: string) {
    return this.getInstance().mailer(name);
  }

  /**
   * Enable fake mode for testing
   */
  static fake(): void {
    // TODO: Implement in Phase 7
    throw new Error('Mail.fake() not yet implemented');
  }

  /**
   * Assert that a mailable was sent (testing)
   */
  static assertSent(): void {
    // TODO: Implement in Phase 7
    throw new Error('Mail.assertSent() not yet implemented');
  }
}

export { MailFacade as Mail };
