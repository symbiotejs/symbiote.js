export class PubSub<T extends Record<string, unknown>> {
    static "__#1@#warn"(actionName: string, prop: any): void;
    static "__#1@#processComputed"(): void;
    static registerCtx<S extends Record<string, unknown>>(schema: S, uid?: string | Symbol): PubSub<S>;
    static deleteCtx(uid: string | Symbol): void;
    static getCtx(uid: string | Symbol, notify?: boolean): PubSub<any>;
    constructor(schema: T);
    store: any;
    callbackMap: Record<keyof T, Set<(val: unknown) => void>>;
    read(prop: keyof T): any;
    private __computedMap;
    has(prop: string): any;
    add(prop: string, val: unknown, rewrite?: boolean): void;
    pub(prop: keyof T, val: unknown): void;
    get proxy(): T;
    multiPub(updObj: T): void;
    notify(prop: keyof T): void;
    sub(prop: keyof T, callback: (val: unknown) => void, init?: boolean): {
        remove: () => void;
        callback: (val: unknown) => void;
    };
    set uid(uid: string | Symbol);
    get uid(): string | Symbol;
    #private;
}
export namespace PubSub {
    let globalStore: Map<string | Symbol, PubSub<any>>;
}
export default PubSub;
//# sourceMappingURL=PubSub.d.ts.map