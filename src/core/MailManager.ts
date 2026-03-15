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
  QueueJobResult,
  PreviewResult,
  SendingEvent,
  SentEvent,
  SendFailedEvent,
  SendingListener,
  SentListener,
  SendFailedListener,
} from '../types';
import { MessageBuilder } from './MessageBuilder';
import { FailoverManager } from './FailoverManager';
import { RateLimiter } from './RateLimiter';
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
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import type { MarkdownRendererOptions } from '../markdown/MarkdownRenderer';

export class MailManager {
  private config: MailConfig;
  private providers: Map<string, MailProvider> = new Map();
  private templateEngine?: TemplateEngine;
  private queueManager?: QueueManager;
  private failoverManager = new FailoverManager();
  private rateLimiter = new RateLimiter();
  private listeners = {
    sending: [] as SendingListener[],
    sent: [] as SentListener[],
    failed: [] as SendFailedListener[],
  };

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
   * Preprocess mail options: render markdown, convert priority to headers, render templates
   */
  private async preprocess(options: MailOptions): Promise<MailOptions> {
    // Render markdown if present
    if (options.data?.['__markdown']) {
      const markdownContent = options.data['__markdown'] as string;
      const mailableOverrides = (options.data['__markdownRendererOptions'] || {}) as Record<string, unknown>;

      // Build renderer options from global config + mailable overrides
      const rendererOptions: MarkdownRendererOptions = {};

      // Apply global markdown config
      if (this.config.markdown?.theme) {
        const themeCfg = this.config.markdown.theme;
        rendererOptions.theme = {
          css: themeCfg.css || '',
          ...(themeCfg.headerHtml !== undefined ? { headerHtml: themeCfg.headerHtml } : {}),
          ...(themeCfg.footerHtml !== undefined ? { footerHtml: themeCfg.footerHtml } : {}),
        };
      }
      if (this.config.markdown?.customCss) {
        rendererOptions.customCss = this.config.markdown.customCss;
      }

      // Apply mailable-level overrides
      if (mailableOverrides['theme'] !== undefined) {
        rendererOptions.theme = mailableOverrides['theme'] as NonNullable<MarkdownRendererOptions['theme']>;
      }
      if (mailableOverrides['customCss']) {
        rendererOptions.customCss = mailableOverrides['customCss'] as string;
      }

      const renderer = new MarkdownRenderer(rendererOptions);

      // Collect user data (exclude internal keys)
      const userData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(options.data)) {
        if (key !== '__markdown' && key !== '__markdownRendererOptions') {
          userData[key] = value;
        }
      }

      const { html, text } = await renderer.render(
        markdownContent,
        Object.keys(userData).length > 0 ? userData : undefined
      );

      // Set html and text if not already provided
      options = {
        ...options,
        html: options.html || html,
        text: options.text || text,
      };

      // Clean internal keys from data
      const cleanData = { ...options.data };
      delete cleanData['__markdown'];
      delete cleanData['__markdownRendererOptions'];
      const hasRemainingData = Object.keys(cleanData).length > 0;
      options = {
        ...options,
        ...(hasRemainingData ? { data: cleanData } : {}),
      };
      if (!hasRemainingData) {
        delete (options as unknown as Record<string, unknown>)['data'];
      }
    }

    // Convert priority to headers
    if (options.priority) {
      const map = {
        high:   { 'X-Priority': '1', 'X-MSMail-Priority': 'High',   'Importance': 'high' },
        normal: { 'X-Priority': '3', 'X-MSMail-Priority': 'Normal', 'Importance': 'normal' },
        low:    { 'X-Priority': '5', 'X-MSMail-Priority': 'Low',    'Importance': 'low' },
      };
      const existing = options.headers || {};
      options = { ...options, headers: { ...map[options.priority], ...existing } };
    }

    // Render template if specified
    if (options.template && this.templateEngine) {
      const html = await this.templateEngine.renderFile(
        options.template,
        options.data
      );
      options = { ...options, html };
    }

