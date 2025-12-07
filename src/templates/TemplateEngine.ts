/**
 * Template Engine Interface
 * Defines the contract for all template engines (Handlebars, EJS, Pug, etc.)
 */

export interface TemplateEngine {
  /**
   * Render a template string with data
   * @param template - The template string to render
   * @param data - Data to pass to the template
   * @returns Promise<string> - The rendered HTML string
   */
  render(template: string, data?: Record<string, unknown>): Promise<string>;

  /**
   * Render a template file with data
   * @param filePath - Path to the template file
   * @param data - Data to pass to the template
   * @returns Promise<string> - The rendered HTML string
   */
  renderFile(filePath: string, data?: Record<string, unknown>): Promise<string>;

  /**
   * Compile a template string for later use
   * @param template - The template string to compile
   * @returns Function - A compiled template function
   */
  compile(template: string): (data?: Record<string, unknown>) => string;
}

/**
 * Template Engine Options
 */
export interface TemplateEngineOptions {
  /**
   * Base directory for template files
   */
  viewsPath?: string;

  /**
   * File extension for templates (e.g., '.hbs', '.ejs', '.pug')
   */
  extension?: string;

  /**
   * Enable template caching for better performance
   */
  cache?: boolean;

  /**
   * Custom engine-specific options
   */
  options?: Record<string, unknown>;
}
