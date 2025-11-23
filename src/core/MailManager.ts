/**
 * Mail Manager - Factory for creating mail provider instances
 * Manages multiple mail configurations (SMTP, SendGrid, etc.)
 */

import type {
  MailConfig,
  MailOptions,
  MailProvider,
  MailResponse,
  MailerConfig,
} from '../types';
import { SmtpProvider } from '../providers/SmtpProvider';
import { SendGridProvider } from '../providers/SendGridProvider';
import { SesProvider } from '../providers/SesProvider';

export class MailManager {
  private config: MailConfig;
  private providers: Map<string, MailProvider> = new Map();

  constructor(config: MailConfig) {
    this.config = config;
  }

  /**
   * Create a provider instance based on configuration
   */
  private createProvider(mailerConfig: MailerConfig): MailProvider {
    switch (mailerConfig.driver) {
      case 'smtp':
        return new SmtpProvider(mailerConfig as import('../types').SmtpConfig);
      case 'sendgrid':
        return new SendGridProvider(mailerConfig as import('../types').SendGridConfig);
      case 'ses':
        return new SesProvider(mailerConfig as import('../types').SesConfig);
      default:
        throw new Error(`Unsupported mail driver: ${mailerConfig.driver}`);
    }
  }

  /**
   * Get or create a provider instance
   */
  private getProvider(name?: string): MailProvider {
    const mailerName = name ?? this.config.default;

    if (!this.config.mailers[mailerName]) {
      throw new Error(`Mailer '${mailerName}' is not configured`);
    }

    // Check cache first
    let provider = this.providers.get(mailerName);
    if (!provider) {
      // Create and cache new provider
      const mailerConfig = this.config.mailers[mailerName];
      if (!mailerConfig) {
        throw new Error(`Mailer '${mailerName}' configuration not found`);
      }
      provider = this.createProvider(mailerConfig);
      this.providers.set(mailerName, provider);
    }

    return provider;
  }

  /**
   * Start building an email to the given address
   */
  to(address: string | string[]) {
    return new MessageBuilder(this, address);
  }

  /**
   * Get a specific mailer instance by name
   */
  mailer(name: string) {
    if (!this.config.mailers[name]) {
      throw new Error(`Mailer '${name}' is not configured`);
    }

    // Return a new manager instance that uses this specific mailer as default
    const newConfig = { ...this.config, default: name };
    return new MailManager(newConfig);
  }

  /**
   * Send an email using the default mailer
   */
  async send(options: MailOptions): Promise<MailResponse> {
    const provider = this.getProvider();
    return provider.send(options);
  }

  /**
   * Get the default mailer name
   */
  getDefaultMailer(): string {
    return this.config.default;
  }
}

/**
 * Message Builder - Fluent interface for building emails
 */
export class MessageBuilder {
  public options: Partial<MailOptions> = {};

  constructor(
    private manager: MailManager,
    to: string | string[]
  ) {
    this.options.to = to;
  }

  subject(subject: string) {
    this.options.subject = subject;
    return this;
  }

  html(html: string) {
    this.options.html = html;
    return this;
  }

  text(text: string) {
    this.options.text = text;
    return this;
  }

  from(from: string) {
    this.options.from = from;
    return this;
  }

  async send(): Promise<MailResponse> {
    if (!this.options.subject) {
      throw new Error('Email subject is required');
    }

    return this.manager.send(this.options as MailOptions);
  }
}
