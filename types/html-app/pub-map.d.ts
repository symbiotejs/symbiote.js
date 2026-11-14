export class PubMap {
    constructor(owner: import("./BaseClass.js").BaseClass);
    connected: boolean;
    queued: boolean;
    version: number;
    bindings: {
        target: string;
        source: string;
    }[];
    subscriptions: {
        remove(): void;
    }[];
    owner: import("./BaseClass.js").BaseClass;
    connect(): void;
    disconnect(): void;
    refresh(): void;
    schedule(): void;
}
//# sourceMappingURL=pub-map.d.ts.map