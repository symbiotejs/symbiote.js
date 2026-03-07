export function setupItemize<T extends import("./Symbiote.js").Symbiote<any>>(fr: DocumentFragment, fnCtx: T, handler: (desc: ItemizeDescriptor) => void): void;
export type ItemizeDescriptor = {
    el: Element;
    itemClass: any;
    repeatDataKey: string;
    clientSSR: boolean;
};
//# sourceMappingURL=itemizeSetup.d.ts.map