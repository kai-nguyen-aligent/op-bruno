import chalk from 'chalk';
import fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { BrunoVariable } from '../types/index.js';

export class YamlExporter {
    async export(secrets: Map<string, BrunoVariable[]>, outputPath: string): Promise<void> {
        try {
            const yamlContent = yaml.dump(secrets, {
                indent: 2,
                lineWidth: -1,
                noRefs: true,
            });

            await fs.writeFile(outputPath, yamlContent, 'utf-8');
            console.log(chalk.green(`✓ Exported secrets to ${outputPath}`));

            // Log summary
            let totalSecrets = 0;
            for (const env of secrets.keys()) {
                totalSecrets += secrets.get(env)?.length || 0;
            }

            console.log(
                chalk.blue(`  Found ${totalSecrets} secrets across ${secrets.size} environment(s)`)
            );
        } catch (error) {
            throw new Error(`Failed to export secrets to YAML: ${error}`);
        }
    }
}
