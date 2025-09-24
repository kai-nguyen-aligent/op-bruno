import { bruToEnvJsonV2 } from '@usebruno/lang';
import fs from 'fs-extra';
import path from 'path';
import { BrunoEnvironments } from '../../types/index.js';

export class BrunoEnvironmentsExport {
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

    async parseEnvironments(): Promise<BrunoEnvironments> {
        if (!(await fs.pathExists(this.environmentsPath))) {
            throw new Error(`No environments directory found at ${this.environmentsPath}`);
        }

        const files = await fs.readdir(this.environmentsPath);
        const bruFiles = files.filter(f => f.endsWith('.bru'));

        const environments: BrunoEnvironments = {};

        for (const file of bruFiles) {
            const filePath = path.join(this.environmentsPath, file);
            const envName = path.basename(file, '.bru');
            const content = await fs.readFile(filePath, 'utf-8');

            const variables = bruToEnvJsonV2(content).variables;
            const secrets = variables
                .filter(variable => variable.secret)
                .map(secret => ({
                    ...secret,
                    value: this.generateVaultRef(envName, secret.name),
                }));

            environments[envName] = secrets;
        }

        return environments;
    }
}
