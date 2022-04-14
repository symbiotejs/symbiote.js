/** @typedef {import('../BaseComponent.js').BaseComponent} BaseComponent */

/**
 * @template {{}} [T=unknown] Default is `unknown`
 * @typedef {object} Subscribable
 * @property {(prop: string, handler: (value: T) => void) => void} sub
 */

/**
 * @template {Subscribable} [T=Subscribable] Default is `Subscribable`
 * @function
 * @typedef {(fr: DocumentFragment, fnCtx: T) => void} TplProcessor
 */

export {};
