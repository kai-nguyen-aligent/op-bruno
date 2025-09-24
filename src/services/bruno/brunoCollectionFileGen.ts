import { Command } from '@oclif/core';
import { Collection, collectionBruToJson, jsonToCollectionBru } from '@usebruno/lang';
import chalk from 'chalk';
import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';

export class BrunoCollectionFileGenerator {
    private readonly startMarker = '// === START: 1Password Secret Management ===';
    private readonly endMarker = '// === END: 1Password Secret Management ===';
    private readonly templatePath = '../../templates/preRequest.template';

    private readonly collectionFilePath: string;
    private readonly command: Command;

    constructor(collectionDir: string, command: Command) {
        this.collectionFilePath = path.join(collectionDir, 'collection.bru');
        this.command = command;
    }

    async upsertCollection(secretsPath: string) {
        const isCollectionFileExist = await fs.pathExists(this.collectionFilePath);

        const collection = isCollectionFileExist
            ? await this.modifyExistingCollection(secretsPath)
            : await this.createNewCollection(secretsPath);

        const content = jsonToCollectionBru(collection);
        await fs.writeFile(this.collectionFilePath, content, 'utf-8');
    }

    async createNewCollection(secretsPath: string) {
        this.command.log(chalk.blue('ℹ️ Creating new collection.bru'));

        const collection: Collection = {
            script: { req: await this.generatePreRequestScript(secretsPath) },
        };

        return collection;
    }

    async modifyExistingCollection(secretsPath: string) {
        this.command.log(chalk.blue('ℹ️  Modifying existing collection.bru'));

        const content = await fs.readFile(this.collectionFilePath, 'utf-8');
        const collection = collectionBruToJson(content);

        const req = await this.generatePreRequestScript(secretsPath);

        console.log('REQ:', req.split('\n'));

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
        this.command.warn(chalk.yellow('⚠️ WARNING: Pre-request script already exists!'));
        this.command.warn(
            chalk.yellow(`   Please review the modifications at: ${this.collectionFilePath}`)
        );

        const mergedReq = this.mergePreRequestScripts(collection.script.req, req);

        if (!mergedReq) {
            this.command.error('Malformed pre-request script');
        }

        collection.script.req = mergedReq;
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
            const notSecretManagementLines = lines.splice(startIndex, endIndex - startIndex + 1);

            console.log('Removed lines:', notSecretManagementLines);
            console.log('Remaining lines:', lines);

            return [newScript, lines.join('\n')].join('\n');
        }

        return null;
    }

    private async generatePreRequestScript(secretConfigPath: string) {
        const templatePath = path.resolve(import.meta.dirname, this.templatePath);
        const template = await fs.readFile(templatePath, 'utf-8');
        return ejs.render(template, {
            secretConfigPath,
            startMarker: this.startMarker,
            endMarker: this.endMarker,
        });
    }
}
