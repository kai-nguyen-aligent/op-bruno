import { bruToEnvJsonV2, envJsonToBruV2, Variable } from '@usebruno/lang';
import fs from 'fs-extra';
import path from 'path';
import { OP_SECRETS_EXPIRED_AT_VAR } from '../../constants.js';
import { EnvironmentParser, Environments } from '../../types/index.js';

export class BrunoEnvironmentsExport implements EnvironmentParser {
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

    /**
     * Pre-creates the TTL cache marker the pre-request script reads/writes at runtime.
     * It must be declared as `secret` so its value (which changes every refetch cycle)
     * is never persisted into the committed .bru file, same as real 1Password secrets.
     */
    private async ensureSecretsExpiryVariable(filePath: string, variables: Variable[]) {
        if (variables.some(variable => variable.name === OP_SECRETS_EXPIRED_AT_VAR)) {
            return variables;
        }

        const variablesWithExpiry: Variable[] = [
            ...variables,
            { name: OP_SECRETS_EXPIRED_AT_VAR, value: '', enabled: true, secret: true },
        ];

        await fs.writeFile(filePath, envJsonToBruV2({ variables: variablesWithExpiry }), 'utf-8');

        return variablesWithExpiry;
    }

    async parseEnvironments(): Promise<Environments> {
        if (!(await fs.pathExists(this.environmentsPath))) {
            throw new Error(`No environments directory found at ${this.environmentsPath}`);
        }

        const files = await fs.readdir(this.environmentsPath);
        const bruFiles = files.filter(f => f.endsWith('.bru'));

        const environments: Environments = {};

        for (const file of bruFiles) {
            const filePath = path.join(this.environmentsPath, file);
            const envName = path.basename(file, '.bru');
            const content = await fs.readFile(filePath, 'utf-8');

            const variables = bruToEnvJsonV2(content).variables;
            const variablesWithExpiry = await this.ensureSecretsExpiryVariable(filePath, variables);

            const secrets = variablesWithExpiry
                .filter(variable => variable.secret && variable.name !== OP_SECRETS_EXPIRED_AT_VAR)
                .map(secret => ({
                    ...secret,
                    value: this.generateVaultRef(envName, secret.name),
                }));

            environments[envName] = secrets;
        }

        return environments;
    }
}
