/**
 * Output Utilities - Styled console output with chalk
 */

type ChalkInstance = {
  green: (s: string) => string;
  red: (s: string) => string;
  yellow: (s: string) => string;
  blue: (s: string) => string;
  cyan: (s: string) => string;
  gray: (s: string) => string;
  dim: (s: string) => string;
  bold: ((s: string) => string) & {
    underline: (s: string) => string;
    green: (s: string) => string;
    red: (s: string) => string;
    yellow: (s: string) => string;
    blue: (s: string) => string;
    cyan: (s: string) => string;
  };
};

// Dynamic import chalk to handle ESM
let chalk: ChalkInstance | null = null;

async function loadChalk(): Promise<ChalkInstance> {
  if (chalk) return chalk;

  try {
    const chalkModule = await import('chalk');
    chalk = chalkModule.default as ChalkInstance;
    return chalk;
  } catch {
    // Fallback if chalk is not installed
    chalk = {
      green: (s: string) => s,
      red: (s: string) => s,
      yellow: (s: string) => s,
      blue: (s: string) => s,
      cyan: (s: string) => s,
      gray: (s: string) => s,
      bold: Object.assign((s: string) => s, {
        underline: (s: string) => s,
        green: (s: string) => s,
        red: (s: string) => s,
        yellow: (s: string) => s,
        blue: (s: string) => s,
        cyan: (s: string) => s,
      }),
      dim: (s: string) => s,
    };
    return chalk;
  }
}

export const output = {
  /**
   * Print a success message
   */
  async success(msg: string): Promise<void> {
    const c = await loadChalk();
    console.log(c.green('✓'), msg);
  },

  /**
   * Print an error message
   */
  async error(msg: string): Promise<void> {
    const c = await loadChalk();
    console.log(c.red('✗'), msg);
  },

  /**
   * Print a warning message
   */
  async warning(msg: string): Promise<void> {
    const c = await loadChalk();
    console.log(c.yellow('⚠'), msg);
  },

  /**
   * Print an info message
   */
  async info(msg: string): Promise<void> {
    const c = await loadChalk();
    console.log(c.blue('ℹ'), msg);
  },

  /**
   * Print a heading
   */
  async heading(msg: string): Promise<void> {
    const c = await loadChalk();
    console.log();
    console.log(c.bold.underline(msg));
    console.log();
  },

  /**
   * Print a key-value pair
   */
  async keyValue(key: string, value: string | number): Promise<void> {
    const c = await loadChalk();
    console.log(`  ${c.cyan(key + ':')}`, value);
  },

  /**
   * Print a divider line
   */
  divider(char = '─', length = 40): void {
    console.log(char.repeat(length));
  },

  /**
   * Print a table
   */
  table(data: Record<string, unknown>[]): void {
    console.table(data);
  },

  /**
   * Print a newline
   */
  newline(): void {
    console.log();
  },

  /**
   * Print raw text
   */
  log(msg: string): void {
    console.log(msg);
  },

  /**
   * Print colored text
   */
  async colored(
    msg: string,
    color: 'green' | 'red' | 'yellow' | 'blue' | 'cyan' | 'gray'
  ): Promise<void> {
    const c = await loadChalk();
    console.log(c[color](msg));
  },

  /**
   * Print a box around text
   */
  async box(title: string, content: string[]): Promise<void> {
    const c = await loadChalk();
    const maxLen = Math.max(title.length, ...content.map((l) => l.length)) + 4;
    const top = '┌' + '─'.repeat(maxLen) + '┐';
    const bottom = '└' + '─'.repeat(maxLen) + '┘';
    const titleLine = '│ ' + c.bold(title) + ' '.repeat(maxLen - title.length - 1) + '│';
    const separator = '├' + '─'.repeat(maxLen) + '┤';

    console.log(top);
    console.log(titleLine);
    console.log(separator);
    for (const line of content) {
      console.log('│ ' + line + ' '.repeat(maxLen - line.length - 1) + '│');
    }
    console.log(bottom);
  },
};

/**
 * Spinner for long-running operations
 */
export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private frameIndex = 0;
  private interval: NodeJS.Timeout | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    this.interval = setInterval(() => {
      process.stdout.write(`\r${this.frames[this.frameIndex]} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\r' + ' '.repeat(this.message.length + 10) + '\r');
    if (finalMessage) {
      console.log(finalMessage);
    }
  }

  async succeed(message: string): Promise<void> {
    this.stop();
    await output.success(message);
  }

  async fail(message: string): Promise<void> {
    this.stop();
    await output.error(message);
  }
}
