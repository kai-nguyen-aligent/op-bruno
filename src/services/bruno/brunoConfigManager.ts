import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';
import { BrunoConfig } from '../../types/index.js';

export class BrunoConfigManager {
    private configPath: string;

    constructor(collectionDir: string) {
        this.configPath = path.join(collectionDir, 'bruno.json');
    }

    async getConfig(): Promise<BrunoConfig> {
        const isConfigExist = await fs.pathExists(this.configPath);

        if (!isConfigExist) {
            throw new Error(`No bruno.json found at ${this.configPath}`);
        }

        const content = await fs.readFile(this.configPath, 'utf-8');
        return JSON.parse(content);
    }

    async updateConfig(config: BrunoConfig) {
        const exitingModules: string[] = config.scripts?.moduleWhitelist || [];

        const moduleWhitelist = exitingModules.includes('child_process')
            ? exitingModules
            : exitingModules.concat('child_process');

        config.scripts = { moduleWhitelist, filesystemAccess: { allow: true } };
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');

        console.log(chalk.green('✓ Enabled filesystem access in bruno.json'));
    }
}
