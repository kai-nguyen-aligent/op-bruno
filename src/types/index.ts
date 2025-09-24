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

export interface OnePasswordTemplate {
    title: string;
    category: 'API_CREDENTIAL';
    fields: [
        { id: 'notesPlain'; type: 'STRING'; purpose: 'NOTES'; label: 'notesPlain'; value: string },
    ];
}
