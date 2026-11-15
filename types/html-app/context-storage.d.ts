export let storageSignals: readonly string[];
export class ContextStorage {
    constructor(owner: import("./sym-context.js").SymContext);
    connected: boolean;
    key: string;
    fields: any[];
    baseline: string | null | undefined;
    savedVersions: Map<string, number>;
    restored: Set<string>;
    conflict: boolean;
    error: {
        operation: string;
        code: string;
        message: string;
        status: null;
    } | null;
    controller: AbortController | undefined;
    saving: ReturnType<ContextStorage["performPersist"]> | undefined;
    scheduled: boolean;
    owner: import("./sym-context.js").SymContext;
    status(): {
        storageDirty: boolean;
        storageConflict: boolean;
        storageError: {
            operation: string;
            code: string;
            message: string;
            status: null;
        };
        storageErrorMessage: string;
    };
    connect(): void;
    disconnect(): void;
    configure(): void;
    schedule(): void;
    reset(): void;
    onStorage: (event: StorageEvent) => void;
    storage(): Storage;
    envelope(raw: string | null): Record<string, any>;
    restore(replace?: boolean): {
        ok: boolean;
        error: {
            operation: string;
            code: string;
            message: string;
            status: any;
        };
    } | {
        ok: boolean;
        operation: string;
        found: boolean;
        applied: string[];
        retained: any[];
    } | {
        ok: boolean;
        cancelled: boolean;
    };
    requireConfig(): void;
    persist(overwrite?: boolean): Promise<{
        ok: boolean;
        operation: string;
        revision: number;
    } | {
        ok: boolean;
        error: {
            operation: string;
            code: string;
            message: string;
            status: any;
        };
    } | {
        ok: boolean;
        cancelled: boolean;
    }>;
    performPersist(overwrite: boolean): Promise<{
        ok: boolean;
        operation: string;
        revision: number;
    } | {
        ok: boolean;
        error: {
            operation: string;
            code: string;
            message: string;
            status: any;
        };
    } | {
        ok: boolean;
        cancelled: boolean;
    }>;
    fail(operation: string, failure: unknown): {
        ok: boolean;
        error: {
            operation: string;
            code: string;
            message: string;
            status: any;
        };
    };
}
//# sourceMappingURL=context-storage.d.ts.map