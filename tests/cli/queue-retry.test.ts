/**
 * queue:retry command tests
 */

jest.mock('../../src/cli/utils/output', () => ({
  output: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockGetJobCounts = jest.fn();
const mockRetryFailed = jest.fn();
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

import { queueRetry } from '../../src/cli/commands/queue-retry';
 
const { output: mockOutput } = require('../../src/cli/utils/output');
 
const { loadConfig: mockLoadConfig } = require('../../src/cli/utils/config-loader');

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

const queueConfig = {
  config: { default: 'smtp', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } }, queue: { driver: 'sync' } },
};

beforeEach(() => jest.clearAllMocks());

describe('queue:retry', () => {
  it('retries failed jobs', async () => {
    mockLoadConfig.mockResolvedValue(queueConfig);
    mockGetQueueManager.mockReturnValue({ getJobCounts: mockGetJobCounts, retryFailedJobs: mockRetryFailed, close: mockClose });
    mockGetJobCounts.mockResolvedValue({ failed: 5 });
    mockRetryFailed.mockResolvedValue(5);

    await queueRetry({ queue: 'mail' });

    expect(mockOutput.success).toHaveBeenCalledWith('Retried 5 failed jobs');
    expect(mockClose).toHaveBeenCalled();
  });

  it('reports no failed jobs', async () => {
    mockLoadConfig.mockResolvedValue(queueConfig);
    mockGetQueueManager.mockReturnValue({ getJobCounts: mockGetJobCounts, close: mockClose });
    mockGetJobCounts.mockResolvedValue({ failed: 0 });

    await queueRetry({ queue: 'mail' });

    expect(mockOutput.info).toHaveBeenCalledWith('No failed jobs to retry.');
    expect(mockClose).toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('errors when queue not configured', async () => {
    mockLoadConfig.mockResolvedValue({
      config: { default: 'smtp', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } } },
    });
    await queueRetry({ queue: 'mail' });
    expect(mockOutput.error).toHaveBeenCalledWith('Queue is not configured. Add a "queue" section to your config.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('errors when queue manager is null', async () => {
    mockLoadConfig.mockResolvedValue(queueConfig);
    mockGetQueueManager.mockReturnValue(null);
    await queueRetry({ queue: 'mail' });
    expect(mockOutput.error).toHaveBeenCalledWith('Queue manager could not be initialized.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('handles config load error', async () => {
    mockLoadConfig.mockRejectedValue(new Error('load failed'));
    await queueRetry({ queue: 'mail' });
    expect(mockOutput.error).toHaveBeenCalledWith('load failed');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
