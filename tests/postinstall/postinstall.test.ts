import { execFile } from 'child_process';
import * as path from 'path';

// Import shouldSkip for unit testing
import { shouldSkip } from '../../src/postinstall';

describe('Postinstall Script', () => {
  const scriptPath = path.resolve(__dirname, '../../src/postinstall.ts');

  describe('shouldSkip()', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      // Clear all CI env vars
      const ciVars = [
        'CI',
        'GITHUB_ACTIONS',
        'TRAVIS',
        'CIRCLECI',
        'JENKINS_URL',
        'GITLAB_CI',
        'TF_BUILD',
        'BUILDKITE',
        'CODEBUILD_BUILD_ID',
        'TEAMCITY_VERSION',
        'NODEMAIL_NO_POSTINSTALL',
      ];
      ciVars.forEach((v) => delete process.env[v]);
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should skip when NODEMAIL_NO_POSTINSTALL is set', () => {
      process.env.NODEMAIL_NO_POSTINSTALL = '1';
      expect(shouldSkip()).toBe(true);
    });

    it('should skip when CI env var is set', () => {
      process.env.CI = 'true';
      expect(shouldSkip()).toBe(true);
    });

    it('should skip when GITHUB_ACTIONS is set', () => {
      process.env.GITHUB_ACTIONS = 'true';
      expect(shouldSkip()).toBe(true);
    });

    it('should skip when TRAVIS is set', () => {
      process.env.TRAVIS = 'true';
      expect(shouldSkip()).toBe(true);
    });

    it('should skip when JENKINS_URL is set', () => {
      process.env.JENKINS_URL = 'http://jenkins.local';
      expect(shouldSkip()).toBe(true);
    });

    it('should skip when GITLAB_CI is set', () => {
      process.env.GITLAB_CI = 'true';
      expect(shouldSkip()).toBe(true);
    });

    it('should not skip when no CI env vars are set', () => {
      expect(shouldSkip()).toBe(false);
    });
  });

  describe('spawned process', () => {
    it('should show thank-you message when not in CI', (done) => {
      execFile(
        'npx',
        ['tsx', scriptPath],
        {
          env: { ...process.env, CI: '', NODEMAIL_NO_POSTINSTALL: '' },
          timeout: 15000,
        },
        (error, _stdout, stderr) => {
          expect(error).toBeNull();
          expect(stderr).toContain('Thank you for installing @impruthvi/nodemail!');
          expect(stderr).toContain('https://github.com/impruthvi/nodemail');
          done();
        }
      );
    });

    it('should exit silently when CI=true is set', (done) => {
      execFile(
        'npx',
        ['tsx', scriptPath],
        {
          env: { ...process.env, CI: 'true' },
          timeout: 15000,
        },
        (error, stdout) => {
          expect(stdout).toBe('');
          expect(error).toBeNull();
          done();
        }
      );
    });

    it('should exit silently when NODEMAIL_NO_POSTINSTALL is set', (done) => {
      execFile(
        'npx',
        ['tsx', scriptPath],
        {
          env: { ...process.env, NODEMAIL_NO_POSTINSTALL: '1' },
          timeout: 15000,
        },
        (error, stdout) => {
          expect(stdout).toBe('');
          expect(error).toBeNull();
          done();
        }
      );
    });
  });
});
