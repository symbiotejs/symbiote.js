export function sourceURL(source: string, base: string): string;
export function requestLimits(owner: Element): {
    timeout: number;
    maxBytes: number;
};
export function fetchSource(url: string, options: {
    signal: AbortSignal;
    timeout: number;
    maxBytes: number;
    method?: string;
    body?: string;
}): Promise<{
    text: string;
    status: number;
    contentType: string;
}>;
export function parseResponseJSON(response: Awaited<ReturnType<typeof fetchSource>>): any;
export class SourceError extends Error {
    constructor(code: string, message: string, status?: number | null);
    code: string;
    status: number;
}
//# sourceMappingURL=fetch-source.d.ts.map