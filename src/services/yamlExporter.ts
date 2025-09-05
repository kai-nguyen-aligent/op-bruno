import chalk from 'chalk';
import fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { SecretMap } from '../types/index.js';

export class YamlExporter {
  async export(secrets: SecretMap, outputPath: string): Promise<void> {
    try {
      const yamlContent = yaml.dump(secrets, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });

      await fs.writeFile(outputPath, yamlContent, 'utf-8');
      console.log(chalk.green(`✓ Exported secrets to ${outputPath}`));

      // Log summary
      const envCount = Object.keys(secrets).length;
      let totalSecrets = 0;
      for (const env in secrets) {
        totalSecrets += Object.keys(secrets[env]).length;
      }

      console.log(
        chalk.blue(
          `  Found ${totalSecrets} secrets across ${envCount} environment(s)`
        )
      );
    } catch (error) {
      throw new Error(`Failed to export secrets to YAML: ${error}`);
    }
  }
}
