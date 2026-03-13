declare function fmt(code: string, body: string, doc: string, tag?: string): string | string[];
declare let isBrowser: boolean;
declare namespace S {
    let badge: string;
    let code: string;
    let errCode: string;
    let tag: string;
    let dim: string;
    let reset: string;
}
declare let DOCS: string;
declare let messages: Map<number, (...args: any[]) => (string | any[])>;
//# sourceMappingURL=devMessages.d.ts.map