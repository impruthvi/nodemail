/**
 * preview command tests
 */

import * as fs from 'fs';
import * as path from 'path';

jest.mock('../../src/cli/utils/output', () => ({
  output: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
  Spinner: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
  })),
}));

jest.mock('../../src/cli/utils/config-loader', () => ({
  loadConfig: jest.fn(),
}));

jest.mock('../../src/core/MailManager', () => ({
  MailManager: jest.fn().mockImplementation(() => ({
    preview: jest.fn().mockResolvedValue({ html: '<p>test</p>' }),
  })),
}));

import { preview } from '../../src/cli/commands/preview';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { output: mockOutput } = require('../../src/cli/utils/output');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Spinner: MockSpinner } = require('../../src/cli/utils/output');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadConfig: mockLoadConfig } = require('../../src/cli/utils/config-loader');

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

const baseConfig = {
  config: {
    default: 'smtp',
    from: 'noreply@e.com',
    mailers: { smtp: { driver: 'smtp', host: 'h', port: 1 } },
  },
  configPath: '/p',
};

beforeEach(() => jest.clearAllMocks());

describe('preview', () => {
  it('fails when mailable file does not exist', async () => {
    mockLoadConfig.mockResolvedValue(baseConfig);
    await preview('/nonexistent/Mail.ts', {});
    // Get the spinner instance that was created
    const spinnerInstance = MockSpinner.mock.results[0]?.value;
    expect(spinnerInstance.fail).toHaveBeenCalledWith(expect.stringContaining('Mailable file not found'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('fails with invalid JSON data', async () => {
    const tmpDir = path.join(__dirname, '__tmp_preview__');
    fs.mkdirSync(tmpDir, { recursive: true });
    const mailablePath = path.join(tmpDir, 'TestMail.ts');
    fs.writeFileSync(mailablePath, 'export class TestMail { build() { return this; } }');

    mockLoadConfig.mockResolvedValue(baseConfig);
    await preview(mailablePath, { data: '{invalid}' });

    const spinnerInstance = MockSpinner.mock.results[0]?.value;
    expect(spinnerInstance.fail).toHaveBeenCalledWith('Invalid JSON data provided');
    expect(mockExit).toHaveBeenCalledWith(1);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('handles config load error', async () => {
    mockLoadConfig.mockRejectedValue(new Error('config error'));
    await preview('/some/path.ts', {});
    expect(mockOutput.error).toHaveBeenCalledWith('config error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
