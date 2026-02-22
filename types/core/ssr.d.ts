export function initSSR(): Promise<{
    document: any;
    window: any;
}>;
export function renderToString(tagName: string, attrs?: {
    [x: string]: string;
}): string;
export function renderToStream(tagName: string, attrs?: {
    [x: string]: string;
}): AsyncGenerator<string>;
export function destroySSR(): void;
//# sourceMappingURL=ssr.d.ts.map