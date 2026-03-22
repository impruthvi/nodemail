/**
 * queue:clear command tests
 */

jest.mock('../../src/cli/utils/output', () => ({
  output: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockClearJobs = jest.fn();
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

import { queueClear } from '../../src/cli/commands/queue-clear';
 
const { output: mockOutput } = require('../../src/cli/utils/output');
 
const { loadConfig: mockLoadConfig } = require('../../src/cli/utils/config-loader');

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

const queueConfig = {
  config: { default: 'smtp', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } }, queue: { driver: 'sync' } },
};

beforeEach(() => jest.clearAllMocks());

describe('queue:clear', () => {
  it('clears failed jobs', async () => {
    mockLoadConfig.mockResolvedValue(queueConfig);
    mockGetQueueManager.mockReturnValue({ clearJobs: mockClearJobs, close: mockClose });
    mockClearJobs.mockResolvedValue(7);
    await queueClear({ queue: 'mail', status: 'failed' });
    expect(mockClearJobs).toHaveBeenCalledWith('failed', 'mail');
    expect(mockOutput.success).toHaveBeenCalledWith('Cleared 7 failed jobs');
    expect(mockClose).toHaveBeenCalled();
  });

  it('clears completed jobs', async () => {
    mockLoadConfig.mockResolvedValue(queueConfig);
    mockGetQueueManager.mockReturnValue({ clearJobs: mockClearJobs, close: mockClose });
    mockClearJobs.mockResolvedValue(3);
    await queueClear({ queue: 'mail', status: 'completed' });
    expect(mockClearJobs).toHaveBeenCalledWith('completed', 'mail');
  });

  it('clears delayed jobs', async () => {
    mockLoadConfig.mockResolvedValue(queueConfig);
    mockGetQueueManager.mockReturnValue({ clearJobs: mockClearJobs, close: mockClose });
    mockClearJobs.mockResolvedValue(1);
    await queueClear({ queue: 'mail', status: 'delayed' });
    expect(mockClearJobs).toHaveBeenCalledWith('delayed', 'mail');
  });

  it('clears waiting jobs', async () => {
    mockLoadConfig.mockResolvedValue(queueConfig);
    mockGetQueueManager.mockReturnValue({ clearJobs: mockClearJobs, close: mockClose });
    mockClearJobs.mockResolvedValue(2);
    await queueClear({ queue: 'mail', status: 'waiting' });
    expect(mockClearJobs).toHaveBeenCalledWith('waiting', 'mail');
  });

  it('rejects invalid status', async () => {
    await queueClear({ queue: 'mail', status: 'invalid' });
    expect(mockOutput.error).toHaveBeenCalledWith('Invalid status: invalid');
    expect(mockOutput.info).toHaveBeenCalledWith('Valid statuses: failed, completed, delayed, waiting');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('errors when queue not configured', async () => {
    mockLoadConfig.mockResolvedValue({
      config: { default: 'smtp', mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } } },
    });
    await queueClear({ queue: 'mail', status: 'failed' });
    expect(mockOutput.error).toHaveBeenCalledWith('Queue is not configured. Add a "queue" section to your config.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('errors when queue manager is null', async () => {
    mockLoadConfig.mockResolvedValue(queueConfig);
    mockGetQueueManager.mockReturnValue(null);
    await queueClear({ queue: 'mail', status: 'failed' });
    expect(mockOutput.error).toHaveBeenCalledWith('Queue manager could not be initialized.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('handles config load error', async () => {
    mockLoadConfig.mockRejectedValue(new Error('config error'));
    await queueClear({ queue: 'mail', status: 'failed' });
    expect(mockOutput.error).toHaveBeenCalledWith('config error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
