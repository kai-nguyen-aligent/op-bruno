import * as op from '@1password/op-js';
import chalk from 'chalk';
import { BaseCommand } from '../base-command.js';
import Sync from '../commands/sync.js';
import { BrunoEnvironments, OnePasswordOptions, OnePasswordTemplate } from '../types/index.js';

export class OnePasswordManager {
    private readonly command: BaseCommand<typeof Sync>;

    constructor(command: BaseCommand<typeof Sync>) {
        this.command = command;
    }

    private buildFieldAssignments(environments: BrunoEnvironments) {
        const assignments: op.FieldAssignment[] = [];

        Object.keys(environments).forEach(env => {
            const envVars = environments[env];
            const fields: op.FieldAssignment[] | undefined = envVars?.map(v => {
                return [`${env}/${v.name}`, 'concealed', 'to-be-replaced-with-real-secret'];
            });

            if (fields) {
                assignments.push(...fields);
            }
        });

        return assignments;
    }

    private checkCli() {
        op.validateCli().catch(error => {
            this.command.error('Unable to access 1Password CLI', {
                message: error.message,
                suggestions: ['Ensure that 1Password CLI is installed'],
                ref: 'https://developer.1password.com/docs/cli',
            });
        });
    }

    private createItem(environments: BrunoEnvironments, options: OnePasswordOptions) {
        const { vault, title } = options;
        this.command.info(`Creating 1Password item: ${title} in vault: ${vault}`);

        const template: OnePasswordTemplate = {
            title,
            category: 'API_CREDENTIAL',
            fields: [
                {
                    id: 'notesPlain',
                    label: 'notesPlain',
                    purpose: 'NOTES',
                    type: 'STRING',
                    value: '',
                },
            ],
        };

        try {
            const assignments = this.buildFieldAssignments(environments);

            const item = op.item.create(assignments, {
                vault,
                title,
                template: JSON.stringify(template),
            });

            this.command.success(`Created 1Password item "${title}" in vault "${vault}"`);
            return item.id;
        } catch (error) {
            this.command.error('Failed to create 1Password item', {
                message: (error as Error).message || 'Unknown error',
                suggestions: [],
                ref: '',
            });
            return undefined;
        }
    }

    private updateItem(environments: BrunoEnvironments, item: op.Item) {
        this.command.info(`Updating 1Password item ${item.title} in vault ${item.vault.name}`);
        // TODO: remove fields in the item????

        try {
            const assignments = this.buildFieldAssignments(environments);

            const { id } = op.item.edit(item.id, assignments);

            this.command.success(
                `Created 1Password item "${item.title}" in vault "${item.vault.name}"`
            );
            return id;
        } catch (error) {
            this.command.error('Failed to update 1Password item', {
                message: (error as Error).message || 'Unknown error',
                suggestions: [],
                ref: '',
            });
            return undefined;
        }
    }

    upsertItem(environments: BrunoEnvironments, options: OnePasswordOptions) {
        this.checkCli();

        const item = op.item.get(options.title, { vault: options.vault });
        if (!item) {
            return this.createItem(environments, options);
        }

        return this.updateItem(environments, item as op.Item);
    }

    verifyAccess(vault: string) {
        this.checkCli();

        try {
            op.vault.get(vault);
        } catch {
            this.command.logToStderr(chalk.red(`Cannot access vault "${vault}". Please ensure:`));
            this.command.logToStderr(
                chalk.yellow('  1. You are signed in to 1Password CLI (run: op signin)')
            );
            this.command.logToStderr(
                chalk.yellow(`  2. The vault "${vault}" exists and you have access to it`)
            );
            this.command.error(`Unable to access vault "${vault}"`);
        }
    }
}
