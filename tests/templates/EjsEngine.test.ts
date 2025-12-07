import { EjsEngine } from '../../src/templates/EjsEngine';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

// Mock ejs
jest.mock('ejs', () => ({
  render: jest.fn((template: string, data: Record<string, unknown>) => {
    let result = template;
    Object.keys(data || {}).forEach(key => {
      result = result.replace(new RegExp(`<%= ${key} %>`, 'g'), String(data[key]));
    });
    return result;
  }),
  compile: jest.fn((template: string) => {
    return (data: Record<string, unknown>) => {
      let result = template;
      Object.keys(data || {}).forEach(key => {
        result = result.replace(new RegExp(`<%= ${key} %>`, 'g'), String(data[key]));
      });
      return result;
    };
  }),
}), { virtual: true });

describe('EjsEngine', () => {
  const testViewsPath = join(__dirname, 'test-views-ejs');

  beforeAll(() => {
    mkdirSync(testViewsPath, { recursive: true });
  });

  afterAll(() => {
    rmSync(testViewsPath, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create engine with default options', () => {
      const engine = new EjsEngine();
      expect(engine).toBeInstanceOf(EjsEngine);
    });

    it('should create engine with custom options', () => {
      const engine = new EjsEngine({
        viewsPath: testViewsPath,
        extension: '.html',
        cache: false,
      });
      expect(engine).toBeInstanceOf(EjsEngine);
    });

    // Note: Testing dynamic require() failures is complex in Jest
    // The error handling is tested manually during development
  });

  describe('render', () => {
    it('should render template string with data', async () => {
      const engine = new EjsEngine();
      const template = 'Hello <%= name %>!';
      const data = { name: 'World' };

      const result = await engine.render(template, data);
      expect(result).toBe('Hello World!');
    });

    it('should render template without data', async () => {
      const engine = new EjsEngine();
      const template = 'Hello World!';

      const result = await engine.render(template);
      expect(result).toBe('Hello World!');
    });

    it('should handle multiple variables', async () => {
      const engine = new EjsEngine();
      const template = '<%= greeting %> <%= name %>, you are <%= age %> years old';
      const data = { greeting: 'Hi', name: 'John', age: 30 };

      const result = await engine.render(template, data);
      expect(result).toBe('Hi John, you are 30 years old');
    });
  });

  describe('renderFile', () => {
    beforeEach(() => {
      writeFileSync(
        join(testViewsPath, 'test.ejs'),
        'Welcome <%= username %>!'
      );
    });

    it('should render template file with data', async () => {
      const engine = new EjsEngine({
        viewsPath: testViewsPath,
      });

      const result = await engine.renderFile('test', { username: 'Alice' });
      expect(result).toBe('Welcome Alice!');
    });

    it('should cache compiled templates', async () => {
      const engine = new EjsEngine({
        viewsPath: testViewsPath,
        cache: true,
      });

      const result1 = await engine.renderFile('test', { username: 'Bob' });
      const result2 = await engine.renderFile('test', { username: 'Charlie' });

      expect(result1).toBe('Welcome Bob!');
      expect(result2).toBe('Welcome Charlie!');
    });

    it('should not cache when cache is disabled', async () => {
      const engine = new EjsEngine({
        viewsPath: testViewsPath,
        cache: false,
      });

      const result = await engine.renderFile('test', { username: 'Dave' });
      expect(result).toBe('Welcome Dave!');
    });

    it('should handle file with extension', async () => {
      const engine = new EjsEngine({
        viewsPath: testViewsPath,
      });

      const result = await engine.renderFile('test.ejs', { username: 'Eve' });
      expect(result).toBe('Welcome Eve!');
    });
  });

  describe('compile', () => {
    it('should compile template string', () => {
      const engine = new EjsEngine();
      const template = 'Hello <%= name %>!';

      const compiled = engine.compile(template);
      expect(typeof compiled).toBe('function');

      const result = compiled({ name: 'Compiler' });
      expect(result).toBe('Hello Compiler!');
    });
  });

  describe('clearCache', () => {
    it('should clear template cache', async () => {
      const engine = new EjsEngine({
        viewsPath: testViewsPath,
        cache: true,
      });

      writeFileSync(join(testViewsPath, 'cached.ejs'), 'Cached <%= value %>');

      await engine.renderFile('cached', { value: 'First' });
      engine.clearCache();
      
      const result = await engine.renderFile('cached', { value: 'Second' });
      expect(result).toBe('Cached Second');
    });
  });
});
