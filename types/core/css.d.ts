export function css(parts: TemplateStringsArray, ...props: any[]): CSSStyleSheet;
export namespace css {
    let processors: ((cssTxt: string) => string)[];
    function clearProcessors(): void;
    function useProcessor(...args: ((cssTxt: string) => string)[]): typeof css;
}
//# sourceMappingURL=css.d.ts.map