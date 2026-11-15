export class ContextData {
    constructor(owner: import("./sym-context.js").SymContext);
    keys: Set<any>;
    bound: Set<any>;
    edited: Set<any>;
    pending: Map<string, Set<object>>;
    versions: Map<string, number>;
    revision: number;
    savedRevision: number | null;
    applying: boolean;
    owner: import("./sym-context.js").SymContext;
    setup(): void;
    incoming(values: Record<string, unknown>): void;
    selected(): any[];
    dirty(): boolean;
    changed(key: string, previous: unknown, value: unknown): void;
    intent(key: string, value: unknown): {
        remove: () => void;
    };
    snapshot(): {
        data: any;
        revision: number;
        versions: Map<any, number>;
    };
    acknowledge(revision: number, versions: Map<string, number>): void;
    invalidate(): void;
}
//# sourceMappingURL=context-data.d.ts.map