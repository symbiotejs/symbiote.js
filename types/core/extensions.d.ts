export const extensions: Map<string, Extension>;
export type Extension = {
    beforeRender?: (owner: any) => void;
    syncOwner?: (owner: any) => void;
    disconnectOwner?: (owner: any) => void;
    binding?: (owner: any, prop: string, key: string, el: Element) => void;
    bindingValue?: (value: any, owner: any, prop: string) => any;
    preserveBindings?: (owner: any) => boolean;
    contextRegistered?: (ctx: any, uid: string | Symbol) => void;
    contextDeleted?: (ctx: any, uid: string | Symbol) => void;
    contextChanged?: (ctx: any, prop: any) => void;
};
//# sourceMappingURL=extensions.d.ts.map