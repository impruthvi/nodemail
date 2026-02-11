/**
 * Type definitions for nodemail
 */

import type { TemplateEngine } from '../templates/TemplateEngine';

export interface MarkdownConfig {
  theme?: {
    css?: string;
    headerHtml?: string;
    footerHtml?: string;
  };
  customCss?: string;
}

export interface MailConfig {
  default: string;
  from: {
    address: string;
    name: string;
  };
  mailers: Record<string, MailerConfig>;
  templates?: TemplateConfig;
  queue?: QueueConfig;
  markdown?: MarkdownConfig;
}

export interface TemplateConfig {
  engine?: 'handlebars' | 'ejs' | 'pug' | TemplateEngine;
  viewsPath?: string;
  extension?: string;
  cache?: boolean;
  options?: Record<string, unknown>;
}

export interface MailerConfig {
  driver: 'smtp' | 'sendgrid' | 'ses' | 'mailgun' | 'resend' | 'postmark' | 'mailtrap';
  [key: string]: unknown;
}

export interface SmtpConfig extends MailerConfig {
  driver: 'smtp';
  host: string;
  port: number;
  username?: string;
  password?: string;
  encryption?: 'tls' | 'ssl';
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  options?: Record<string, unknown>;
}

export interface SendGridConfig extends MailerConfig {
  driver: 'sendgrid';
  apiKey: string;
}

export interface SesConfig extends MailerConfig {
  driver: 'ses';
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface MailgunConfig extends MailerConfig {
  driver: 'mailgun';
  domain: string;
  apiKey: string;
  region?: 'us' | 'eu';
}

export interface ResendConfig extends MailerConfig {
  driver: 'resend';
  apiKey: string;
}

export interface PostmarkConfig extends MailerConfig {
  driver: 'postmark';
  serverToken: string;
}

export interface MailtrapConfig extends MailerConfig {
  driver: 'mailtrap';
  token: string;
  inboxId: string;
}

export interface MailAddress {
  address: string;
  name?: string;
}

export interface Attachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  cid?: string;
}

export interface MailOptions {
  to: string | string[] | MailAddress | MailAddress[];
  from?: string | MailAddress;
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[] | MailAddress | MailAddress[];
  bcc?: string | string[] | MailAddress | MailAddress[];
  replyTo?: string | MailAddress;
  attachments?: Attachment[];
  headers?: Record<string, string>;
  template?: string;
  data?: Record<string, unknown>;
}

export interface MailProvider {
  send(options: MailOptions): Promise<MailResponse>;
}

export interface MailResponse {
  success: boolean;
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  response?: string;
  error?: string;
}

// ==================== Queue Types ====================

export interface QueueConfig {
  driver: 'bull' | 'bullmq' | 'sync';
  connection?: RedisConnectionConfig;
  defaultQueue?: string;
  prefix?: string;
  retries?: number;
  backoff?: BackoffConfig;
}

export interface RedisConnectionConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  url?: string;
}

export interface BackoffConfig {
  type: 'fixed' | 'exponential';
  delay: number;
}

export interface QueuedMailJob {
  id: string;
  mailOptions: MailOptions;
  mailableClass?: string;
  mailableData?: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  scheduledAt?: Date;
  createdAt: Date;
}

export interface QueueJobResult {
  success: boolean;
  jobId: string;
  queue: string;
  scheduledAt?: Date;
  error?: string;
}

export interface QueueDriver {
  /**
   * Add a job to the queue
   */
  add(job: QueuedMailJob, queueName?: string): Promise<QueueJobResult>;

  /**
   * Add a delayed job to the queue
   */
  addDelayed(job: QueuedMailJob, delay: number, queueName?: string): Promise<QueueJobResult>;

  /**
   * Add a job scheduled for a specific time
   */
  addScheduled(job: QueuedMailJob, date: Date, queueName?: string): Promise<QueueJobResult>;

  /**
   * Process jobs from the queue
   */
  process(queueName: string, handler: (job: QueuedMailJob) => Promise<MailResponse>): void;

  /**
   * Close the queue connection
   */
  close(): Promise<void>;
}
