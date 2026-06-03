export function registerWebMCPTool(owner: any, key: string, descriptor: ToolDescriptor): (WebMCPRegistryEntry & {
    controller: AbortController | null;
}) | Promise<WebMCPRegistryEntry & {
    controller: AbortController | null;
}>;
export function syncWebMCPTools(owner: any): void;
export function unregisterWebMCPTools(owner: any): void;
export function getActiveWebMCPTools(): WebMCPRegistryEntry[];
export function installWebMCP(SymbioteClass?: typeof Symbiote): void;
export class ToolDescriptor {
    constructor(options?: ToolDescriptorOptions);
    name: string;
    description: string | ((owner?: any) => string);
    inputSchema: any;
    fn: (args?: any, owner?: any, event?: Event) => any;
    when: () => boolean;
    deps: string[];
    exposedTo: string[];
    annotations: any;
    execute(args?: any, owner?: any, event?: Event): any;
}
export const webMCPRegistry: PubSub<any>;
declare namespace _default {
    export { ToolDescriptor };
    export { installWebMCP };
    export { webMCPRegistry };
    export { registerWebMCPTool };
    export { unregisterWebMCPTools };
    export { syncWebMCPTools };
    export { getActiveWebMCPTools };
}
export default _default;
export type WebMCPToolResultText = {
    type: "text";
    text: string;
};
export type WebMCPToolResult = {
    content?: WebMCPToolResultText[];
    isError?: boolean;
};
export type ToolDescriptorOptions = {
    name?: string;
    description?: string | ((owner?: any) => string);
    inputSchema?: any | ((owner?: any) => any);
    execute?: (args?: any, owner?: any, event?: Event) => any;
    when?: () => boolean;
    deps?: string[];
    exposedTo?: string[];
    annotations?: any;
};
export type WebMCPRegistryEntry = {
    name: string;
    key: string;
    ownerId: string;
    ownerType: "component" | "context";
    ownerName: string;
    componentDescription: string;
    description: string;
    inputSchema: any;
    active: boolean;
    nativeActive: boolean;
};
import Symbiote from './Symbiote.js';
import PubSub from './PubSub.js';
//# sourceMappingURL=webmcp.d.ts.map