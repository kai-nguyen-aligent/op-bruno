declare module '@usebruno/lang' {
    export function collectionBruToJson(input: string): Collection;
    export function jsonToCollectionBru(obj: Collection): string;

    export interface Collection {
        script?: { req?: string; res?: string };
        [key: string]: unknown;
    }
}
