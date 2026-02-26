export class SSR {
    static init(): Promise<{
        document: any;
        window: any;
    }>;
    static destroy(): void;
    static processHtml(html: string): Promise<string>;
    static renderToString(tagName: string, attrs?: {
        [x: string]: string;
    }): string;
    static renderToStream(tagName: string, attrs?: {
        [x: string]: string;
    }): AsyncGenerator<string>;
}
export default SSR;
//# sourceMappingURL=SSR.d.ts.map