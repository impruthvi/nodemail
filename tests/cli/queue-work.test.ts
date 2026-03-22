/**
 * queue:work command tests
 */

jest.mock('../../src/cli/utils/output', () => ({
  output: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    heading: jest.fn(),
    keyValue: jest.fn(),
    divider: jest.fn(),
    newline: jest.fn(),
  },
  Spinner: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
  })),
}));

const mockProcess = jest.fn();
const mockClose = jest.fn();
const mockGetQueueManager = jest.fn();
const mockSend = jest.fn();

jest.mock('../../src/cli/utils/config-loader', () => ({
  loadConfig: jest.fn(),
}));
jest.mock('../../src/core/MailManager', () => ({
  MailManager: jest.fn().mockImplementation(() => ({
    getQueueManager: () => mockGetQueueManager(),
    send: mockSend,
  })),
}));

import { queueWork } from '../../src/cli/commands/queue-work';
 
const { output: mockOutput } = require('../../src/cli/utils/output');
 
const { loadConfig: mockLoadConfig } = require('../../src/cli/utils/config-loader');

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

beforeEach(() => jest.clearAllMocks());

describe('queue:work', () => {
  it('errors when queue not configured', async () => {
    mockLoadConfig.mockResolvedValue({
      config: { default: 'smtp', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } } },
      configPath: '/p',
    });
    await queueWork({ queue: 'mail', concurrency: '5' });
    expect(mockOutput.error).toHaveBeenCalledWith('Queue is not configured. Add a "queue" section to your config.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('errors when queue manager is null', async () => {
    mockLoadConfig.mockResolvedValue({
      config: { default: 'smtp', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } }, queue: { driver: 'sync' } },
      configPath: '/p',
    });
    mockGetQueueManager.mockReturnValue(null);
    await queueWork({ queue: 'mail', concurrency: '5' });
    expect(mockOutput.error).toHaveBeenCalledWith('Queue manager could not be initialized.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('handles config load error', async () => {
    mockLoadConfig.mockRejectedValue(new Error('config error'));
    await queueWork({ queue: 'mail', concurrency: '5' });
    expect(mockOutput.error).toHaveBeenCalledWith('config error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('starts worker and displays info', async () => {
    mockLoadConfig.mockResolvedValue({
      config: { default: 'smtp', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } }, queue: { driver: 'sync' } },
      configPath: '/p',
    });
    mockGetQueueManager.mockReturnValue({ process: mockProcess, close: mockClose });

    // Race against timeout since the command awaits forever
    await Promise.race([
      queueWork({ queue: 'mail', concurrency: '5' }),
      new Promise<void>((resolve) => setTimeout(resolve, 50)),
    ]);

    expect(mockOutput.heading).toHaveBeenCalledWith('Queue Worker');
    expect(mockOutput.keyValue).toHaveBeenCalledWith('Queue', 'mail');
    expect(mockOutput.keyValue).toHaveBeenCalledWith('Concurrency', '5');
    expect(mockOutput.keyValue).toHaveBeenCalledWith('Driver', 'sync');
    expect(mockProcess).toHaveBeenCalled();
  });
});
