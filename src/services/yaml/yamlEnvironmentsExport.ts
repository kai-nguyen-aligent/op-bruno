import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { OP_SECRETS_EXPIRED_AT_DESCRIPTION, OP_SECRETS_EXPIRED_AT_VAR } from '../../constants.js';
import {
    EnvironmentParser,
    Environments,
    OpenCollectionEnvironment,
    OpenCollectionVariable,
} from '../../types/index.js';

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

    /**
     * Pre-creates the TTL cache marker the pre-request script reads/writes at runtime.
     * It must be declared as `secret` so its value (which changes every refetch cycle)
     * is never persisted into the committed environment file, same as real 1Password secrets.
     */
    private async ensureSecretsExpiryVariable(
        filePath: string,
        parsed: OpenCollectionEnvironment,
        variables: OpenCollectionVariable[]
    ) {
        if (variables.some(variable => variable.name === OP_SECRETS_EXPIRED_AT_VAR)) {
            return variables;
        }

        const variablesWithExpiry: OpenCollectionVariable[] = [
            ...variables,
            {
                name: OP_SECRETS_EXPIRED_AT_VAR,
                value: '',
                enabled: true,
                secret: true,
                type: 'text',
                description: OP_SECRETS_EXPIRED_AT_DESCRIPTION,
            },
        ];

        const updated = { ...parsed, variables: variablesWithExpiry };
        await fs.writeFile(filePath, yaml.dump(updated, { lineWidth: -1, noRefs: true }), 'utf-8');

        return variablesWithExpiry;
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
            const variables = await this.ensureSecretsExpiryVariable(
                filePath,
                parsed,
                parsed?.variables || []
            );

            const secrets = variables
                .filter(variable => variable.secret && variable.name !== OP_SECRETS_EXPIRED_AT_VAR)
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
