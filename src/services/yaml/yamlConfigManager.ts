import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { BaseCommand } from '../../base-command.js';
import Sync from '../../commands/sync.js';
import { ConfigManager } from '../../types/index.js';

interface OpenCollectionConfig {
    opencollection?: string;
    info?: {
        name?: string;
        [key: string]: unknown;
    };
    scripts?: {
        moduleWhitelist?: string[];
        filesystemAccess?: {
            allow: boolean;
        };
    };
    [key: string]: unknown;
}

export class YamlConfigManager implements ConfigManager {
    private readonly configPath: string;
    private readonly requiredModules = ['child_process', 'fs'];
    private readonly command: BaseCommand<typeof Sync>;

    constructor(collectionDir: string, command: BaseCommand<typeof Sync>) {
        this.configPath = path.join(collectionDir, 'opencollection.yml');
        this.command = command;
    }

    private async getConfig(): Promise<OpenCollectionConfig> {
        const isConfigExist = await fs.pathExists(this.configPath);

        if (!isConfigExist) {
            throw new Error(`No opencollection.yml found at ${this.configPath}`);
        }

        const content = await fs.readFile(this.configPath, 'utf-8');
        return (yaml.load(content) as OpenCollectionConfig) || {};
    }

    async getName(): Promise<string> {
        const config = await this.getConfig();
        const name = config.info?.name;

        if (!name) {
            throw new Error(
                `No collection name found in ${this.configPath}. Expected info.name field.`
            );
        }

        return name;
    }

    async updateConfig(): Promise<void> {
        const config = await this.getConfig();

        const moduleWhitelist: string[] = config.scripts?.moduleWhitelist || [];

        this.requiredModules.forEach(required => {
            const isModuleExist = moduleWhitelist.find(whitelisted => whitelisted === required);
            if (!isModuleExist) moduleWhitelist.push(required);
        });

        config.scripts = { moduleWhitelist, filesystemAccess: { allow: true } };

        const output = yaml.dump(config, { lineWidth: -1, noRefs: true });
        await fs.writeFile(this.configPath, output, 'utf-8');

        this.command.success(
            'Whitelisted modules & enabled filesystem access in opencollection.yml'
        );
    }
}
