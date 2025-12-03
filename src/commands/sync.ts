import { Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';
import { BaseCommand } from '../base-command.js';

import { PrettyPrintableError } from '@oclif/core/interfaces';
import { BrunoCollectionFileGenerator } from '../services/bruno/brunoCollectionFileGen.js';
import { BrunoConfigManager } from '../services/bruno/brunoConfigManager.js';
import { BrunoEnvironmentsExport } from '../services/bruno/brunoEnvironmentsExport.js';
import { OnePasswordManager } from '../services/onePassword.js';

export default class Sync extends BaseCommand<typeof Sync> {
    static override description =
        'Extract secrets from Bruno environment files and generate pre-request script for fetching from 1Password';

    static override examples = [
        '<%= config.bin %> <%= command.id %> ./bruno-collection --outName secrets.json',
        '<%= config.bin %> <%= command.id %> ./bruno-collection --outName secrets.json --vault Engineering --title "API Secrets" --upsertItem',
    ];

    static override args = {
        collection: Args.string({
            description: 'Path to Bruno collection directory',
            required: true,
        }),
    };

    static override flags = {
        outName: Flags.string({
            description: 'JSON output file name',
            default: 'op-secrets.json',
            defaultHelp: 'The file will be saved in collection dir',
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

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Sync);
        const collectionDir = path.resolve(process.cwd(), args.collection);

        if (!(await fs.pathExists(collectionDir))) {
            this.error(`Collection directory not found: ${collectionDir}`);
        }

        const outPath = path.join(collectionDir, flags.outName);

        this.log(chalk.bold.cyan('\n🔐 Bruno Secrets Sync Command Line Tool\n'));
        this.log(chalk.blue(`📁 Bruno directory: ${collectionDir}`));
        this.log(chalk.blue(`📝 Output file: ${outPath}\n`));

        try {
            const configManager = new BrunoConfigManager(collectionDir, this);
            const name = await configManager.getName();

            const { outName, title = name, vault, upsertItem } = flags;

            this.debug(chalk.bold('Step 1: Extracting secrets from Bruno environments...'));
            const exporter = new BrunoEnvironmentsExport(collectionDir, vault, title);
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
            await fs.writeFile(outPath, JSON.stringify(environments, null, 2));

            this.debug(chalk.bold('\nStep 3: Updating bruno.json...'));
            await configManager.updateConfig();

            if (upsertItem) {
                this.debug(chalk.bold('\nStep 4: Creating/updating 1Password item...'));
                const opManager = new OnePasswordManager(this);

                opManager.verifyAccess(vault);
                opManager.upsertItem(environments, { vault, title });
            } else {
                this.skipped(
                    'Skipping 1Password item creation/update (use --upsertItem flag to enable)'
                );
            }

            this.debug(chalk.bold('\nStep 5: Updating collection.bru with pre-request script...'));
            const collectionGen = new BrunoCollectionFileGenerator(collectionDir, this);
            await collectionGen.upsertCollection(outName);

            // Success summary
            this.log(chalk.bold.green('\n🏁 Completed Bruno secrets sync!\n'));
            this.log(chalk.green('Summary:'));
            this.log(chalk.green(`  • Extracted secrets from all environment(s)`));
            this.log(chalk.green(`  • Exported secrets to ${outPath}`));
            this.log(
                chalk.green(`  • Whitelisted modules and enabled filesystem access in bruno.json`)
            );
            this.log(chalk.green(`  • Updated collection.bru with pre-request script`));

            if (upsertItem) {
                this.log(
                    chalk.green(`  • Created/Updated 1Password item "${title}" in vault "${vault}"`)
                );
            }

            this.info('Next steps:');
            this.log(chalk.cyan('  1. Review the generated files'));
            this.log(chalk.cyan('  2. Test the pre-request script in Bruno'));

            if (!upsertItem) {
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
