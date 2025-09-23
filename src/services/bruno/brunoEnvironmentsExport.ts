import fs from 'fs-extra';
import path from 'path';
import { BrunoEnvironment, BrunoVariable } from '../../types/index.js';

export class BrunoEnvironmentsExport {
    private environmentsPath: string;
    private vault: string;
    private item?: string;

    constructor(collectionDir: string, vault: string, item: string) {
        this.environmentsPath = path.join(collectionDir, 'environments');
        this.vault = vault;
        this.item = item;
    }

    async parseEnvironments(): Promise<BrunoEnvironment[]> {
        if (!(await fs.pathExists(this.environmentsPath))) {
            throw new Error(`No environments directory found at ${this.environmentsPath}`);
        }

        const files = await fs.readdir(this.environmentsPath);
        const bruFiles = files.filter(f => f.endsWith('.bru'));

        const environments: BrunoEnvironment[] = [];

        for (const file of bruFiles) {
            const filePath = path.join(this.environmentsPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const env = this.parseEnvironmentFile(content, path.basename(file, '.bru'));
            environments.push(env);
        }

        return environments;
    }

    private constructSecretVaultReference(envName: string, varName: string) {
        return `op://${this.vault}/${this.item}/${envName}/${varName}`;
    }

    private parseEnvironmentFile(content: string, envName: string): BrunoEnvironment {
        const lines = content.split('\n');
        const variables: BrunoVariable[] = [];

        let inVarSection = false;
        let inSecretSection = false;

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed === 'vars {') {
                inVarSection = true;
                continue;
            }

            if (trimmed === '}' && inVarSection) {
                inVarSection = false;
                continue;
            }

            if (trimmed === 'vars:secret [') {
                inSecretSection = true;
                continue;
            }

            if (trimmed === ']' && inSecretSection) {
                inSecretSection = false;
                continue;
            }

            if (inVarSection || inSecretSection) {
                // Parse variable line
                const item = trimmed.replaceAll(',', '').replaceAll('~', '');
                const [varName, varValue] = item.split(':');

                if (varName) {
                    const value = inVarSection
                        ? varValue
                        : this.constructSecretVaultReference(envName, varName);

                    variables.push({
                        name: varName,
                        value,
                        isSecret: inSecretSection,
                        enabled: trimmed.startsWith('~'),
                    });
                }
            }
        }

        return {
            name: envName,
            variables,
        };
    }

    async collectSecrets() {
        const environments = await this.parseEnvironments();
        const secretMap = new Map<string, BrunoVariable[]>();

        for (const env in Object.keys(environments)) {
            const secrets = environments[env]?.variables?.filter(val => val.isSecret);

            if (secrets) {
                secretMap.set(env, secrets);
            }
        }

        return secretMap;
    }
}
