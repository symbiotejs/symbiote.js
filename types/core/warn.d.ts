export function warnMsg(code: number, ...args: any[]): void;
export function errMsg(code: number, ...args: any[]): void;
export function registerMessages(map: Map<number, (...args: any[]) => string>): void;
export let devState: {
    devMode: boolean;
};
//# sourceMappingURL=warn.d.ts.map