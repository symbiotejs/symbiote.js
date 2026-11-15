export function commitStorageRevision<T>(win: Window, change: RevisionChange & {
    signal: AbortSignal;
}, commit: () => T): Promise<T>;
export type RevisionChange = {
    key: string;
    expected: string | null | undefined;
    next: string | undefined;
    overwrite: boolean;
    signal?: AbortSignal;
};
//# sourceMappingURL=storage-revisions.d.ts.map