import * as op from '@1password/op-js';
import { PrettyPrintableError } from '@oclif/core/interfaces';
import path from 'path';
import { BaseCommand } from '../base-command.js';
import Sync from '../commands/sync.js';
import { BrunoEnvironments, OnePasswordOptions } from '../types/index.js';

export class OnePasswordManager {
    private readonly templatePath = '../templates/onePasswordItemTemplate.json';

    private readonly command: BaseCommand<typeof Sync>;

    constructor(command: BaseCommand<typeof Sync>) {
        this.command = command;
    }

    private buildFieldAssignments(environments: BrunoEnvironments) {
        const assignments: op.FieldAssignment[] = [];

        Object.keys(environments).forEach(env => {
            const envVars = environments[env];
            const fields: op.FieldAssignment[] | undefined = envVars?.map(v => {
                return [
                    `${env.toLowerCase()}.${v.name}`,
                    'concealed',
                    'to-be-replaced-with-real-secret',
                ];
            });

            if (fields) {
                assignments.push(...fields);
            }
        });

        return assignments;
    }

    private checkCli() {
        op.validateCli().catch(err => {
            this.command.failed(err.message);
            const error: PrettyPrintableError = {
                message: 'Unable to access 1Password CLI',
                suggestions: ['Ensure that 1Password CLI is installed'],
                ref: 'https://developer.1password.com/docs/cli',
            };
            throw error;
        });
    }

    private createItem(environments: BrunoEnvironments, options: OnePasswordOptions) {
        const { vault, title } = options;
        this.command.info(`Creating new 1Password item: "${title}" in vault: "${vault}"`);

        try {
            const assignments = this.buildFieldAssignments(environments);
            const template = path.resolve(import.meta.dirname, this.templatePath);

            const item = op.item.create(assignments, { vault, title, template });

            this.command.success(`Created 1Password item "${title}" in vault "${vault}"`);
            return item.id;
        } catch (err) {
            this.command.failed((err as Error).message);

            const error: PrettyPrintableError = {
                message: 'Failed to create 1Password item',
            };
            throw error;
        }
    }

    private updateItem(environments: BrunoEnvironments, item: op.Item) {
        const { title, vault } = item;
        this.command.info(`Updating 1Password item ${title} in vault ${vault.name}`);
        // TODO: remove fields in the item????

        try {
            const assignments = this.buildFieldAssignments(environments);

            const { id } = op.item.edit(item.id, assignments);

            this.command.success(`Updated 1Password item "${title}" in vault "${vault.name}"`);
            return id;
        } catch (err) {
            this.command.failed((err as Error).message);

            const error: PrettyPrintableError = {
                message: 'Failed to update 1Password item',
            };
            throw error;
        }
    }

    upsertItem(environments: BrunoEnvironments, options: OnePasswordOptions) {
        const { title, vault } = options;

        let item: op.Item | undefined = undefined;

        try {
            item = op.item.get(title, { vault }) as op.Item;
        } catch (err) {
            const isItemNotExistError = (err as Error).message.includes(
                `"${title}" isn't an item in the "${vault}" vault.`
            );

            if (!isItemNotExistError) {
                this.command.failed((err as Error).message);
                const error: PrettyPrintableError = {
                    message: `Unable to get item "${title}" in vault "${vault}"`,
                };
                throw error;
            }
        }

        if (!item) {
            return this.createItem(environments, options);
        }

        return this.updateItem(environments, item);
    }

    verifyAccess(vault: string) {
        this.checkCli();

        try {
            op.vault.get(vault);
        } catch (err) {
            this.command.failed((err as Error).message);

            const error: PrettyPrintableError = {
                message: `Cannot access vault "${vault}"`,
                ref: 'https://support.1password.com/category/using-1password/',
                suggestions: [
                    'Ensure that you are signed in to 1Password CLI (run: op signin)',
                    `The vault "${vault}" exists and you have access to it`,
                ],
            };
            throw error;
        }
    }
}
