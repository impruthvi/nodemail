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
  failover?: FailoverConfig;
  rateLimit?: RateLimitConfig;
}

export interface TemplateConfig {
  engine?: 'handlebars' | 'ejs' | 'pug' | TemplateEngine;
  viewsPath?: string;
  extension?: string;
  cache?: boolean;
  options?: Record<string, unknown>;
}

export interface MailerConfig {
  driver: 'smtp' | 'sendgrid' | 'ses' | 'mailgun' | 'resend' | 'postmark' | (string & {});
  failover?: FailoverConfig;
  rateLimit?: RateLimitConfig;
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
  priority?: 'high' | 'normal' | 'low';
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
  provider?: string;
  failoverUsed?: boolean;
  failoverAttempts?: FailoverDetail[];
}

// ==================== Failover Types ====================

export interface FailoverConfig {
  chain: string[];
  maxRetriesPerProvider?: number; // default: 1
  retryDelay?: number; // default: 0
  failoverDelay?: number; // default: 0
  onFailover?: (event: FailoverEvent) => void;
}

export interface FailoverEvent {
  failedMailer: string;
  error: string;
  nextMailer: string;
  attemptIndex: number;
  timestamp: string;
}

export interface FailoverDetail {
  mailer: string;
  success: boolean;
  error?: string;
  durationMs: number;
}

// ==================== Mail Event Types ====================

export interface SendingEvent {
  options: MailOptions;
  mailer: string;
  timestamp: string;
}

export interface SentEvent {
  options: MailOptions;
  response: MailResponse;
  mailer: string;
  timestamp: string;
}

export interface SendFailedEvent {
  options: MailOptions;
  error: Error | string;
  mailer: string;
  timestamp: string;
}

export type SendingListener = (event: SendingEvent) => boolean | void | Promise<boolean | void>;
export type SentListener = (event: SentEvent) => void | Promise<void>;
export type SendFailedListener = (event: SendFailedEvent) => void | Promise<void>;

// ==================== Preview Types ====================

export interface PreviewResult {
  html?: string | undefined;
  text?: string | undefined;
  subject?: string | undefined;
  from?: string | MailAddress | MailAddress[] | undefined;
  to: string | string[] | MailAddress | MailAddress[];
  cc?: string | string[] | MailAddress | MailAddress[] | undefined;
  bcc?: string | string[] | MailAddress | MailAddress[] | undefined;
  headers?: Record<string, string> | undefined;
  attachments?: Attachment[] | undefined;
}

// ==================== Rate Limit Types ====================

export interface RateLimitConfig {
  maxPerWindow: number;
  windowMs: number;
  onRateLimited?: (event: RateLimitEvent) => void;
}

export interface RateLimitEvent {
  mailer: string;
  retryAfterMs: number;
  options: MailOptions;
  timestamp: string;
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

export interface QueueJobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface FailedJob {
  id: string;
  mailOptions: MailOptions;
  failedReason: string;
  attemptsMade: number;
  failedAt: Date;
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

  /**
   * Get job counts by status (optional - for CLI)
   */
  getJobCounts?(queueName?: string): Promise<QueueJobCounts>;

  /**
   * Clear jobs by status (optional - for CLI)
   */
  clear?(
    status: 'failed' | 'completed' | 'delayed' | 'waiting',
    queueName?: string
  ): Promise<number>;

  /**
   * Retry all failed jobs (optional - for CLI)
   */
  retryFailed?(queueName?: string): Promise<number>;

  /**
   * Get failed jobs (optional - for CLI)
   */
  getFailedJobs?(queueName?: string, limit?: number): Promise<FailedJob[]>;
}
