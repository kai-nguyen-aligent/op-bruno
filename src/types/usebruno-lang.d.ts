declare module '@usebruno/lang' {
    export interface Collection {
        script?: { req?: string; res?: string };
        [key: string]: unknown;
    }

    export interface Variable {
        name: string;
        value: string;
        enabled: boolean;
        secret: boolean;
    }

    export interface Environment {
        variables: Variable[];
    }

    export function collectionBruToJson(input: string): Collection;
    export function jsonToCollectionBru(obj: Collection): string;

    export function bruToEnvJsonV2(input: string): Environment;
}
