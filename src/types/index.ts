import type { Variable } from '@usebruno/lang';

// Bruno configuration types
export type BrunoConfig = Record<string, unknown> & {
    name: string;
    scripts?: {
        moduleWhitelist?: string[];
        filesystemAccess?: {
            allow: boolean;
        };
    };
};

// Open Collection (YAML-based) environment and configuration types
export interface OpenCollectionVariable {
    name: string;
    value: string;
    enabled: boolean;
    secret: boolean;
    type?: string;
}

export interface OpenCollectionEnvironment {
    name?: string;
    variables?: OpenCollectionVariable[];
}

export interface RuntimeScript {
    type: string;
    code: string;
}

export interface OpenCollectionConfig {
    opencollection?: string;
    info?: {
        name?: string;
        [key: string]: unknown;
    };
    scripts?: {
        moduleWhitelist?: string[];
        filesystemAccess?: {
            allow: boolean;
        };
    };
    runtime?: {
        scripts?: RuntimeScript[];
        [key: string]: unknown;
    };
}

// 1Password integration options
export interface OnePasswordOptions {
    vault: string;
    title: string;
}

// Collection format discriminator
export type CollectionFormat = 'bru' | 'yaml';

// Service interfaces for parsing and managing collections

export type Environments = Record<string, Variable[]>;
export interface EnvironmentParser {
    parseEnvironments(): Promise<Environments>;
}

export interface ConfigManager {
    getName(): Promise<string>;
    updateConfig(): Promise<void>;
}

export interface CollectionFileGenerator {
    updateCollection(secretsPath: string): Promise<void>;
}
