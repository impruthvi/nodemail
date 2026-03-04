/**
 * Config Loader - Auto-detect and load nodemail.config.ts/js
 */

import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import type { MailConfig } from '../../types';

export interface LoadedConfig {
  config: MailConfig;
  configPath: string;
}

const CONFIG_FILES = [
  'nodemail.config.ts',
  'nodemail.config.js',
  'nodemail.config.mjs',
  'nodemail.config.cjs',
];

/**
 * Find the config file in the current directory or parents
 */
function findConfigFile(customPath?: string): string | null {
  if (customPath) {
    const absolutePath = path.isAbsolute(customPath)
      ? customPath
      : path.resolve(process.cwd(), customPath);

    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
    return null;
  }

  // Search in current directory
  const cwd = process.cwd();

  for (const configFile of CONFIG_FILES) {
    const configPath = path.join(cwd, configFile);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

/**
 * Load the configuration file
 */
export async function loadConfig(customPath?: string): Promise<LoadedConfig> {
  const configPath = findConfigFile(customPath);

  if (!configPath) {
    const searchedFiles = customPath ? [customPath] : CONFIG_FILES;
    throw new Error(
      `Config file not found. Searched for: ${searchedFiles.join(', ')}\n` +
        'Create a nodemail.config.ts or nodemail.config.js file in your project root.'
    );
  }

  try {
    // Use dynamic import for both ESM and CJS
    const fileUrl = pathToFileURL(configPath).href;

    // For TypeScript files, we need tsx or ts-node to handle them
    // The CLI should be run with tsx or the config should be compiled
    const module = await import(fileUrl);

    const config = module.default || module;

    if (!config.default || !config.mailers) {
      // Check if it's wrapped in default export
      const actualConfig = config.default || config;

      if (!actualConfig.default || !actualConfig.mailers) {
        throw new Error(
          'Invalid config format. Config must export a MailConfig object with "default" and "mailers" properties.'
        );
      }

      return {
        config: actualConfig as MailConfig,
        configPath,
      };
    }

    return {
      config: config as MailConfig,
      configPath,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid config format')) {
      throw error;
    }

    throw new Error(
      `Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}\n` +
        'For TypeScript configs, make sure to run the CLI with tsx: npx tsx node_modules/.bin/nodemail'
    );
  }
}

/**
 * Check if a config file exists
 */
export function configExists(customPath?: string): boolean {
  return findConfigFile(customPath) !== null;
}

/**
 * Get the path to the config file (without loading it)
 */
export function getConfigPath(customPath?: string): string | null {
  return findConfigFile(customPath);
}
