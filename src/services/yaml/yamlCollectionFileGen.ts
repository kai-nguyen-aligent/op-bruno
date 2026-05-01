import { PrettyPrintableError } from '@oclif/core/interfaces';
import chalk from 'chalk';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { BaseCommand } from '../../base-command.js';
import Sync from '../../commands/sync.js';
import { CollectionFileGenerator, OpenCollectionConfig, RuntimeScript } from '../../types/index.js';
import { generatePreRequestScript, mergePreRequestScripts } from '../preRequestScriptGenerator.js';

export class YamlCollectionFileGenerator implements CollectionFileGenerator {
    private readonly collectionFilePath: string;
    private readonly command: BaseCommand<typeof Sync>;

    constructor(collectionDir: string, command: BaseCommand<typeof Sync>) {
        this.collectionFilePath = path.join(collectionDir, 'opencollection.yml');
        this.command = command;
    }

    async updateCollection(secretsPath: string): Promise<void> {
        const isCollectionFileExist = await fs.pathExists(this.collectionFilePath);

        if (!isCollectionFileExist) {
            throw new Error(`No opencollection.yml found at ${this.collectionFilePath}`);
        }

        const content = await fs.readFile(this.collectionFilePath, 'utf-8');
        const originalConfig = yaml.load(content) as OpenCollectionConfig;

        if (!originalConfig) {
            throw new Error(`Invalid opencollection.yml at ${this.collectionFilePath}`);
        }

        const scriptCode = await generatePreRequestScript(secretsPath);
        const existingBeforeRequest =
            originalConfig.runtime?.scripts?.findIndex(s => s.type === 'before-request') ?? -1;

        const config =
            existingBeforeRequest >= 0
                ? this.modifyExistingBeforeRequest(
                      originalConfig,
                      existingBeforeRequest,
                      scriptCode
                  )
                : this.addNewRuntimeScript(originalConfig, scriptCode);

        const output = yaml.dump(config, { lineWidth: -1, noRefs: true });
        await fs.writeFile(this.collectionFilePath, output, 'utf-8');
    }

    private addNewRuntimeScript(config: OpenCollectionConfig, scriptCode: string) {
        const script: RuntimeScript = {
            type: 'before-request',
            code: scriptCode,
        };

        if (!config.runtime) {
            config.runtime = { scripts: [] };
        }

        if (!config.runtime.scripts) {
            config.runtime.scripts = [];
        }

        config.runtime.scripts.push(script);

        this.command.success('Added new before-request script to opencollection.yml');
        return config;
    }

    private modifyExistingBeforeRequest(
        config: OpenCollectionConfig,
        existingIndex: number,
        scriptCode: string
    ) {
        this.command.warn('Pre-request script already exists!');
        this.command.log(
            chalk.yellow(`   Please review the modifications at: ${this.collectionFilePath}`)
        );

        const existingScript = config.runtime!.scripts![existingIndex]!;
        const mergedCode = mergePreRequestScripts(existingScript.code, scriptCode);

        if (!mergedCode) {
            const error: PrettyPrintableError = {
                message: 'Malformed pre-request script',
                suggestions: [
                    `Please double check your pre-request script at: ${this.collectionFilePath}`,
                ],
            };
            throw error;
        }

        config.runtime!.scripts![existingIndex] = {
            type: 'before-request',
            code: mergedCode.trimEnd(),
        };
        this.command.success('Updated existing before-request script in opencollection.yml');
        return config;
    }
}
