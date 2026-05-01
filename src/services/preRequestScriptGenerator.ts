import { execSync } from 'child_process';
import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';

export const START_MARKER = '// === START: 1Password Secret Management ===';
export const END_MARKER = '// === END: 1Password Secret Management ===';

const TEMPLATE_PATH = '../templates/preRequest.template';

export async function generatePreRequestScript(secretConfigDir: string) {
    const templatePath = path.resolve(import.meta.dirname, TEMPLATE_PATH);
    const template = await fs.readFile(templatePath, 'utf-8');

    const onePasswordBin = execSync('which op').toString().trim();

    const result = ejs.render(template, {
        secretConfigDir,
        onePasswordBin,
        startMarker: START_MARKER,
        endMarker: END_MARKER,
    });

    return result.trimEnd();
}

export function mergePreRequestScripts(existing: string, newScript: string) {
    const lines = existing.split('\n');

    const startIndex = lines.findIndex(line => line.trim() === START_MARKER);
    const endIndex = lines.findIndex(line => line.trim() === END_MARKER);

    if (startIndex < 0 && endIndex < 0) {
        return [newScript, existing].join('\n');
    }

    if (startIndex < endIndex) {
        lines.splice(startIndex, endIndex - startIndex + 1);
        return [newScript, lines.join('\n')].join('\n');
    }

    return null;
}
