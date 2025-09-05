import fs from 'fs-extra';
import * as path from 'path';
import { BrunoEnvironment, BrunoVariable, SecretMap } from '../types/index.js';

export class BrunoParser {
  private brunoDir: string;

  constructor(brunoDir: string) {
    this.brunoDir = brunoDir;
  }

  async parseEnvironments(): Promise<BrunoEnvironment[]> {
    const environmentsPath = path.join(this.brunoDir, 'environments');

    if (!(await fs.pathExists(environmentsPath))) {
      throw new Error(`No environments directory found at ${environmentsPath}`);
    }

    const files = await fs.readdir(environmentsPath);
    const bruFiles = files.filter(f => f.endsWith('.bru'));

    const environments: BrunoEnvironment[] = [];

    for (const file of bruFiles) {
      const filePath = path.join(environmentsPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const env = this.parseBruEnvironmentFile(
        content,
        path.basename(file, '.bru')
      );
      environments.push(env);
    }

    return environments;
  }

  private parseBruEnvironmentFile(
    content: string,
    name: string
  ): BrunoEnvironment {
    const lines = content.split('\n');
    const variables: BrunoVariable[] = [];

    let inVarsSection = false;
    let currentVar: Partial<BrunoVariable> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === 'vars {') {
        inVarsSection = true;
        continue;
      }

      if (trimmed === '}' && inVarsSection) {
        inVarsSection = false;
        continue;
      }

      if (inVarsSection) {
        // Parse variable line
        // Format can be: key: value or key: value ~type or with secret flag
        const match = trimmed.match(/^(\w+):\s*(.*)$/);
        if (match) {
          const [, key, valueAndFlags] = match;

          // Check for secret flag
          const isSecret = valueAndFlags.includes('~secret');

          // Extract the actual value
          let value = valueAndFlags;
          if (isSecret) {
            value = valueAndFlags.replace(/\s*~secret\s*/, '');
          }

          variables.push({
            name: key,
            value: value,
            enabled: true,
            secret: isSecret,
          });
        }
      }

      // Also check for vars:secret section
      if (trimmed === 'vars:secret {') {
        inVarsSection = true;
        currentVar = { secret: true };
        continue;
      }
    }

    return {
      name,
      variables,
    };
  }

  async extractSecrets(): Promise<SecretMap> {
    const environments = await this.parseEnvironments();
    const secretMap: SecretMap = {};

    for (const env of environments) {
      const secrets = env.variables.filter(v => v.secret);

      if (secrets.length > 0) {
        secretMap[env.name] = {};
        for (const secret of secrets) {
          secretMap[env.name][secret.name] = secret.value;
        }
      }
    }

    return secretMap;
  }
}
