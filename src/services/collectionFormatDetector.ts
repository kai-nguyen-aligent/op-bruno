import fs from 'fs-extra';
import path from 'path';
import { CollectionFormat } from '../types/index.js';

export async function detectCollectionFormat(collectionDir: string): Promise<CollectionFormat> {
    const hasBrunoJson = await fs.pathExists(path.join(collectionDir, 'bruno.json'));
    const hasOpenCollection = await fs.pathExists(path.join(collectionDir, 'opencollection.yml'));

    if (hasBrunoJson && hasOpenCollection) {
        throw new Error(
            `Both bruno.json and opencollection.yml found in ${collectionDir}. Please remove one to avoid ambiguity.`
        );
    }

    if (hasOpenCollection) return 'yaml';
    if (hasBrunoJson) return 'bru';

    throw new Error(
        `No bruno.json or opencollection.yml found in ${collectionDir}. Is this a valid Bruno collection?`
    );
}
