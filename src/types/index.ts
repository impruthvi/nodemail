/**
 * Type definitions for nodemail
 */

export interface MailConfig {
  default: string;
  from: {
    address: string;
    name: string;
  };
  mailers: Record<string, MailerConfig>;
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
  messageId: string;
  accepted?: string[];
  rejected?: string[];
  response?: string;
}
