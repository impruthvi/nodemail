import { TemplateEngine, TemplateEngineOptions } from './TemplateEngine';
import { resolve, extname } from 'path';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
/**
 * Pug Template Engine
 * Provides Pug (formerly Jade) template rendering with dynamic loading
 */
export class PugEngine implements TemplateEngine {
  private pug: any;
  private cache: Map<string, any>;
  private options: TemplateEngineOptions;

  constructor(options: TemplateEngineOptions = {}) {
    this.options = {
      viewsPath: options.viewsPath || './views',
      extension: options.extension || '.pug',
      cache: options.cache ?? true,
      options: options.options || {},
    };
    this.cache = new Map();
    this.loadPug();
  }

  private loadPug(): void {
    try {
      this.pug = require('pug');
    } catch {
      throw new Error('Pug is not installed. Please install it: npm install pug');
    }
  }

  /**
   * Render a template string with data
   */
  render(template: string, data?: Record<string, unknown>): Promise<string> {
    return Promise.resolve(
      this.pug.render(template, {
        ...this.options.options,
        ...data,
      })
    );
  }

  /**
   * Render a template file with data
   */
  renderFile(
    filePath: string,
    data?: Record<string, unknown>
  ): Promise<string> {
    // Check cache first
    if (this.options.cache && this.cache.has(filePath)) {
      const compiledTemplate = this.cache.get(filePath);
      return Promise.resolve(compiledTemplate(data));
    }

    // Resolve file path
    const resolvedPath = this.resolveTemplatePath(filePath);

    // Use Pug's built-in file rendering with caching
    if (this.options.cache) {
      const compiledTemplate = this.pug.compileFile(resolvedPath, {
        ...this.options.options,
        cache: true,
      });
      this.cache.set(filePath, compiledTemplate);
      return Promise.resolve(compiledTemplate(data));
    }

    // Render file directly without caching
    return Promise.resolve(
      this.pug.renderFile(resolvedPath, {
        ...this.options.options,
        ...data,
      })
    );
  }

  /**
   * Compile a template string
   */
  compile(template: string): (data?: Record<string, unknown>) => string {
    return this.pug.compile(template, this.options.options);
  }

  /**
   * Compile a template file
   */
  compileFile(filePath: string): (data?: Record<string, unknown>) => string {
    const resolvedPath = this.resolveTemplatePath(filePath);
    return this.pug.compileFile(resolvedPath, this.options.options);
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
