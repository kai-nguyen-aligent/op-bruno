import { Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';
import { BaseCommand } from '../base-command.js';

import { PrettyPrintableError } from '@oclif/core/interfaces';
import { BrunoCollectionFileGenerator } from '../services/bruno/brunoCollectionFileGen.js';
import { BrunoConfigManager } from '../services/bruno/brunoConfigManager.js';
import { BrunoEnvironmentsExport } from '../services/bruno/brunoEnvironmentsExport.js';
import { detectCollectionFormat } from '../services/collectionFormatDetector.js';
import { OnePasswordManager } from '../services/onePassword.js';
import { YamlCollectionFileGenerator } from '../services/yaml/yamlCollectionFileGen.js';
import { YamlConfigManager } from '../services/yaml/yamlConfigManager.js';
import { YamlEnvironmentsExport } from '../services/yaml/yamlEnvironmentsExport.js';
import {
    CollectionFileGenerator,
    CollectionFormat,
    ConfigManager,
    EnvironmentParser,
} from '../types/index.js';

export default class Sync extends BaseCommand<typeof Sync> {
    static override description =
        'Extract secrets from Bruno environment files and generate pre-request script for fetching from 1Password';

    static override examples = [
        '<%= config.bin %> <%= command.id %> ./bruno-collection --outDir op-secrets',
        '<%= config.bin %> <%= command.id %> ./bruno-collection --outDir op-secrets --vault Engineering --title "API Secrets" --upsertItem',
    ];

    static override args = {
        collection: Args.string({
            description: 'Path to Bruno collection directory',
            required: true,
        }),
    };

    static override flags = {
        outDir: Flags.string({
            description: 'Output directory name for per-environment secret files',
            default: 'op-secrets',
            defaultHelp: 'The directory will be created in the collection dir',
        }),
        vault: Flags.string({ description: '1Password vault name', default: 'Employee' }),
        title: Flags.string({
            description: '1Password item title',
            defaultHelp: 'Default to collection name',
        }),
        // TODO: Flags for skip pre-request
        upsertItem: Flags.boolean({
            description: 'Create or Update 1Password item',
            default: false,
        }),
    };

    private createExporter(
        format: CollectionFormat,
        collectionDir: string,
        vault: string,
        title: string
    ): EnvironmentParser {
        return format === 'yaml'
            ? new YamlEnvironmentsExport(collectionDir, vault, title)
            : new BrunoEnvironmentsExport(collectionDir, vault, title);
    }

    private createConfigManager(format: CollectionFormat, collectionDir: string): ConfigManager {
        return format === 'yaml'
            ? new YamlConfigManager(collectionDir, this)
            : new BrunoConfigManager(collectionDir, this);
    }

    private createCollectionGen(
        format: CollectionFormat,
        collectionDir: string
    ): CollectionFileGenerator {
        return format === 'yaml'
            ? new YamlCollectionFileGenerator(collectionDir, this)
            : new BrunoCollectionFileGenerator(collectionDir, this);
    }

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Sync);
        const collectionDir = path.resolve(process.cwd(), args.collection);

        if (!(await fs.pathExists(collectionDir))) {
            this.error(`Collection directory not found: ${collectionDir}`);
        }

        const outDir = path.join(collectionDir, flags.outDir);

        this.log(chalk.bold.cyan('\n🔐 Bruno Secrets Sync Command Line Tool\n'));
        this.log(chalk.blue(`📁 Bruno directory: ${collectionDir}`));
        this.log(chalk.blue(`📝 Output directory: ${outDir}\n`));

        try {
            const format = await detectCollectionFormat(collectionDir);
            const configFile = format === 'yaml' ? 'opencollection.yml' : 'bruno.json';
            const collectionFile = format === 'yaml' ? 'opencollection.yml' : 'collection.bru';

            this.info(
                `Detected collection format: ${format === 'yaml' ? 'OpenCollection YAML' : 'Bru Lang'}`
            );

            const { outDir: outDirName, vault } = flags;

            const configManager = this.createConfigManager(format, collectionDir);
            const name = await configManager.getName();
            const title = flags.title || name;

            const exporter = this.createExporter(format, collectionDir, vault, title);
            const collectionGen = this.createCollectionGen(format, collectionDir);

            this.debug(chalk.bold('Step 1: Extracting secrets from Bruno environments...'));
            const environments = await exporter.parseEnvironments();

            if (Object.keys(environments).length === 0) {
                this.warn('No environments found in Bruno collection');
                return;
            }

            const hasSecretEnv = Object.keys(environments).filter(
                env => environments[env] && environments[env].length > 0
            );

            if (!hasSecretEnv.length) {
                this.warn('None of the environments found has secret');
                return;
            }

            this.debug(chalk.bold('\nStep 2: Exporting secrets to JSON...'));
            await fs.ensureDir(outDir);
            for (const [envName, secrets] of Object.entries(environments)) {
                if (secrets.length === 0) continue;
                const envFilePath = path.join(outDir, `${envName}.json`);
                await fs.writeFile(envFilePath, JSON.stringify(secrets, null, 2));
            }

            this.debug(chalk.bold(`\nStep 3: Updating ${configFile}...`));
            await configManager.updateConfig();

            if (flags.upsertItem) {
                this.debug(chalk.bold('\nStep 4: Creating/updating 1Password item...'));
                const opManager = new OnePasswordManager(this);

                opManager.verifyAccess(vault);
                opManager.upsertItem(environments, { vault, title });
            } else {
                this.skipped(
                    'Skipping 1Password item creation/update (use --upsertItem flag to enable)'
                );
            }

            this.debug(
                chalk.bold(`\nStep 5: Updating ${collectionFile} with pre-request script...`)
            );

            await collectionGen.updateCollection(outDirName);

            // Success summary
            this.log(chalk.bold.green('\n🏁 Completed Bruno secrets sync!\n'));
            this.log(chalk.green('Summary:'));
            this.log(chalk.green(`  • Extracted secrets from all environment(s)`));
            this.log(chalk.green(`  • Exported secrets to ${outDir}`));
            this.log(
                chalk.green(
                    `  • Whitelisted modules and enabled filesystem access in ${configFile}`
                )
            );
            this.log(chalk.green(`  • Updated ${collectionFile} with pre-request script`));

            if (flags.upsertItem) {
                this.log(
                    chalk.green(`  • Created/Updated 1Password item "${title}" in vault "${vault}"`)
                );
            }

            this.info('Next steps:');
            this.log(chalk.cyan('  1. Review the generated files'));
            this.log(chalk.cyan('  2. Test the pre-request script in Bruno'));

            if (!flags.upsertItem) {
                this.log(
                    chalk.cyan(
                        '  3. Consider creating/updating a 1Password item with --upsertItem flag'
                    )
                );
            }
        } catch (err) {
            const error = err as Error & PrettyPrintableError;

            this.error(error.message, {
                ref: error.ref ? error.ref : 'https://github.com/kai-nguyen-aligent/op-bruno',
                suggestions: error.suggestions
                    ? error.suggestions
                    : ['If error persist, please log an issue on our github repository'],
            });
        }
    }
}
