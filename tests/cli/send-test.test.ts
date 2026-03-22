/**
 * send:test command tests
 */

jest.mock('../../src/cli/utils/output', () => ({
  output: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    keyValue: jest.fn(),
    newline: jest.fn(),
  },
  Spinner: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
  })),
}));

const mockSend = jest.fn();
jest.mock('../../src/cli/utils/config-loader', () => ({
  loadConfig: jest.fn(),
}));
jest.mock('../../src/core/MailManager', () => ({
  MailManager: jest.fn().mockImplementation(() => ({ send: mockSend })),
}));

import { sendTest } from '../../src/cli/commands/send-test';
 
const { output: mockOutput } = require('../../src/cli/utils/output');
 
const { loadConfig: mockLoadConfig } = require('../../src/cli/utils/config-loader');

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

beforeEach(() => jest.clearAllMocks());

const baseConfig = {
  config: {
    default: 'smtp',
    from: 'noreply@example.com',
    mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } },
  },
  configPath: '/path/config.ts',
};

describe('send:test', () => {
  it('sends a test email successfully', async () => {
    mockLoadConfig.mockResolvedValue(baseConfig);
    mockSend.mockResolvedValue({ success: true, messageId: 'msg-123' });
    await sendTest({ to: 'user@example.com', subject: 'Test Email' });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'user@example.com', subject: 'Test Email' }));
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('reports send failure', async () => {
    mockLoadConfig.mockResolvedValue(baseConfig);
    mockSend.mockResolvedValue({ success: false, error: 'SMTP timeout' });
    await sendTest({ to: 'user@example.com', subject: 'Test' });
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('handles config load error', async () => {
    mockLoadConfig.mockRejectedValue(new Error('Config not found'));
    await sendTest({ to: 'user@example.com', subject: 'Test' });
    expect(mockOutput.error).toHaveBeenCalledWith('Config not found');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('uses custom from address', async () => {
    mockLoadConfig.mockResolvedValue(baseConfig);
    mockSend.mockResolvedValue({ success: true, messageId: 'id' });
    await sendTest({ to: 'u@e.com', subject: 'T', from: 'custom@e.com' });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ from: 'custom@e.com' }));
  });

  it('formats from address with name', async () => {
    mockLoadConfig.mockResolvedValue({
      config: { default: 'smtp', from: { name: 'App', address: 'app@e.com' }, mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } } },
      configPath: '/p',
    });
    mockSend.mockResolvedValue({ success: true, messageId: 'id' });
    await sendTest({ to: 'u@e.com', subject: 'T' });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ from: 'App <app@e.com>' }));
  });

  it('handles send exception', async () => {
    mockLoadConfig.mockResolvedValue(baseConfig);
    mockSend.mockRejectedValue(new Error('Connection refused'));
    await sendTest({ to: 'u@e.com', subject: 'T' });
    expect(mockOutput.error).toHaveBeenCalledWith('Connection refused');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
