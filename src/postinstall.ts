/**
 * Postinstall script - Shows a static thank-you message.
 * Standalone script with no imports from the nodemail library.
 */

const REPO_URL = 'https://github.com/impruthvi/nodemail';

const CI_ENV_VARS = [
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
];

export function shouldSkip(): boolean {
  if (process.env['NODEMAIL_NO_POSTINSTALL']) return true;
  if (CI_ENV_VARS.some((v) => process.env[v])) return true;
  return false;
}

type ChalkLike = {
  yellow: (s: string) => string;
  cyan: (s: string) => string;
  dim: (s: string) => string;
  bold: (s: string) => string;
};

async function loadChalk(): Promise<ChalkLike> {
  try {
    const mod = await import('chalk');
    return mod.default as unknown as ChalkLike;
  } catch {
    const identity = (s: string) => s;
    return { yellow: identity, cyan: identity, dim: identity, bold: identity };
  }
}

async function openTTY(): Promise<((msg: string) => void) | null> {
  try {
    const fs = await import('fs');
    const fd = fs.openSync('/dev/tty', 'w');
    return (msg: string) => {
      fs.writeSync(fd, msg + '\n');
    };
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  if (shouldSkip()) return;

  // Try /dev/tty first (bypasses npm's stdio capture), fall back to stderr
  const ttyLog = await openTTY();
  const log = ttyLog ?? ((msg: string) => process.stderr.write(msg + '\n'));

  const chalk = await loadChalk();

  log('');
  log(chalk.yellow('  ★ Thank you for installing @impruthvi/nodemail!'));
  log(chalk.dim('    If you find this package useful, a GitHub star helps a lot.'));
  log(chalk.cyan(`    → ${REPO_URL}`));
  log('');
}

main().catch(() => {});
