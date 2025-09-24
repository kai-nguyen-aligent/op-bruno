import { Collection, collectionBruToJson, jsonToCollectionBru } from '@usebruno/lang';
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

        const content = jsonToCollectionBru(collection);
        await fs.writeFile(this.collectionFilePath, content, 'utf-8');
    }

    async createNewCollection(secretsPath: string) {
        console.log(chalk.blue('ℹ️ Creating new collection.bru'));

        const collection: Collection = {
            script: { req: await this.generatePreRequestScript(secretsPath) },
        };

        return collection;
    }

    async modifyExistingCollection(secretsPath: string) {
        console.log(chalk.blue('ℹ️ Modifying existing collection.bru'));

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
        console.warn(chalk.yellow('⚠️ WARNING: Pre-request script already exists!'));
        console.warn(
            chalk.yellow(`   Please review the modifications at: ${this.collectionFilePath}`)
        );

        collection.script.req = this.mergePreRequestScripts(collection.script.req, req);
        return collection;
    }

    private mergePreRequestScripts(existing: string, newScript: string): string {
        // if existing script already has the start marker, do not update
        return existing.includes(this.startMarker) ? existing : [newScript, existing].join('\n');
    }

    private async generatePreRequestScript(secretConfigPath: string) {
        const templatePath = path.resolve(import.meta.dirname, this.templatePath);
        const template = await fs.readFile(templatePath, 'utf-8');
        return ejs.render(template, { secretConfigPath });
    }
}
