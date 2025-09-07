import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';
import { generatePreRequestScript } from '../templates/preRequest.js';
import { CollectionFile, SecretMap } from '../types/index.js';

export class CollectionGenerator {
    private brunoDir: string;

    constructor(brunoDir: string) {
        this.brunoDir = brunoDir;
    }

    async updateCollection(secrets: SecretMap, itemName: string, vaultName: string): Promise<void> {
        const collectionPath = path.join(this.brunoDir, 'collection.bru');

        if (await fs.pathExists(collectionPath)) {
            await this.modifyExistingCollection(collectionPath, secrets, itemName, vaultName);
        } else {
            await this.createNewCollection(collectionPath, secrets, itemName, vaultName);
        }
    }

    private async modifyExistingCollection(
        collectionPath: string,
        secrets: SecretMap,
        itemName: string,
        vaultName: string
    ): Promise<void> {
        console.log(chalk.blue('ℹ️  Modifying existing collection.bru'));

        const content = await fs.readFile(collectionPath, 'utf-8');
        const collection = this.parseCollectionFile(content);

        // Check if pre-request script exists
        if (collection.script?.req) {
            console.warn(chalk.yellow('⚠️  WARNING: Pre-request script already exists!'));
            console.warn(chalk.yellow(`   Please review the modifications at: ${collectionPath}`));
            console.warn(
                chalk.yellow(
                    '   The existing script has been preserved and new secret management code added.'
                )
            );

            // Merge scripts
            collection.script.req = this.mergePreRequestScripts(
                collection.script.req,
                generatePreRequestScript(secrets, itemName, vaultName)
            );
        } else {
            // Add new pre-request script
            if (!collection.script) {
                collection.script = {};
            }
            collection.script.req = generatePreRequestScript(secrets, itemName, vaultName);
        }

        // Write back modified collection
        const newContent = this.serializeCollectionFile(collection);
        await fs.writeFile(collectionPath, newContent, 'utf-8');

        console.log(chalk.green('✓ Updated collection.bru with pre-request script'));
    }

    private async createNewCollection(
        collectionPath: string,
        secrets: SecretMap,
        itemName: string,
        vaultName: string
    ): Promise<void> {
        console.log(chalk.blue('ℹ️  Creating new collection.bru'));

        const collection: CollectionFile = {
            meta: {
                name: path.basename(this.brunoDir),
                type: 'collection',
            },
            script: {
                req: generatePreRequestScript(secrets, itemName, vaultName),
            },
        };

        const content = this.serializeCollectionFile(collection);
        await fs.writeFile(collectionPath, content, 'utf-8');

        console.log(chalk.green('✓ Created collection.bru with pre-request script'));
    }

    private parseCollectionFile(content: string): CollectionFile {
        const collection: CollectionFile = {};
        const lines = content.split('\n');

        let currentSection: string | null = null;
        let scriptContent: string[] = [];
        let inScript = false;

        for (const line of lines) {
            const trimmed = line.trim();

            // Parse meta section
            if (trimmed === 'meta {') {
                currentSection = 'meta';
                collection.meta = {};
                continue;
            }

            // Parse script:pre-request section
            if (trimmed === 'script:pre-request {') {
                currentSection = 'script:pre-request';
                inScript = true;
                scriptContent = [];
                continue;
            }

            // Parse script:post-response section
            if (trimmed === 'script:post-response {') {
                currentSection = 'script:post-response';
                inScript = true;
                scriptContent = [];
                continue;
            }

            // Handle closing braces
            if (trimmed === '}') {
                if (currentSection === 'script:pre-request') {
                    if (!collection.script) collection.script = {};
                    collection.script.req = scriptContent.join('\n');
                    inScript = false;
                } else if (currentSection === 'script:post-response') {
                    if (!collection.script) collection.script = {};
                    collection.script.res = scriptContent.join('\n');
                    inScript = false;
                }
                currentSection = null;
                continue;
            }

            // Collect script content
            if (inScript) {
                scriptContent.push(line);
            }

            // Parse meta properties
            if (currentSection === 'meta') {
                const match = trimmed.match(/^(\w+):\s*(.*)$/);
                if (match && collection.meta) {
                    const [, key, value] = match;
                    collection.meta[key as keyof typeof collection.meta] = value;
                }
            }
        }

        return collection;
    }

    private serializeCollectionFile(collection: CollectionFile): string {
        const lines: string[] = [];

        // Add meta section
        if (collection.meta) {
            lines.push('meta {');
            if (collection.meta.name) lines.push(`  name: ${collection.meta.name}`);
            if (collection.meta.type) lines.push(`  type: ${collection.meta.type}`);
            lines.push('}');
            lines.push('');
        }

        // Add pre-request script
        if (collection.script?.req) {
            lines.push('script:pre-request {');
            lines.push(collection.script.req);
            lines.push('}');
            lines.push('');
        }

        // Add post-response script
        if (collection.script?.res) {
            lines.push('script:post-response {');
            lines.push(collection.script.res);
            lines.push('}');
            lines.push('');
        }

        return lines.join('\n');
    }

    private mergePreRequestScripts(existing: string, newScript: string): string {
        // Check if the existing script already contains our marker
        if (existing.includes('=== START: 1Password Secret Management ===')) {
            // Replace the existing 1Password section with the new one
            const startMarker = '// === START: 1Password Secret Management ===';
            const endMarker = '// === END: 1Password Secret Management ===';

            const startIndex = existing.indexOf(startMarker);
            const endIndex = existing.indexOf(endMarker) + endMarker.length;

            if (startIndex !== -1 && endIndex !== -1) {
                return existing.substring(0, startIndex) + newScript + existing.substring(endIndex);
            }
        }

        // Otherwise, prepend the new script to the existing one
        return newScript + '\n\n// === Existing User Scripts ===\n' + existing;
    }
}
