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

export interface BrunoConfig {
    version: string;
    name: string;
    type: string;
    scripts?: {
        filesystemAccess?: {
            allow: boolean;
        };
        preRequestScript?: string;
        postResponseScript?: string;
    };
}

export interface OnePasswordOptions {
    vault: string;
    title: string;
    category: string;
}
