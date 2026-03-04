export class SSR {
    static init(): Promise<{
        document: any;
        window: any;
    }>;
    static destroy(): void;
    static processHtml(html: string, options?: {
        nonce?: string;
    }): Promise<string>;
    static renderToString(tagName: string, attrs?: {
        [x: string]: string;
    }, options?: {
        nonce?: string;
    }): string;
    static renderToStream(tagName: string, attrs?: {
        [x: string]: string;
    }, options?: {
        nonce?: string;
    }): AsyncGenerator<string>;
}
export default SSR;
//# sourceMappingURL=SSR.d.ts.map