import fs from 'fs-extra';
import * as path from 'path';
import { BaseCommand } from '../../base-command.js';
import Sync from '../../commands/sync.js';
import { BrunoConfig } from '../../types/index.js';

export class BrunoConfigManager {
    private readonly configPath: string;
    private readonly requiredModules = ['child_process', 'fs'];
    private readonly command: BaseCommand<typeof Sync>;

    constructor(collectionDir: string, command: BaseCommand<typeof Sync>) {
        this.configPath = path.join(collectionDir, 'bruno.json');
        this.command = command;
    }

    private async getConfig(): Promise<BrunoConfig> {
        const isConfigExist = await fs.pathExists(this.configPath);

        if (!isConfigExist) {
            throw new Error(`No bruno.json found at ${this.configPath}`);
        }

        const content = await fs.readFile(this.configPath, 'utf-8');
        return JSON.parse(content);
    }

    async getName() {
        const config = await this.getConfig();
        return config.name;
    }

    async updateConfig() {
        const config = await this.getConfig();

        const moduleWhitelist: string[] = config.scripts?.moduleWhitelist || [];

        this.requiredModules.forEach(required => {
            const isModuleExist = moduleWhitelist.find(whitelisted => whitelisted === required);
            if (!isModuleExist) moduleWhitelist.push(required);
        });

        config.scripts = { moduleWhitelist, filesystemAccess: { allow: true } };
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');

        this.command.success('Whitelisted modules & enabled filesystem access in bruno.json');
    }
}
