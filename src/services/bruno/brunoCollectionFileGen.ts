import { PrettyPrintableError } from '@oclif/core/interfaces';
import { Collection, collectionBruToJson, jsonToCollectionBru } from '@usebruno/lang';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { BaseCommand } from '../../base-command.js';
import Sync from '../../commands/sync.js';
import { generatePreRequestScript, mergePreRequestScripts } from '../preRequestScriptGenerator.js';

export class BrunoCollectionFileGenerator {
    private readonly collectionFilePath: string;
    private readonly command: BaseCommand<typeof Sync>;

    constructor(collectionDir: string, command: BaseCommand<typeof Sync>) {
        this.collectionFilePath = path.join(collectionDir, 'collection.bru');
        this.command = command;
    }

    async upsertCollection(secretsPath: string) {
        const isCollectionFileExist = await fs.pathExists(this.collectionFilePath);

        const scriptCode = await generatePreRequestScript(secretsPath);

        const collection = isCollectionFileExist
            ? await this.modifyExistingCollection(scriptCode)
            : await this.createNewCollection(scriptCode);

        const content = jsonToCollectionBru(collection);
        await fs.writeFile(this.collectionFilePath, content, 'utf-8');
    }

    async createNewCollection(scriptCode: string) {
        const collection: Collection = {
            script: { req: scriptCode },
        };

        this.command.success('Created new collection.bru');
        return collection;
    }

    async modifyExistingCollection(scriptCode: string) {
        const content = await fs.readFile(this.collectionFilePath, 'utf-8');
        const collection = collectionBruToJson(content);

        // script does not exist, add new script
        if (!collection.script) {
            collection.script = { req: scriptCode };
            return collection;
        }

        // script exist but req does not exist, add req only
        if (!collection.script.req) {
            collection.script.req = scriptCode;
            return collection;
        }

        // both script and req exist, modify script.req
        this.command.warn('Pre-request script already exists!');
        this.command.log(
            chalk.yellow(`   Please review the modifications at: ${this.collectionFilePath}`)
        );

        const mergedReq = mergePreRequestScripts(collection.script.req, scriptCode);

        if (!mergedReq) {
            const error: PrettyPrintableError = {
                message: 'Malformed pre-request script',
                suggestions: [
                    `Please double check your pre-request script at: ${this.collectionFilePath}`,
                ],
            };
            throw error;
        }

        collection.script.req = mergedReq.trimEnd();

        this.command.success('Updated existing collection.bru');
        return collection;
    }
}
