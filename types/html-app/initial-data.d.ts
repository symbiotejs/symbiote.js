export function rememberDefaults(context: import("../core/PubSub.js").PubSub<any>, data: Record<string, unknown>): void;
export function isDataKey(key: string): boolean;
export function parseInitialData(text: string): any;
export function readInitialData(root: Element | DocumentFragment): any;
export function readTemplateData(owner: import("./BaseClass.js").BaseClass): any;
export function initialDataProcessor(root: Element | DocumentFragment, owner: import("./BaseClass.js").BaseClass): void;
export let initialDefaults: WeakMap<import("../core/PubSub.js").PubSub<any>, Record<string, unknown>>;
//# sourceMappingURL=initial-data.d.ts.map