/**
 * config:check command tests
 */

jest.mock('../../src/cli/utils/output', () => ({
  output: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    heading: jest.fn(),
    keyValue: jest.fn(),
    divider: jest.fn(),
    newline: jest.fn(),
    log: jest.fn(),
    colored: jest.fn(),
    box: jest.fn(),
  },
  Spinner: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
  })),
}));

jest.mock('../../src/cli/utils/config-loader', () => ({
  getConfigPath: jest.fn(),
  loadConfig: jest.fn(),
}));

jest.mock('../../src/core/MailManager', () => ({
  MailManager: jest.fn().mockImplementation(() => ({
    mailer: jest.fn().mockReturnValue({
      preview: jest.fn().mockResolvedValue({ html: '<p>test</p>' }),
    }),
  })),
}));

import { configCheck } from '../../src/cli/commands/config-check';
 
const { output: mockOutput } = require('../../src/cli/utils/output');
 
const { getConfigPath: mockGetConfigPath, loadConfig: mockLoadConfig } = require('../../src/cli/utils/config-loader');

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

beforeEach(() => jest.clearAllMocks());

describe('config:check', () => {
  it('reports error when no config file found', async () => {
    mockGetConfigPath.mockReturnValue(null);
    await configCheck({});
    expect(mockOutput.error).toHaveBeenCalledWith('No configuration file found');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('reports error when config fails to load', async () => {
    mockGetConfigPath.mockReturnValue('/path/to/config.ts');
    mockLoadConfig.mockRejectedValue(new Error('parse error'));
    await configCheck({});
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('validates a valid config successfully', async () => {
    mockGetConfigPath.mockReturnValue('/path/to/config.ts');
    mockLoadConfig.mockResolvedValue({
      config: {
        default: 'smtp',
        from: 'test@example.com',
        mailers: { smtp: { driver: 'smtp', host: 'localhost', port: 587 } },
      },
      configPath: '/path/to/config.ts',
    });
    await configCheck({});
    expect(mockOutput.success).toHaveBeenCalledWith('Configuration is valid!');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('reports missing default mailer', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: { default: '', from: 'a@b.com', mailers: { s: { driver: 'smtp', host: 'h', port: 1 } } },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.error).toHaveBeenCalledWith('Missing "default" mailer');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('reports missing from address', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: { default: 'smtp', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } } },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.error).toHaveBeenCalledWith('Missing "from" address');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('reports no mailers configured', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: { default: 'smtp', from: 'a@b.com', mailers: {} },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.error).toHaveBeenCalledWith('No mailers configured');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('reports default mailer not in mailers map', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: { default: 'missing', from: 'a@b.com', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } } },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.error).toHaveBeenCalledWith('Default mailer "missing" is not configured');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('validates driver-specific fields (sendgrid missing apiKey)', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: { default: 'sg', from: 'a@b.com', mailers: { sg: { driver: 'sendgrid' } } },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.error).toHaveBeenCalledWith('    Missing "apiKey" field');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('validates ses missing region', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: { default: 's', from: 'a@b.com', mailers: { s: { driver: 'ses' } } },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.error).toHaveBeenCalledWith('    Missing "region" field');
  });

  it('validates mailgun missing domain and apiKey', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: { default: 'mg', from: 'a@b.com', mailers: { mg: { driver: 'mailgun' } } },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.error).toHaveBeenCalledWith('    Missing "domain" field');
    expect(mockOutput.error).toHaveBeenCalledWith('    Missing "apiKey" field');
  });

  it('validates resend missing apiKey', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: { default: 'r', from: 'a@b.com', mailers: { r: { driver: 'resend' } } },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.error).toHaveBeenCalledWith('    Missing "apiKey" field');
  });

  it('validates postmark missing serverToken', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: { default: 'pm', from: 'a@b.com', mailers: { pm: { driver: 'postmark' } } },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.error).toHaveBeenCalledWith('    Missing "serverToken" field');
  });

  it('validates mailer with missing driver field', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: { default: 'x', from: 'a@b.com', mailers: { x: {} } },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.error).toHaveBeenCalledWith('    Missing "driver" field');
  });

  it('shows queue and template info', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: {
        default: 'smtp', from: 'a@b.com',
        mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } },
        queue: { driver: 'sync' },
        templates: { engine: 'handlebars' },
      },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.success).toHaveBeenCalledWith('Queue configured: sync');
    expect(mockOutput.success).toHaveBeenCalledWith('Templates configured: handlebars');
  });

  it('shows from address with name', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: {
        default: 'smtp', from: { name: 'App', address: 'app@e.com' },
        mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } },
      },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.success).toHaveBeenCalledWith('From address: App <app@e.com>');
  });

  it('passes custom config path', async () => {
    mockGetConfigPath.mockReturnValue('/custom.ts');
    mockLoadConfig.mockResolvedValue({
      config: { default: 'smtp', from: 'a@b.com', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } } },
      configPath: '/custom.ts',
    });
    await configCheck({ config: '/custom.ts' });
    expect(mockGetConfigPath).toHaveBeenCalledWith('/custom.ts');
  });

  it('tests provider connections with --test', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: { default: 'smtp', from: 'a@b.com', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } } },
      configPath: '/p',
    });
    await configCheck({ test: true });
    expect(mockOutput.heading).toHaveBeenCalledWith('Testing Provider Connections');
  });

  it('allows custom drivers without validation errors', async () => {
    mockGetConfigPath.mockReturnValue('/p');
    mockLoadConfig.mockResolvedValue({
      config: { default: 'custom', from: 'a@b.com', mailers: { custom: { driver: 'my-custom' } } },
      configPath: '/p',
    });
    await configCheck({});
    expect(mockOutput.success).toHaveBeenCalledWith('Configuration is valid!');
  });
});
