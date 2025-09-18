export interface BrunoEnvironment {
    name: string;
    variables: BrunoVariable[];
}

export interface BrunoVariable {
    name: string;
    value: string | undefined;
    enabled: boolean;
    isSecret: boolean;
}

export type BrunoConfig = Record<string, unknown> & {
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
    item: string;
}
