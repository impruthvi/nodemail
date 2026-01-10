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
  Attachment,
  QueueJobResult,
} from '../types';
import { SmtpProvider } from '../providers/SmtpProvider';
import { SendGridProvider } from '../providers/SendGridProvider';
import { SesProvider } from '../providers/SesProvider';
import { MailgunProvider } from '../providers/MailgunProvider';
import { ResendProvider } from '../providers/ResendProvider';
import { PostmarkProvider } from '../providers/PostmarkProvider';
import type { TemplateEngine, TemplateEngineOptions } from '../templates/TemplateEngine';
import { HandlebarsEngine } from '../templates/HandlebarsEngine';
import { EjsEngine } from '../templates/EjsEngine';
import { PugEngine } from '../templates/PugEngine';
import { QueueManager } from '../queue/QueueManager';

export class MailManager {
  private config: MailConfig;
  private providers: Map<string, MailProvider> = new Map();
  private templateEngine?: TemplateEngine;
  private queueManager?: QueueManager;

  constructor(config: MailConfig) {
    this.config = config;
    this.initializeTemplateEngine();
    this.initializeQueueManager();
  }

  /**
   * Initialize template engine if configured
   */
  /* eslint-disable @typescript-eslint/restrict-template-expressions */
  private initializeTemplateEngine(): void {
    if (!this.config.templates) {
      return;
    }

    const { engine, viewsPath, extension, cache, options } = this.config.templates;

    if (!engine) {
      return;
    }

    const engineOptions: TemplateEngineOptions = {
      ...(viewsPath && { viewsPath }),
      ...(extension && { extension }),
      ...(cache !== undefined && { cache }),
      ...(options && { options }),
    };

    if (typeof engine === 'string') {
      switch (engine) {
        case 'handlebars':
          this.templateEngine = new HandlebarsEngine(engineOptions);
          break;
        case 'ejs':
          this.templateEngine = new EjsEngine(engineOptions);
          break;
        case 'pug':
          this.templateEngine = new PugEngine(engineOptions);
          break;
        default:
          throw new Error(`Unsupported template engine: ${engine}`);
      }
    } else {
      // Custom template engine instance provided
      this.templateEngine = engine;
    }
  }
  /* eslint-enable @typescript-eslint/restrict-template-expressions */

  /**
   * Initialize queue manager if configured
   */
  private initializeQueueManager(): void {
    if (!this.config.queue) {
      return;
    }
    this.queueManager = new QueueManager(this.config.queue);
  }

  /**
   * Get the queue manager
   */
  getQueueManager(): QueueManager | undefined {
    return this.queueManager;
  }

  /**
   * Queue an email for background sending
   */
  async queue(options: MailOptions): Promise<QueueJobResult> {
    if (!this.queueManager) {
      throw new Error('Queue not configured. Add queue configuration to Mail.configure()');
    }
    return this.queueManager.queue(options);
  }

  /**
   * Queue an email with a delay (in seconds)
   */
  async later(options: MailOptions, delaySeconds: number): Promise<QueueJobResult> {
    if (!this.queueManager) {
      throw new Error('Queue not configured. Add queue configuration to Mail.configure()');
    }
    return this.queueManager.later(options, delaySeconds);
  }

  /**
   * Schedule an email for a specific time
   */
  async at(options: MailOptions, date: Date): Promise<QueueJobResult> {
    if (!this.queueManager) {
      throw new Error('Queue not configured. Add queue configuration to Mail.configure()');
    }
    return this.queueManager.at(options, date);
  }

  /**
   * Start processing queued emails
   */
  async processQueue(queueName?: string): Promise<void> {
    if (!this.queueManager) {
      throw new Error('Queue not configured. Add queue configuration to Mail.configure()');
    }
    await this.queueManager.process(async (job) => {
      return this.send(job.mailOptions);
    }, queueName);
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
      case 'mailgun':
        return new MailgunProvider(mailerConfig as import('../types').MailgunConfig);
      case 'resend':
        return new ResendProvider(mailerConfig as import('../types').ResendConfig);
      case 'postmark':
        return new PostmarkProvider(mailerConfig as import('../types').PostmarkConfig);
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
    // Render template if specified
    if (options.template && this.templateEngine) {
      const html = await this.templateEngine.renderFile(
        options.template,
        options.data
      );
      options = { ...options, html };
    }

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

  cc(cc: string | string[]) {
    this.options.cc = cc;
    return this;
  }

  bcc(bcc: string | string[]) {
    this.options.bcc = bcc;
    return this;
  }

  replyTo(replyTo: string) {
    this.options.replyTo = replyTo;
    return this;
  }

  attachments(attachments: Attachment[]) {
    this.options.attachments = attachments;
    return this;
  }

  headers(headers: Record<string, string>) {
    this.options.headers = headers;
    return this;
  }

  template(template: string) {
    this.options.template = template;
    return this;
  }

  data(data: Record<string, unknown>) {
    this.options.data = data;
    return this;
  }

  async send(mailable?: import('./Mailable').Mailable): Promise<MailResponse> {
    // If a Mailable instance is provided, use it
    if (mailable) {
      mailable.setMailManager(this.manager);
      const mailOptions = mailable.getMailOptions();

      // Merge the recipient from builder with mailable options
      return this.manager.send({
        ...mailOptions,
        to: this.options.to!,
      } as MailOptions);
    }

    // Otherwise, use the built options
    if (!this.options.subject) {
      throw new Error('Email subject is required');
    }

    return this.manager.send(this.options as MailOptions);
  }

  /**
   * Queue the email for background sending
   */
  async queue(mailable?: import('./Mailable').Mailable): Promise<QueueJobResult> {
    const mailOptions = this.getMailOptions(mailable);
    return this.manager.queue(mailOptions);
  }

  /**
   * Queue the email with a delay (in seconds)
   */
  async later(delaySeconds: number, mailable?: import('./Mailable').Mailable): Promise<QueueJobResult> {
    const mailOptions = this.getMailOptions(mailable);
    return this.manager.later(mailOptions, delaySeconds);
  }

  /**
   * Schedule the email for a specific time
   */
  async at(date: Date, mailable?: import('./Mailable').Mailable): Promise<QueueJobResult> {
    const mailOptions = this.getMailOptions(mailable);
    return this.manager.at(mailOptions, date);
  }

  /**
   * Get mail options from builder or mailable
   */
  private getMailOptions(mailable?: import('./Mailable').Mailable): MailOptions {
    if (mailable) {
      mailable.setMailManager(this.manager);
      const mailOptions = mailable.getMailOptions();
      return {
        ...mailOptions,
        to: this.options.to!,
      } as MailOptions;
    }

    if (!this.options.subject) {
      throw new Error('Email subject is required');
    }

    return this.options as MailOptions;
  }
}
