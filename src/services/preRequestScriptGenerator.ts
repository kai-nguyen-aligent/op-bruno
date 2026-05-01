import { execSync } from 'child_process';
import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';

export const START_MARKER = '// === START: 1Password Secret Management ===';
export const END_MARKER = '// === END: 1Password Secret Management ===';

const TEMPLATE_PATH = '../templates/preRequest.template';

export async function generatePreRequestScript(secretConfigPath: string) {
    const templatePath = path.resolve(import.meta.dirname, TEMPLATE_PATH);
    const template = await fs.readFile(templatePath, 'utf-8');

    const onePasswordBin = execSync('which op').toString().trim();

    const result = ejs.render(template, {
        secretConfigPath,
        onePasswordBin,
        startMarker: START_MARKER,
        endMarker: END_MARKER,
    });

    return result.trimEnd();
}
