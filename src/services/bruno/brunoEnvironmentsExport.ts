import fs from 'fs-extra';
import path from 'path';
import { BrunoEnvironment, BrunoVariable } from '../../types/index.js';

export class BrunoEnvironmentsExport {
    private environmentsPath: string;

    constructor(collectionDir: string) {
        this.environmentsPath = path.join(collectionDir, 'environments');
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

    private parseEnvironmentFile(content: string, name: string): BrunoEnvironment {
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
                const [name, value] = item.split(':');

                if (name) {
                    variables.push({
                        name,
                        value: inVarSection ? value : undefined,
                        isSecret: inSecretSection,
                        enabled: trimmed.startsWith('~'),
                    });
                }
            }
        }

        return {
            name,
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
