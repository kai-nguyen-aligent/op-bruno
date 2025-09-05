import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { OnePasswordOptions, SecretMap } from '../types/index.js';

const execAsync = promisify(exec);

export class OnePasswordManager {
  async checkCLI(): Promise<boolean> {
    try {
      await execAsync('op --version');
      return true;
    } catch {
      console.warn(
        chalk.yellow(
          '⚠️  1Password CLI not found. Please install it from: https://developer.1password.com/docs/cli'
        )
      );
      return false;
    }
  }

  async createItem(
    secrets: SecretMap,
    options: OnePasswordOptions
  ): Promise<string | null> {
    const { vault, title, category } = options;

    // Check if CLI is available
    if (!(await this.checkCLI())) {
      return null;
    }

    console.log(
      chalk.blue(`📝 Creating 1Password item: ${title} in vault: ${vault}`)
    );

    try {
      // Build the fields JSON for 1Password
      const fields = this.buildFieldsJSON(secrets);

      // Create the item using 1Password CLI
      // Note: The actual command structure may need adjustment based on 1Password CLI version
      const command = `op item create --category="${category}" --title="${title}" --vault="${vault}" ${fields}`;

      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        console.error(chalk.red('Error creating 1Password item:'), stderr);
        return null;
      }

      console.log(
        chalk.green(`✓ Created 1Password item "${title}" in vault "${vault}"`)
      );

      // Extract and return the item ID from stdout if available
      const itemIdMatch = stdout.match(/ID:\s*([^\s]+)/);
      return itemIdMatch ? itemIdMatch[1] : title;
    } catch (error) {
      console.error(chalk.red('Failed to create 1Password item:'), error);
      return null;
    }
  }

  private buildFieldsJSON(secrets: SecretMap): string {
    const fields: string[] = [];

    // Create sections for each environment
    for (const [envName, envSecrets] of Object.entries(secrets)) {
      const sectionName = `${envName} Environment`;

      for (const [key, value] of Object.entries(envSecrets)) {
        // Format: section.field=value
        fields.push(`'${sectionName}.${key}[password]=${value}'`);
      }
    }

    return fields.join(' ');
  }

  async updateItem(
    itemName: string,
    vault: string,
    secrets: SecretMap
  ): Promise<boolean> {
    // Check if CLI is available
    if (!(await this.checkCLI())) {
      return false;
    }

    console.log(
      chalk.blue(`📝 Updating 1Password item: ${itemName} in vault: ${vault}`)
    );

    try {
      // Build update commands for each field
      const updates: string[] = [];

      for (const [envName, envSecrets] of Object.entries(secrets)) {
        const sectionName = `${envName} Environment`;

        for (const [key, value] of Object.entries(envSecrets)) {
          updates.push(
            `op item edit "${itemName}" --vault="${vault}" '${sectionName}.${key}[password]=${value}'`
          );
        }
      }

      // Execute all updates
      for (const updateCmd of updates) {
        await execAsync(updateCmd);
      }

      console.log(
        chalk.green(
          `✓ Updated 1Password item "${itemName}" in vault "${vault}"`
        )
      );
      return true;
    } catch (error) {
      console.error(chalk.red('Failed to update 1Password item:'), error);
      return false;
    }
  }

  async verifyAccess(vault: string): Promise<boolean> {
    try {
      // Try to list items in the vault to verify access
      const { stdout } = await execAsync(
        `op item list --vault="${vault}" --limit=1`
      );
      return true;
    } catch (error) {
      console.error(
        chalk.red(`Cannot access vault "${vault}". Please ensure:`)
      );
      console.error(
        chalk.yellow('  1. You are signed in to 1Password CLI (run: op signin)')
      );
      console.error(
        chalk.yellow(
          `  2. The vault "${vault}" exists and you have access to it`
        )
      );
      return false;
    }
  }
}
