/**
 * config-loader utility tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { configExists, getConfigPath } from '../../src/cli/utils/config-loader';

describe('config-loader', () => {
  describe('configExists', () => {
    it('returns false when no config file exists in cwd', () => {
      // With no custom path and no config file in test directory
      const originalCwd = process.cwd();
      const tmpDir = path.join(__dirname, '__tmp_config_loader__');
      fs.mkdirSync(tmpDir, { recursive: true });

      try {
        process.chdir(tmpDir);
        expect(configExists()).toBe(false);
      } finally {
        process.chdir(originalCwd);
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('returns true when config file exists in cwd', () => {
      const originalCwd = process.cwd();
      const tmpDir = path.join(__dirname, '__tmp_config_loader2__');
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'laramail.config.js'), 'module.exports = {}');

      try {
        process.chdir(tmpDir);
        expect(configExists()).toBe(true);
      } finally {
        process.chdir(originalCwd);
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('returns true for custom path that exists', () => {
      const tmpFile = path.join(__dirname, '__tmp_custom_config.js');
      fs.writeFileSync(tmpFile, 'module.exports = {}');

      try {
        expect(configExists(tmpFile)).toBe(true);
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });

    it('returns false for custom path that does not exist', () => {
      expect(configExists('/nonexistent/path/config.js')).toBe(false);
    });
  });

  describe('getConfigPath', () => {
    it('returns null when no config found', () => {
      const originalCwd = process.cwd();
      const tmpDir = path.join(__dirname, '__tmp_getpath__');
      fs.mkdirSync(tmpDir, { recursive: true });

      try {
        process.chdir(tmpDir);
        expect(getConfigPath()).toBeNull();
      } finally {
        process.chdir(originalCwd);
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('returns the path when config file exists', () => {
      const originalCwd = process.cwd();
      const tmpDir = path.join(__dirname, '__tmp_getpath2__');
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'laramail.config.ts'), 'export default {}');

      try {
        process.chdir(tmpDir);
        const result = getConfigPath();
        expect(result).toBe(path.join(tmpDir, 'laramail.config.ts'));
      } finally {
        process.chdir(originalCwd);
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('returns custom path when it exists', () => {
      const tmpFile = path.join(__dirname, '__tmp_custom_path.js');
      fs.writeFileSync(tmpFile, '');

      try {
        expect(getConfigPath(tmpFile)).toBe(tmpFile);
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });

    it('returns null for custom path that does not exist', () => {
      expect(getConfigPath('/does/not/exist.ts')).toBeNull();
    });

    it('prefers .ts over .js when both exist', () => {
      const originalCwd = process.cwd();
      const tmpDir = path.join(__dirname, '__tmp_getpath_priority__');
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'laramail.config.ts'), 'export default {}');
      fs.writeFileSync(path.join(tmpDir, 'laramail.config.js'), 'module.exports = {}');

      try {
        process.chdir(tmpDir);
        const result = getConfigPath();
        expect(result).toBe(path.join(tmpDir, 'laramail.config.ts'));
      } finally {
        process.chdir(originalCwd);
        fs.rmSync(tmpDir, { recursive: true });
      }
    });
  });
});
