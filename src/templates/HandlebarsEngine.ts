import { TemplateEngine, TemplateEngineOptions } from './TemplateEngine';
import { readFile } from 'fs/promises';
import { resolve, extname } from 'path';

/**
 * Handlebars Template Engine
 * Provides Handlebars template rendering with dynamic loading
 */
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
export class HandlebarsEngine implements TemplateEngine {
  private handlebars: any;
  private cache: Map<string, any>;
  private options: TemplateEngineOptions;

  constructor(options: TemplateEngineOptions = {}) {
    this.options = {
      viewsPath: options.viewsPath || './views',
      extension: options.extension || '.hbs',
      cache: options.cache ?? true,
      options: options.options || {},
    };
    this.cache = new Map();
    this.loadHandlebars();
  }

  private loadHandlebars(): void {
    try {
      this.handlebars = require('handlebars');
    } catch {
      throw new Error(
        'Handlebars is not installed. Please install it: npm install handlebars'
      );
    }
  }

  /**
   * Render a template string with data
   */
  render(template: string, data?: Record<string, unknown>): Promise<string> {
    const compiledTemplate = this.compile(template);
    return Promise.resolve(compiledTemplate(data));
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

    // Compile and cache
    const compiledTemplate = this.compile(templateContent);
    if (this.options.cache) {
      this.cache.set(filePath, compiledTemplate);
    }

    return compiledTemplate(data);
  }

  /**
   * Compile a template string
   */
  compile(template: string): (data?: Record<string, unknown>) => string {
    return this.handlebars.compile(template, this.options.options);
  }

  /**
   * Register a Handlebars helper
   */
  registerHelper(name: string, fn: (...args: any[]) => any): void {
    this.handlebars.registerHelper(name, fn);
  }

  /**
   * Register a Handlebars partial
   */
  registerPartial(name: string, partial: string): void {
    this.handlebars.registerPartial(name, partial);
  }

  /**
   * Clear the template cache
   */
  clearCache(): void {
    this.cache.clear();
  }
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */

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
