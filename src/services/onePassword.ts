import * as op from '@1password/op-js';
import chalk from 'chalk';
import { BrunoVariable, OnePasswordOptions, OnePasswordTemplate } from '../types/index.js';

export class OnePasswordManager {
    private buildFieldAssignments(secrets: Map<string, BrunoVariable[]>) {
        const assignments: op.FieldAssignment[] = [];

        secrets.forEach((value, key) => {
            const fields: op.FieldAssignment[] = value.map(val => {
                return [`${key}/${val.name}`, 'concealed', 'to-be-replaced-with-real-secret'];
            });
            assignments.push(...fields);
        });

        return assignments;
    }

    checkCli() {
        op.validateCli().catch(error => {
            console.error(chalk.yellow('⚠️ Unable to access 1Password CLI:', error));
            console.error(
                chalk.yellow('⚠️ Please install it from: https://developer.1password.com/docs/cli')
            );
            return false;
        });
        return true;
    }

    verifyAccess(vault: string) {
        try {
            op.vault.get(vault);
            return true;
        } catch {
            console.error(chalk.red(`Cannot access vault "${vault}". Please ensure:`));
            console.error(chalk.yellow('  1. You are signed in to 1Password CLI (run: op signin)'));
            console.error(
                chalk.yellow(`  2. The vault "${vault}" exists and you have access to it`)
            );
            return false;
        }
    }

    createItem(secrets: Map<string, BrunoVariable[]>, options: OnePasswordOptions) {
        if (!this.checkCli()) {
            return null;
        }

        const { vault, title } = options;
        console.log(chalk.blue(`📝 Creating 1Password item: ${title} in vault: ${vault}`));

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
            const assignments = this.buildFieldAssignments(secrets);

            const item = op.item.create(assignments, {
                vault,
                title,
                template: JSON.stringify(template),
            });

            console.log(chalk.green(`✓ Created 1Password item "${title}" in vault "${vault}"`));
            return item.id;
        } catch (error) {
            console.error(chalk.red('Failed to create 1Password item:'), error);
            return null;
        }
    }

    updateItem(secrets: Map<string, BrunoVariable[]>, options: OnePasswordOptions) {
        if (!this.checkCli()) {
            return false;
        }

        const { vault, title } = options;
        console.log(chalk.blue(`📝 Updating 1Password item ${title} in vault ${vault}`));

        // TODO: get item information
        // Update by add or remove fields in the item

        return true;

        // try {
        //     // Build update commands for each field
        //     const updates: string[] = [];

        //     for (const [envName, envSecrets] of Object.entries(secrets)) {
        //         const sectionName = `${envName} Environment`;

        //         for (const [key, value] of Object.entries(envSecrets)) {
        //             updates.push(
        //                 `op item edit "${title}" --vault="${vault}" '${sectionName}.${key}[password]=${value}'`
        //             );
        //         }
        //     }

        //     // Execute all updates
        //     for (const updateCmd of updates) {
        //         await execAsync(updateCmd);
        //     }

        //     console.log(chalk.green(`✓ Updated 1Password item "${itemName}" in vault "${vault}"`));
        //     return true;
        // } catch (error) {
        //     console.error(chalk.red('Failed to update 1Password item:'), error);
        //     return false;
        // }
    }
}
