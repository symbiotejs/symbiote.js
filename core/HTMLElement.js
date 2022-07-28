const isBrowser = () => typeof window !== 'undefined';

class HTMLElementStub {}

/** @type {typeof window.HTMLElement} */
export const HTMLElement = isBrowser() ? window.HTMLElement : /** @type {typeof window.HTMLElement} */ (HTMLElementStub);
