export function contextRequests(name: string): ContextRequests;
export function observeDataTarget(target: import("../core/parseProp.js").ParsedProp): import("./context-data.js").ContextData;
export class ContextRequests {
    constructor(owner: import("./sym-context.js").SymContext);
    ready: boolean;
    connected: boolean;
    loaded: boolean;
    scheduled: boolean;
    readController: AbortController | undefined;
    writeController: AbortController | undefined;
    saving: ReturnType<ContextRequests["performSync"]> | undefined;
    state: {
        loading: boolean;
        saving: boolean;
        loadError: ReturnType<typeof requestError> | null;
        syncError: ReturnType<typeof requestError> | null;
    };
    owner: import("./sym-context.js").SymContext;
    setup(): void;
    publish(): void;
    connect(): void;
    disconnect(): void;
    destroy(): void;
    configure(name: string): void;
    cancelRead(): void;
    cancelWrite(): void;
    scheduleLoad(): void;
    url(name: "src" | "sync"): string;
    fail(operation: "load" | "sync", failure: unknown): {
        ok: boolean;
        error: {
            operation: "load" | "sync";
            code: string;
            message: string;
            status: number;
        };
    };
    load(): Promise<{
        ok: boolean;
        error: {
            operation: "load" | "sync";
            code: string;
            message: string;
            status: number;
        };
    } | {
        ok: boolean;
        operation: string;
        applied: string[];
        retained: string[];
    } | {
        ok: boolean;
        cancelled: boolean;
    }>;
    sync(): Promise<{
        ok: boolean;
        error: {
            operation: "load" | "sync";
            code: string;
            message: string;
            status: number;
        };
    } | {
        ok: boolean;
        operation: string;
        revision: number;
        dirty: boolean;
    } | {
        ok: boolean;
        cancelled: boolean;
    }>;
    performSync(): Promise<{
        ok: boolean;
        error: {
            operation: "load" | "sync";
            code: string;
            message: string;
            status: number;
        };
    } | {
        ok: boolean;
        operation: string;
        revision: number;
        dirty: boolean;
    } | {
        ok: boolean;
        cancelled: boolean;
    }>;
}
declare function requestError(failure: unknown, operation: "load" | "sync"): {
    operation: "load" | "sync";
    code: string;
    message: string;
    status: number;
};
export {};
//# sourceMappingURL=context-requests.d.ts.map