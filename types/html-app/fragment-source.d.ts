export function fragmentSource(owner: Node): {
    url: string;
    chain: string[];
};
export function fragmentTemplate(document: Document, text: string, base: string): DocumentFragment;
export function importSource(owner: Element, source: string): {
    url: string;
    chain: string[];
};
export let fragmentSources: WeakMap<Node, {
    url: string;
    chain: string[];
}>;
//# sourceMappingURL=fragment-source.d.ts.map