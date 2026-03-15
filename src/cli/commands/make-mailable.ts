/**
 * make:mailable command - Generate a new Mailable class
 */

import * as fs from 'fs';
import * as path from 'path';
import { output } from '../utils/output.js';

interface MakeMailableOptions {
  markdown?: boolean;
  path: string;
}

export async function makeMailable(name: string, options: MakeMailableOptions): Promise<void> {
  try {
    // Validate name
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      await output.error('Mailable name must be PascalCase (e.g., WelcomeMail, OrderConfirmation)');
      process.exit(1);
    }

    // Ensure directory exists
    const targetDir = path.resolve(process.cwd(), options.path);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      await output.info(`Created directory: ${options.path}`);
    }

    // Generate filename
    const filename = `${name}.ts`;
    const filepath = path.join(targetDir, filename);

    // Check if file already exists
    if (fs.existsSync(filepath)) {
      await output.error(`File already exists: ${filepath}`);
      process.exit(1);
    }

    // Generate content
    const content = options.markdown
      ? generateMarkdownMailableTemplate(name)
      : generateMailableTemplate(name);

    // Write file
    fs.writeFileSync(filepath, content);

    await output.success(
      `Created ${options.markdown ? 'MarkdownMailable' : 'Mailable'}: ${filepath}`
    );
    output.newline();
    await output.info('Usage example:');
    output.log(`  import { ${name} } from './${options.path}/${name}';`);
    output.log(`  await Mail.to('user@example.com').send(new ${name}({ name: 'John' }));`);
  } catch (error) {
    await output.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function generateMailableTemplate(name: string): string {
  return `/**
 * ${name} - Email notification
 */

import { Mailable } from 'laramail';

interface ${name}Data {
  name: string;
  // Add your data properties here
}

export class ${name} extends Mailable {
  constructor(private data: ${name}Data) {
    super();
  }

  build(): this {
    return this
      .subject('Your Subject Here')
      .html(\`
        <h1>Hello, \${this.data.name}!</h1>
        <p>This is your email content.</p>
      \`);
  }
}
`;
}

function generateMarkdownMailableTemplate(name: string): string {
  return `/**
 * ${name} - Markdown email notification
 */

import { MarkdownMailable } from 'laramail';

interface ${name}Data {
  name: string;
  // Add your data properties here
}

export class ${name} extends MarkdownMailable {
  constructor(private data: ${name}Data) {
    super();
  }

  build(): this {
    return this
      .subject('Your Subject Here')
      .markdown(\`
# Hello, {{name}}!

This is your email content written in **Markdown**.

[button url="https://example.com" color="primary"]Get Started[/button]

[panel]
Need help? Contact our support team.
[/panel]
      \`, {
        name: this.data.name,
      });
  }
}
`;
}
