/**
 * Optional integrations register hooks without importing their implementation
 * into the core binding, component, or context modules.
 * @typedef {Object} Extension
 * @property {(owner: any) => void} [beforeRender]
 * @property {(owner: any) => void} [syncOwner]
 * @property {(owner: any) => void} [disconnectOwner]
 * @property {(owner: any, prop: string, key: string, el: Element) => void} [binding]
 * @property {(value: any, owner: any, prop: string) => any} [bindingValue]
 * @property {(owner: any) => boolean} [preserveBindings]
 * @property {(ctx: any, uid: string | Symbol) => void} [contextRegistered]
 * @property {(ctx: any, uid: string | Symbol) => void} [contextDeleted]
 * @property {(ctx: any, prop: any) => void} [contextChanged]
 */

/** @type {Map<string, Extension>} */
export const extensions = new Map();
