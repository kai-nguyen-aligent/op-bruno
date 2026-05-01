import type { Variable } from '@usebruno/lang';

export type BrunoEnvironments = Record<string, Variable[]>;

export type BrunoConfig = Record<string, unknown> & {
    name: string;
    scripts?: {
        moduleWhitelist?: string[];
        filesystemAccess?: {
            allow: boolean;
        };
    };
};

export interface OnePasswordOptions {
    vault: string;
    title: string;
}

export type CollectionFormat = 'bru' | 'yaml';

export interface EnvironmentParser {
    parseEnvironments(): Promise<BrunoEnvironments>;
}

export interface ConfigManager {
    getName(): Promise<string>;
    updateConfig(): Promise<void>;
}

export interface CollectionFileGenerator {
    upsertCollection(secretsPath: string): Promise<void>;
}
