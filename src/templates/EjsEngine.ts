import { TemplateEngine, TemplateEngineOptions } from './TemplateEngine';
import { readFile } from 'fs/promises';
import { resolve, extname } from 'path';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
/**
 * EJS Template Engine
 * Provides EJS template rendering with dynamic loading
 */
export class EjsEngine implements TemplateEngine {
  private ejs: any;
  private cache: Map<string, any>;
  private options: TemplateEngineOptions;

  constructor(options: TemplateEngineOptions = {}) {
    this.options = {
      viewsPath: options.viewsPath || './views',
      extension: options.extension || '.ejs',
      cache: options.cache ?? true,
      options: options.options || {},
    };
    this.cache = new Map();
    this.loadEjs();
  }

  private loadEjs(): void {
    try {
      this.ejs = require('ejs');
    } catch {
      throw new Error('EJS is not installed. Please install it: npm install ejs');
    }
  }

  /**
   * Render a template string with data
   */
  render(template: string, data?: Record<string, unknown>): Promise<string> {
    return Promise.resolve(this.ejs.render(template, data, this.options.options));
  }

  /**
   * Render a template file with data
   */
  async renderFile(
    filePath: string,
    data?: Record<string, unknown>
  ): Promise<string> {
    // Check cache first
    if (this.options.cache && this.cache.has(filePath)) {
      const compiledTemplate = this.cache.get(filePath);
      return compiledTemplate(data);
    }

    // Resolve file path
    const resolvedPath = this.resolveTemplatePath(filePath);

    // Read template file
    const templateContent = await readFile(resolvedPath, 'utf-8');

    // Compile if caching enabled
    if (this.options.cache) {
      const compiledTemplate = this.compile(templateContent);
      this.cache.set(filePath, compiledTemplate);
      return compiledTemplate(data);
    }

    // Render directly without caching
    return this.ejs.render(templateContent, data, this.options.options);
  }

  /**
   * Compile a template string
   */
  compile(template: string): (data?: Record<string, unknown>) => string {
    return this.ejs.compile(template, this.options.options);
  }

  /**
   * Clear the template cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Resolve template file path
   */
  private resolveTemplatePath(filePath: string): string {
    // If file already has extension, use it as-is
    if (extname(filePath)) {
      return resolve(this.options.viewsPath!, filePath);
    }

    // Add default extension
    return resolve(this.options.viewsPath!, `${filePath}${this.options.extension}`);
  }
}
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
