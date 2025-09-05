import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';
import { BrunoConfig } from '../types/index.js';

export class BrunoConfigManager {
  private brunoDir: string;

  constructor(brunoDir: string) {
    this.brunoDir = brunoDir;
  }

  async updateConfig(): Promise<void> {
    const configPath = path.join(this.brunoDir, 'bruno.json');

    let config: BrunoConfig;

    if (await fs.pathExists(configPath)) {
      // Read existing config
      const content = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(content);
      console.log(chalk.blue('ℹ️  Updating existing bruno.json'));
    } else {
      // Create new config
      config = {
        version: '1',
        name: path.basename(this.brunoDir),
        type: 'collection',
      };
      console.log(chalk.blue('ℹ️  Creating new bruno.json'));
    }

    // Enable filesystem access
    if (!config.scripts) {
      config.scripts = {};
    }

    config.scripts.filesystemAccess = {
      allow: true,
    };

    // Write updated config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    console.log(chalk.green('✓ Enabled filesystem access in bruno.json'));
  }
}
