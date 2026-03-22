/**
 * make:mailable command tests
 */

import * as fs from 'fs';
import * as path from 'path';

jest.mock('../../src/cli/utils/output', () => ({
  output: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    newline: jest.fn(),
    log: jest.fn(),
  },
}));

import { makeMailable } from '../../src/cli/commands/make-mailable';
 
const { output: mockOutput } = require('../../src/cli/utils/output');

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
const tmpDir = path.join(__dirname, '__tmp_make_mailable__');

beforeEach(() => {
  jest.clearAllMocks();
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
});

afterAll(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
});

describe('make:mailable', () => {
  it('rejects non-PascalCase names', async () => {
    await makeMailable('welcome_mail', { path: tmpDir });
    expect(mockOutput.error).toHaveBeenCalledWith(expect.stringContaining('PascalCase'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('rejects names starting with lowercase', async () => {
    await makeMailable('welcomeMail', { path: tmpDir });
    expect(mockOutput.error).toHaveBeenCalledWith(expect.stringContaining('PascalCase'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('creates a standard Mailable file', async () => {
    await makeMailable('WelcomeMail', { path: tmpDir });
    const filepath = path.join(tmpDir, 'WelcomeMail.ts');
    expect(fs.existsSync(filepath)).toBe(true);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('class WelcomeMail extends Mailable');
    expect(content).toContain("import { Mailable } from 'laramail'");
    expect(content).toContain('interface WelcomeMailData');
    expect(mockOutput.success).toHaveBeenCalledWith(expect.stringContaining('Created Mailable'));
  });

  it('creates a MarkdownMailable with --markdown', async () => {
    await makeMailable('NewsletterMail', { path: tmpDir, markdown: true });
    const filepath = path.join(tmpDir, 'NewsletterMail.ts');
    expect(fs.existsSync(filepath)).toBe(true);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('class NewsletterMail extends MarkdownMailable');
    expect(content).toContain("import { MarkdownMailable } from 'laramail'");
    expect(mockOutput.success).toHaveBeenCalledWith(expect.stringContaining('Created MarkdownMailable'));
  });

  it('creates the target directory if missing', async () => {
    const nested = path.join(tmpDir, 'nested', 'dir');
    await makeMailable('TestMail', { path: nested });
    expect(fs.existsSync(nested)).toBe(true);
    expect(fs.existsSync(path.join(nested, 'TestMail.ts'))).toBe(true);
    expect(mockOutput.info).toHaveBeenCalledWith(expect.stringContaining('Created directory'));
  });

  it('rejects if file already exists', async () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'ExistingMail.ts'), 'existing');
    await makeMailable('ExistingMail', { path: tmpDir });
    expect(mockOutput.error).toHaveBeenCalledWith(expect.stringContaining('File already exists'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('shows usage example after creation', async () => {
    await makeMailable('InviteMail', { path: tmpDir });
    expect(mockOutput.info).toHaveBeenCalledWith('Usage example:');
    expect(mockOutput.log).toHaveBeenCalledWith(expect.stringContaining('InviteMail'));
  });
});
