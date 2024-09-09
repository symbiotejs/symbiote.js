export function html<T>(parts: TemplateStringsArray, ...props: ({
    [x: string]: string;
} | BindDescriptor | string | T)[]): string;
export const RESERVED_ATTRIBUTES: string[];
export default html;
export type BindDescriptor = Record<keyof import("./Symbiote.js").Symbiote<any>, string>;
//# sourceMappingURL=html.d.ts.map