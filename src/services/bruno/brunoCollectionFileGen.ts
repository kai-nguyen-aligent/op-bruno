import { Collection, collectionBruToJson, jsonToCollectionBru } from '@usebruno/lang';
import chalk from 'chalk';
import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';
import { BaseCommand } from '../../base-command.js';
import Sync from '../../commands/sync.js';

export class BrunoCollectionFileGenerator {
    private readonly startMarker = '// === START: 1Password Secret Management ===';
    private readonly endMarker = '// === END: 1Password Secret Management ===';
    private readonly templatePath = '../../templates/preRequest.template';

    private readonly collectionFilePath: string;
    private readonly command: BaseCommand<typeof Sync>;

    constructor(collectionDir: string, command: BaseCommand<typeof Sync>) {
        this.collectionFilePath = path.join(collectionDir, 'collection.bru');
        this.command = command;
    }

    async upsertCollection(secretsPath: string) {
        const isCollectionFileExist = await fs.pathExists(this.collectionFilePath);

        const collection = isCollectionFileExist
            ? await this.modifyExistingCollection(secretsPath)
            : await this.createNewCollection(secretsPath);

        if (!collection) {
            this.command.error('Error while processing collection.bru');
            return;
        }

        const content = jsonToCollectionBru(collection);
        await fs.writeFile(this.collectionFilePath, content, 'utf-8');
    }

    async createNewCollection(secretsPath: string) {
        const collection: Collection = {
            script: { req: await this.generatePreRequestScript(secretsPath) },
        };

        this.command.success('Created new collection.bru');
        return collection;
    }

    async modifyExistingCollection(secretsPath: string) {
        const content = await fs.readFile(this.collectionFilePath, 'utf-8');
        const collection = collectionBruToJson(content);

        const req = await this.generatePreRequestScript(secretsPath);

        // script does not exist, add new script
        if (!collection.script) {
            collection.script = { req };
            return collection;
        }

        // script exist but req does not exist, add req only
        if (!collection.script.req) {
            collection.script.req = req;
            return collection;
        }

        // both script and req exist, modify script.req
        this.command.warn('Pre-request script already exists!');
        this.command.log(
            chalk.yellow(`   Please review the modifications at: ${this.collectionFilePath}`)
        );

        const mergedReq = this.mergePreRequestScripts(collection.script.req, req);

        if (!mergedReq) {
            this.command.error('Malformed pre-request script', {
                suggestions: [
                    `Please double check your pre-request script at: ${this.collectionFilePath}`,
                ],
            });
            return;
        }

        collection.script.req = mergedReq.trimEnd();

        this.command.success('Updated existing collection.bru');
        return collection;
    }

    private mergePreRequestScripts(existing: string, newScript: string) {
        const lines = existing.split('\n');

        const startIndex = lines.findIndex(line => line.trim() === this.startMarker);
        const endIndex = lines.findIndex(line => line.trim() === this.endMarker);

        if (startIndex < 0 && endIndex < 0) {
            return [newScript, existing].join('\n');
        }

        if (startIndex < endIndex) {
            lines.splice(startIndex, endIndex - startIndex + 1);
            return [newScript, lines.join('\n')].join('\n');
        }

        return null;
    }

    private async generatePreRequestScript(secretConfigPath: string) {
        const templatePath = path.resolve(import.meta.dirname, this.templatePath);
        const template = await fs.readFile(templatePath, 'utf-8');
        const result = ejs.render(template, {
            secretConfigPath,
            startMarker: this.startMarker,
            endMarker: this.endMarker,
        });

        return result.trimEnd();
    }
}