    return options;
  }

  /**
   * Preview an email without sending it
   * Returns the fully preprocessed email (markdown rendered, priority headers, templates)
   * No events fired, no provider called
   */
  async preview(options: MailOptions): Promise<PreviewResult> {
    const processed = await this.preprocess(options);

    // Merge default from if not set
    const from = processed.from || this.config.from;

    return {
      html: processed.html,
      text: processed.text,
      subject: processed.subject,
      from,
      to: processed.to,
      cc: processed.cc,
      bcc: processed.bcc,
      headers: processed.headers,
      attachments: processed.attachments,
    };
  }

  /**
   * Send an email using the default mailer
   */
  async send(options: MailOptions): Promise<MailResponse> {
    options = await this.preprocess(options);

    const mailerName = this.config.default;

    // Rate limit check (before events — rate-limited sends don't fire events)
    const mailerConfig = this.config.mailers[mailerName];
    const rateLimitConfig = mailerConfig?.rateLimit ?? this.config.rateLimit;

    if (rateLimitConfig) {
      const check = this.rateLimiter.check(mailerName, rateLimitConfig);
      if (!check.allowed) {
        if (rateLimitConfig.onRateLimited) {
          try {
            rateLimitConfig.onRateLimited({
              mailer: mailerName,
              retryAfterMs: check.retryAfterMs,
              options,
              timestamp: new Date().toISOString(),
            });
          } catch {
            /* callback errors never break sending */
          }
        }
        return {
          success: false,
          error: `Rate limit exceeded for mailer "${mailerName}". Try again in ${check.retryAfterMs}ms.`,
        };
      }
    }

    // Fire sending event (supports cancellation and mutation)
    const sendingEvent: SendingEvent = {
      options,
      mailer: mailerName,
      timestamp: new Date().toISOString(),
    };

    const shouldSend = await this.fireSending(sendingEvent);
    if (!shouldSend) {
      return { success: false, error: 'Send cancelled by sending listener' };
    }

    // Use potentially mutated options
    options = sendingEvent.options;

    const provider = this.getProvider(mailerName);
    const failoverConfig = mailerConfig?.failover ?? this.config.failover;

    let response: MailResponse;

    try {
      if (!failoverConfig || failoverConfig.chain.length === 0) {
        response = await provider.send(options);
      } else {
        response = await this.failoverManager.sendWithFailover(
          options,
          mailerName,
          provider,
          failoverConfig,
          (name: string) => this.getProvider(name),
        );
      }
    } catch (error) {
      await this.fireFailed({
        options,
        error: error instanceof Error ? error : String(error),
        mailer: mailerName,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }

    if (response.success) {
      await this.fireSent({
        options,
        response,
        mailer: mailerName,
        timestamp: new Date().toISOString(),
      });
    } else {
      await this.fireFailed({
        options,
        error: response.error || 'Send failed',
        mailer: mailerName,
        timestamp: new Date().toISOString(),
      });
    }

    return response;
  }

  /**
   * Get the default mailer name
   */
  getDefaultMailer(): string {
    return this.config.default;
  }

  /**
   * Get the rate limiter instance (for testing)
   */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  // ==================== Event Methods ====================

  onSending(listener: SendingListener): void {
    this.listeners.sending.push(listener);
  }

  onSent(listener: SentListener): void {
    this.listeners.sent.push(listener);
  }

  onFailed(listener: SendFailedListener): void {
    this.listeners.failed.push(listener);
  }

  clearListeners(): void {
    this.listeners.sending = [];
    this.listeners.sent = [];
    this.listeners.failed = [];
  }

  private async fireSending(event: SendingEvent): Promise<boolean> {
    for (const listener of this.listeners.sending) {
      try {
        const result = await listener(event);
        if (result === false) return false;
      } catch {
        // Listener errors must never break email delivery
      }
    }
    return true;
  }

  private async fireSent(event: SentEvent): Promise<void> {
    for (const listener of this.listeners.sent) {
      try {
        await listener(event);
      } catch {
        // Listener errors must never break email delivery
      }
    }
  }

  private async fireFailed(event: SendFailedEvent): Promise<void> {
    for (const listener of this.listeners.failed) {
      try {
        await listener(event);
      } catch {
        // Listener errors must never break email delivery
      }
    }
  }
}

