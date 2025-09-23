import chalk from 'chalk';
import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';

export class BrunoCollectionFileGenerator {
    private readonly startMarker = '// === START: 1Password Secret Management ===';
    private readonly endMarker = '// === END: 1Password Secret Management ===';
    private readonly templatePath = '../../templates/preRequestTemplate.js';

    private collectionFilePath: string;

    constructor(collectionDir: string) {
        this.collectionFilePath = path.join(collectionDir, 'collection.bru');
    }

    async upsertCollection(secretsPath: string) {
        const isCollectionFileExist = await fs.pathExists(this.collectionFilePath);

        const collection = isCollectionFileExist
            ? await this.modifyExistingCollection(secretsPath)
            : await this.createNewCollection(secretsPath);

        const content = this.serializeCollectionFile(collection);
        await fs.writeFile(this.collectionFilePath, content, 'utf-8');
    }

    private async createNewCollection(secretsPath: string) {
        console.log(chalk.blue('ℹ️ Creating new collection.bru'));

        const collection: Record<string, string> = {
            'script:pre-request': await this.generatePreRequestScript(secretsPath),
        };

        return collection;
    }

    private async modifyExistingCollection(secretsPath: string) {
        console.log(chalk.blue('ℹ️ Modifying existing collection.bru'));

        const content = await fs.readFile(this.collectionFilePath, 'utf-8');
        const collection = this.parseCollectionFile(content);

        // pre-request script does not exist, add new script
        if (!collection['script:pre-request']) {
            collection['script:pre-request'] = await this.generatePreRequestScript(secretsPath);
            return collection;
        }

        // pre-request script exist, merge scripts
        console.warn(chalk.yellow('⚠️ WARNING: Pre-request script already exists!'));
        console.warn(
            chalk.yellow(`   Please review the modifications at: ${this.collectionFilePath}`)
        );

        collection['script:pre-request'] = this.mergePreRequestScripts(
            collection['script:pre-request'],
            await this.generatePreRequestScript(secretsPath)
        );

        return collection;
    }

    private parseCollectionFile(content: string): Record<string, string> {
        const collection: Record<string, string> = {};
        const lines = content.split('\n');

        let inSection = false;
        let currentSection: string = '';
        const sectionContent: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.endsWith(' {')) {
                inSection = true;
                currentSection = trimmed.slice(0, -2);
                continue;
            }

            if (trimmed === '}' && inSection) {
                if (!currentSection) {
                    throw new Error(`Malformed collection file`);
                }
                collection[currentSection] = sectionContent.join('\n');
                currentSection = '';
                inSection = false;
                continue;
            }

            // Collect section content
            if (inSection) {
                sectionContent.push(line);
            }
        }

        return collection;
    }

    private mergePreRequestScripts(existing: string, newScript: string): string {
        if (!existing.includes(this.startMarker)) {
            return [this.startMarker, newScript, this.endMarker, existing].join('\n');
        }

        return existing;
    }

    private serializeCollectionFile(collection: Record<string, string>): string {
        const lines: string[] = [];

        for (const key in collection) {
            const value = collection[key];
            if (value) {
                lines.push(`${key} {`);
                lines.push(value);
                lines.push('}');
                lines.push('');
            }
        }

        return lines.join('\n');
    }

    private async generatePreRequestScript(secretConfigPath: string) {
        const templatePath = path.resolve(import.meta.dirname, this.templatePath);
        const template = await fs.readFile(templatePath, 'utf-8');
        return ejs.render(template, { secretConfigPath });
    }
}
