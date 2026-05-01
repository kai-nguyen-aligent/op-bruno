import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { EnvironmentParser, Environments, OpenCollectionEnvironment } from '../../types/index.js';

export class YamlEnvironmentsExport implements EnvironmentParser {
    private environmentsPath: string;
    private vault: string;
    private item?: string;

    constructor(collectionDir: string, vault: string, item: string) {
        this.environmentsPath = path.join(collectionDir, 'environments');
        this.vault = vault;
        this.item = item;
    }

    private generateVaultRef(envName: string, varName: string) {
        return `op://${this.vault}/${this.item}/${envName}/${varName}`;
    }

    async parseEnvironments(): Promise<Environments> {
        if (!(await fs.pathExists(this.environmentsPath))) {
            throw new Error(`No environments directory found at ${this.environmentsPath}`);
        }

        const files = await fs.readdir(this.environmentsPath);
        const ymlFiles = files.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

        const environments: Environments = {};

        for (const file of ymlFiles) {
            const filePath = path.join(this.environmentsPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = yaml.load(content) as OpenCollectionEnvironment;

            const envName = parsed?.name || path.basename(file, path.extname(file));
            const variables = parsed?.variables || [];

            const secrets = variables
                .filter(variable => variable.secret)
                .map(secret => ({
                    name: secret.name,
                    value: this.generateVaultRef(envName, secret.name),
                    enabled: secret.enabled,
                    secret: true,
                }));

            environments[envName] = secrets;
        }

        return environments;
    }
}
