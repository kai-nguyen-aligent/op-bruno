import { Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';
import { BaseCommand } from '../base-command.js';

import { BrunoCollectionFileGenerator } from '../services/bruno/brunoCollectionFileGen.js';
import { BrunoConfigManager } from '../services/bruno/brunoConfigManager.js';
import { BrunoEnvironmentsExport } from '../services/bruno/brunoEnvironmentsExport.js';
import { OnePasswordManager } from '../services/onePassword.js';

export default class Sync extends BaseCommand<typeof Sync> {
    static override description =
        'Extract secrets from Bruno environment files and sync with 1Password';

    static override examples = [
        '<%= config.bin %> <%= command.id %> ./bruno-project -o secrets.yml',
        '<%= config.bin %> <%= command.id %> ./bruno-project -o secrets.yml --1password --vault Engineering --title "API Secrets" --category API',
    ];

    static override args = {
        collection: Args.string({
            description: 'Path to Bruno collection directory',
            required: true,
        }),
    };

    static override flags = {
        vault: Flags.string({ description: '1Password vault name', default: 'Employee' }),
        title: Flags.string({
            description: '1Password item title',
            defaultHelp: 'Default to collection name',
        }),
        outName: Flags.string({
            description: 'JSON output file name',
            default: 'op-secrets.json',
            defaultHelp: 'The file will be saved in collection dir',
        }),
        '1password': Flags.boolean({
            description: 'Create or Update 1Password item',
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Sync);
        const brunoDir = path.resolve(process.cwd(), args.collection);

        // Validate Bruno directory
        if (!(await fs.pathExists(brunoDir))) {
            this.error(`Bruno directory not found: ${brunoDir}`);
        }

        const outPath = path.join(brunoDir, flags.outName);

        this.log(chalk.bold.cyan('\n🔐 Bruno Secrets Sync Command Line Tool\n'));
        this.log(chalk.blue(`📁 Bruno directory: ${brunoDir}`));
        this.log(chalk.blue(`📝 Output file: ${outPath}\n`));

        try {
            const configManager = new BrunoConfigManager(brunoDir, this);
            const name = await configManager.getName();

            const { '1password': upsert1PasswordItem, outName, title = name, vault } = flags;

            this.debug(chalk.bold('Step 1: Extracting secrets from Bruno environments...'));
            const exporter = new BrunoEnvironmentsExport(brunoDir, vault, title);
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

            if (upsert1PasswordItem) {
                this.debug(chalk.bold('\nStep 4: Creating/updating 1Password item...'));
                const opManager = new OnePasswordManager(this);
                opManager.verifyAccess(vault);

                opManager.upsertItem(environments, { vault, title });
            } else {
                this.skipped('Skipping 1Password item creation (use --1password flag to enable)');
            }

            this.debug(chalk.bold('\nStep 5: Updating collection.bru with pre-request script...'));
            const collectionGen = new BrunoCollectionFileGenerator(brunoDir, this);
            await collectionGen.upsertCollection(outName);

            // Success summary
            this.log(chalk.bold.green('\n🏁 Completed Bruno secrets sync!'));
            this.log(chalk.green('Summary:'));
            this.log(
                chalk.green(
                    `  • Extracted secrets from ${Object.keys(environments).length} environment(s)`
                )
            );
            this.log(chalk.green(`  • Exported secrets to ${outPath}`));
            this.log(
                chalk.green(`  • Whitelisted modules and enabled filesystem access in bruno.json`)
            );
            this.log(chalk.green(`  • Updated collection.bru with pre-request script`));

            if (upsert1PasswordItem) {
                this.log(
                    chalk.green(`  • Created/Updated 1Password item "${title}" in vault "${vault}"`)
                );
            }

            this.info('Next steps:');
            this.log(chalk.cyan('  1. Review the generated files'));
            this.log(chalk.cyan('  2. Test the pre-request script in Bruno'));

            if (!upsert1PasswordItem) {
                this.log(
                    chalk.cyan('  3. Consider creating a 1Password item with --1password flag')
                );
            }
        } catch (error) {
            this.error('Failed Bruno secrets sync', {
                message: (error as Error).message || 'Unknown error',
                suggestions: ['Please log an issue on our github repository'],
                ref: 'https://github.com/kai-nguyen-aligent/op-bruno',
            });
        }
    }
}
