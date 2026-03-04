/**
 * preview command - Preview an email in the browser
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pathToFileURL } from 'url';
import { output, Spinner } from '../utils/output.js';
import { loadConfig } from '../utils/config-loader.js';
import { MailManager } from '../../core/MailManager.js';
import type { Mailable } from '../../core/Mailable.js';

interface PreviewOptions {
  data?: string;
  config?: string;
}

export async function preview(mailablePath: string, options: PreviewOptions): Promise<void> {
  const spinner = new Spinner('Loading mailable...');
  spinner.start();

  try {
    const { config } = await loadConfig(options.config);
    const manager = new MailManager(config);

    // Resolve the mailable path
    const absolutePath = path.isAbsolute(mailablePath)
      ? mailablePath
      : path.resolve(process.cwd(), mailablePath);

    if (!fs.existsSync(absolutePath)) {
      await spinner.fail(`Mailable file not found: ${absolutePath}`);
      process.exit(1);
    }

    // Parse constructor data if provided
    let constructorData: unknown[] = [];
    if (options.data) {
      try {
        const parsed: unknown = JSON.parse(options.data);
        constructorData = Array.isArray(parsed) ? (parsed as unknown[]) : [parsed];
      } catch {
        await spinner.fail('Invalid JSON data provided');
        process.exit(1);
      }
    }

    // Dynamically import the mailable
    const fileUrl = pathToFileURL(absolutePath).href;
    const module: Record<string, unknown> = (await import(fileUrl)) as Record<string, unknown>;

    // Find the mailable class (first exported class)
    type MailableConstructor = new (...args: unknown[]) => Mailable;
    let MailableClass: MailableConstructor | null = null;

    for (const key of Object.keys(module)) {
      const exported = module[key];
      if (
        typeof exported === 'function' &&
        (exported as { prototype?: { build?: unknown } }).prototype?.build
      ) {
        MailableClass = exported as MailableConstructor;
        break;
      }
    }

    // Check default export if not found
    const defaultExport = module['default'] as { prototype?: { build?: unknown } } | undefined;
    if (!MailableClass && defaultExport && typeof defaultExport === 'function') {
      MailableClass = defaultExport as MailableConstructor;
    }

    if (!MailableClass) {
      await spinner.fail('No Mailable class found in the specified file');
      process.exit(1);
    }

    // Create an instance of the mailable
    const mailable = new MailableClass(...constructorData);
    mailable.setMailManager(manager);

    // Get the preview
    const previewResult = await manager.preview({
      to: 'preview@example.com',
      subject: 'Preview',
      ...mailable.getMailOptions(),
    });

    spinner.stop();

    // Generate HTML file
    const html = generatePreviewHtml({
      html: previewResult.html,
      text: previewResult.text,
      subject: previewResult.subject,
      from: previewResult.from,
      to: previewResult.to,
      headers: previewResult.headers,
    });
    const tempFile = path.join(os.tmpdir(), `nodemail-preview-${Date.now()}.html`);
    fs.writeFileSync(tempFile, html);

    await output.success(`Preview generated: ${tempFile}`);
    await output.info('Opening in browser...');

    // Open in browser
    try {
      // Dynamic import for optional 'open' package
      const openModule = (await import('open')) as { default: (path: string) => Promise<unknown> };
      await openModule.default(tempFile);
    } catch {
      await output.warning('Could not open browser automatically.');
      await output.info(`Open this file manually: ${tempFile}`);
    }
  } catch (error) {
    spinner.stop();
    await output.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

interface PreviewResult {
  html?: string | undefined;
  text?: string | undefined;
  subject?: string | undefined;
  from?: unknown;
  to?: unknown;
  headers?: Record<string, string> | undefined;
}

function generatePreviewHtml(preview: PreviewResult): string {
  const from = preview.from
    ? typeof preview.from === 'string'
      ? preview.from
      : JSON.stringify(preview.from)
    : 'Not set';

  const to = preview.to
    ? typeof preview.to === 'string'
      ? preview.to
      : JSON.stringify(preview.to)
    : 'Not set';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Preview - ${preview.subject || 'Untitled'}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .header { background: #1a1a2e; color: white; padding: 20px; }
    .header h1 { margin: 0 0 10px 0; font-size: 18px; }
    .meta { background: white; padding: 15px 20px; border-bottom: 1px solid #eee; }
    .meta-row { display: flex; margin: 5px 0; }
    .meta-label { width: 100px; font-weight: bold; color: #666; }
    .meta-value { flex: 1; }
    .tabs { display: flex; background: white; border-bottom: 1px solid #ddd; }
    .tab { padding: 10px 20px; cursor: pointer; border: none; background: none; font-size: 14px; }
    .tab.active { border-bottom: 2px solid #0066cc; color: #0066cc; }
    .content { background: white; min-height: 400px; }
    .tab-content { display: none; padding: 20px; }
    .tab-content.active { display: block; }
    .html-content { all: initial; }
    .html-content * { all: revert; }
    .text-content { white-space: pre-wrap; font-family: monospace; background: #f9f9f9; padding: 20px; }
    .headers-content { font-family: monospace; }
    .headers-content table { width: 100%; border-collapse: collapse; }
    .headers-content th, .headers-content td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; }
    .headers-content th { background: #f5f5f5; width: 200px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Nodemail Preview</h1>
    <div>Subject: ${preview.subject || '(No subject)'}</div>
  </div>
  
  <div class="meta">
    <div class="meta-row">
      <span class="meta-label">From:</span>
      <span class="meta-value">${from}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">To:</span>
      <span class="meta-value">${to}</span>
    </div>
  </div>

  <div class="tabs">
    <button class="tab active" onclick="showTab('html')">HTML</button>
    <button class="tab" onclick="showTab('text')">Plain Text</button>
    <button class="tab" onclick="showTab('headers')">Headers</button>
  </div>

  <div class="content">
    <div id="html" class="tab-content active">
      <div class="html-content">
        ${preview.html || '<p style="color: #999;">No HTML content</p>'}
      </div>
    </div>
    <div id="text" class="tab-content">
      <div class="text-content">${preview.text || 'No plain text content'}</div>
    </div>
    <div id="headers" class="tab-content">
      <div class="headers-content">
        <table>
          <tr><th>Header</th><th>Value</th></tr>
          ${
            Object.entries(preview.headers || {})
              .map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`)
              .join('\n') || '<tr><td colspan="2">No custom headers</td></tr>'
          }
        </table>
      </div>
    </div>
  </div>

  <script>
    function showTab(tabId) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector('.tab[onclick*="' + tabId + '"]').classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }
  </script>
</body>
</html>
  `.trim();
}
