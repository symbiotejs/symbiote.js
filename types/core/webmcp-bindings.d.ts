export function isToolDescriptor(value: any): boolean;
export namespace webMCPBindings {
    export function beforeRender(owner: any): void;
    export { collectMcpEventHandler as binding };
    export function bindingValue(value: any, owner: any, prop: any): any;
    export { mcpToolMode as preserveBindings };
}
export type MCPEventBinding = {
    prop: string;
    key: string;
    el: Element;
    sourceKey?: string;
    sourceOwner?: import("./Symbiote.js").Symbiote<any>;
};
declare function collectMcpEventHandler(owner: any, prop: any, key: any, el: any): void;
declare function mcpToolMode(owner: any): boolean;
export {};
//# sourceMappingURL=webmcp-bindings.d.ts.map