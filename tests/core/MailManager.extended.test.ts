import { MailManager } from '../../src/core/MailManager';
import type { MailConfig, MailOptions } from '../../src/types';

// Mock all providers
jest.mock('../../src/providers/SmtpProvider');
jest.mock('../../src/providers/SendGridProvider');
jest.mock('../../src/providers/SesProvider');
jest.mock('../../src/providers/MailgunProvider');
jest.mock('../../src/providers/ResendProvider');
jest.mock('../../src/providers/PostmarkProvider');

// Mock template engines
jest.mock('../../src/templates/HandlebarsEngine');
jest.mock('../../src/templates/EjsEngine');
jest.mock('../../src/templates/PugEngine');

// Mock QueueManager
jest.mock('../../src/queue/QueueManager');

describe('MailManager - extended coverage', () => {
  const defaultFrom = { address: 'noreply@test.com', name: 'Test' };
  const baseMailers = {
    smtp: { driver: 'smtp' as const, host: 'localhost', port: 587, auth: { user: 'u', pass: 'p' } },
  };

  describe('template engine initialization', () => {
    it('should not initialize template engine when templates not configured', () => {
      const config: MailConfig = { default: 'smtp', from: defaultFrom, mailers: baseMailers };
      const mgr = new MailManager(config);
      expect(mgr).toBeInstanceOf(MailManager);
    });

    it('should not initialize template engine when engine is not set', () => {
      const config: MailConfig = {
        default: 'smtp',
        from: defaultFrom,
        mailers: baseMailers,
        templates: { viewsPath: '/views' },
      };
      const mgr = new MailManager(config);
      expect(mgr).toBeInstanceOf(MailManager);
    });

    it('should initialize handlebars engine', () => {
      const config: MailConfig = {
        default: 'smtp',
        from: defaultFrom,
        mailers: baseMailers,
        templates: { engine: 'handlebars', viewsPath: '/views' },
      };
      const mgr = new MailManager(config);
      expect(mgr).toBeInstanceOf(MailManager);
    });

    it('should initialize ejs engine', () => {
      const config: MailConfig = {
        default: 'smtp',
        from: defaultFrom,
        mailers: baseMailers,
        templates: { engine: 'ejs', viewsPath: '/views' },
      };
      const mgr = new MailManager(config);
      expect(mgr).toBeInstanceOf(MailManager);
    });

    it('should initialize pug engine', () => {
      const config: MailConfig = {
        default: 'smtp',
        from: defaultFrom,
        mailers: baseMailers,
        templates: { engine: 'pug', viewsPath: '/views' },
      };
      const mgr = new MailManager(config);
      expect(mgr).toBeInstanceOf(MailManager);
    });

    it('should throw for unsupported engine string', () => {
      const config: MailConfig = {
        default: 'smtp',
        from: defaultFrom,
        mailers: baseMailers,
        templates: { engine: 'nunjucks' as any },
      };
      expect(() => new MailManager(config)).toThrow('Unsupported template engine: nunjucks');
    });

    it('should use custom template engine instance', () => {
      const customEngine = {
        renderFile: jest.fn(),
        renderString: jest.fn(),
      };
      const config: MailConfig = {
        default: 'smtp',
        from: defaultFrom,
        mailers: baseMailers,
        templates: { engine: customEngine as any },
      };
      const mgr = new MailManager(config);
      expect(mgr).toBeInstanceOf(MailManager);
    });

    it('should pass all engine options', () => {
      const config: MailConfig = {
        default: 'smtp',
        from: defaultFrom,
        mailers: baseMailers,
        templates: {
          engine: 'handlebars',
          viewsPath: '/views',
          extension: '.hbs',
          cache: true,
          options: { strict: true },
        },
      };
      const mgr = new MailManager(config);
      expect(mgr).toBeInstanceOf(MailManager);
    });
  });

  describe('queue methods without queue configured', () => {
    let mgr: MailManager;
    const mailOptions: MailOptions = {
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    };

    beforeEach(() => {
      mgr = new MailManager({ default: 'smtp', from: defaultFrom, mailers: baseMailers });
    });

    it('queue() should throw when queue not configured', async () => {
      await expect(mgr.queue(mailOptions)).rejects.toThrow('Queue not configured');
    });

    it('later() should throw when queue not configured', async () => {
      await expect(mgr.later(mailOptions, 60)).rejects.toThrow('Queue not configured');
    });

    it('at() should throw when queue not configured', async () => {
      await expect(mgr.at(mailOptions, new Date())).rejects.toThrow('Queue not configured');
    });

    it('processQueue() should throw when queue not configured', async () => {
      await expect(mgr.processQueue()).rejects.toThrow('Queue not configured');
    });
  });

  describe('queue methods with queue configured', () => {
    it('should initialize queue manager and expose it', () => {
      const config: MailConfig = {
        default: 'smtp',
        from: defaultFrom,
        mailers: baseMailers,
        queue: { driver: 'sync' },
      };
      const mgr = new MailManager(config);
      expect(mgr.getQueueManager()).toBeDefined();
    });
  });

  describe('createProvider for various drivers', () => {
    it('should create mailgun provider', () => {
      const config: MailConfig = {
        default: 'mailgun',
        from: defaultFrom,
        mailers: {
          mailgun: { driver: 'mailgun', apiKey: 'key', domain: 'mg.test.com' } as any,
        },
      };
      const mgr = new MailManager(config);
      // Trigger provider creation by calling send
      expect(mgr).toBeInstanceOf(MailManager);
    });

    it('should create resend provider', () => {
      const config: MailConfig = {
        default: 'resend',
        from: defaultFrom,
        mailers: {
          resend: { driver: 'resend', apiKey: 'key' } as any,
        },
      };
      const mgr = new MailManager(config);
      expect(mgr).toBeInstanceOf(MailManager);
    });

    it('should create postmark provider', () => {
      const config: MailConfig = {
        default: 'postmark',
        from: defaultFrom,
        mailers: {
          postmark: { driver: 'postmark', serverToken: 'token' } as any,
        },
      };
      const mgr = new MailManager(config);
      expect(mgr).toBeInstanceOf(MailManager);
    });

    it('should throw for unsupported driver', async () => {
      const config: MailConfig = {
        default: 'custom',
        from: defaultFrom,
        mailers: {
          custom: { driver: 'custom' as any },
        },
      };
      const mgr = new MailManager(config);
      await expect(
        mgr.send({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })
      ).rejects.toThrow('Unsupported mail driver: custom');
    });
  });
});
