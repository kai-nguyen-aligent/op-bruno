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

        // script does not exist, add a whole new script
        if (!collection.script) {
            collection.script = { req: await this.generatePreRequestScript(secretsPath) };
            return collection;
        }

        // script exist but req does not exist, add req only
        if (!collection.script.req) {
            collection.script.req = await this.generatePreRequestScript(secretsPath);
            return collection;
        }

        // pre-request script exist, merge scripts
        console.warn(chalk.yellow('⚠️ WARNING: Pre-request script already exists!'));
        console.warn(
            chalk.yellow(`   Please review the modifications at: ${this.collectionFilePath}`)
        );

        collection.script.req = this.mergePreRequestScripts(
            collection.script.req,
            await this.generatePreRequestScript(secretsPath)
        );

        return collection;
    }

    private mergePreRequestScripts(existing: string, newScript: string): string {
        if (!existing.includes(this.startMarker)) {
            return [this.startMarker, newScript, this.endMarker, existing].join('\n');
        }

        return existing;
    }

    private async generatePreRequestScript(secretConfigPath: string) {
        const templatePath = path.resolve(import.meta.dirname, this.templatePath);
        const template = await fs.readFile(templatePath, 'utf-8');
        return ejs.render(template, { secretConfigPath });
    }
}
