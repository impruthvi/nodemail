/**
 * queue:status command tests
 */

jest.mock('../../src/cli/utils/output', () => ({
  output: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    heading: jest.fn(),
    keyValue: jest.fn(),
    divider: jest.fn(),
  },
}));

const mockGetJobCounts = jest.fn();
const mockClose = jest.fn();
const mockGetQueueManager = jest.fn();

jest.mock('../../src/cli/utils/config-loader', () => ({
  loadConfig: jest.fn(),
}));
jest.mock('../../src/core/MailManager', () => ({
  MailManager: jest.fn().mockImplementation(() => ({
    getQueueManager: () => mockGetQueueManager(),
  })),
}));

import { queueStatus } from '../../src/cli/commands/queue-status';
 
const { output: mockOutput } = require('../../src/cli/utils/output');
 
const { loadConfig: mockLoadConfig } = require('../../src/cli/utils/config-loader');

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

const queueConfig = {
  config: { default: 'smtp', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } }, queue: { driver: 'sync' } },
};

beforeEach(() => jest.clearAllMocks());

describe('queue:status', () => {
  it('displays job counts', async () => {
    mockLoadConfig.mockResolvedValue(queueConfig);
    mockGetQueueManager.mockReturnValue({ getJobCounts: mockGetJobCounts, close: mockClose });
    mockGetJobCounts.mockResolvedValue({ waiting: 5, active: 2, delayed: 1, failed: 3, completed: 10 });

    await queueStatus({ queue: 'mail' });

    expect(mockOutput.heading).toHaveBeenCalledWith('Queue Status: mail');
    expect(mockOutput.keyValue).toHaveBeenCalledWith('Waiting', 5);
    expect(mockOutput.keyValue).toHaveBeenCalledWith('Active', 2);
    expect(mockOutput.keyValue).toHaveBeenCalledWith('Failed', 3);
    expect(mockOutput.keyValue).toHaveBeenCalledWith('Total Pending', 11);
    expect(mockClose).toHaveBeenCalled();
  });

  it('errors when queue not configured', async () => {
    mockLoadConfig.mockResolvedValue({
      config: { default: 'smtp', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } } },
    });
    await queueStatus({ queue: 'mail' });
    expect(mockOutput.error).toHaveBeenCalledWith('Queue is not configured. Add a "queue" section to your config.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('errors when queue manager is null', async () => {
    mockLoadConfig.mockResolvedValue(queueConfig);
    mockGetQueueManager.mockReturnValue(null);
    await queueStatus({ queue: 'mail' });
    expect(mockOutput.error).toHaveBeenCalledWith('Queue manager could not be initialized.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('errors when driver does not support job counts', async () => {
    mockLoadConfig.mockResolvedValue(queueConfig);
    mockGetQueueManager.mockReturnValue({ getJobCounts: jest.fn().mockResolvedValue(null), close: mockClose });
    await queueStatus({ queue: 'mail' });
    expect(mockOutput.error).toHaveBeenCalledWith('Queue driver does not support job counts.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('handles config load error', async () => {
    mockLoadConfig.mockRejectedValue(new Error('bad config'));
    await queueStatus({ queue: 'mail' });
    expect(mockOutput.error).toHaveBeenCalledWith('bad config');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
