/**
 * @module SSR
 * Server-side rendering for Symbiote.js components.
 * Requires `linkedom` as a peer dependency.
 *
 * Usage (basic):
 * ```js
 * import { SSR } from '@symbiotejs/symbiote/node/SSR.js';
 * await import('./my-component.js');
 * let html = await SSR.processHtml('<my-page><my-component></my-component></my-page>');
 * ```
 *
 * Usage (advanced):
 * ```js
 * import { SSR } from '@symbiotejs/symbiote/node/SSR.js';
 * await SSR.init();
 * await import('./my-component.js');
 * let html = SSR.renderToString('my-component', { title: 'Hello' });
 * SSR.destroy();
 * ```
 */

/**
 * Extract CSS text from a stylesheet (works with both CSSStyleSheet and SSR polyfill).
 * @param {CSSStyleSheet | {cssText: string}} sheet
 * @returns {string}
 */
function extractCSS(sheet) {
  if ('cssText' in sheet && typeof sheet.cssText === 'string') {
    return sheet.cssText;
  }
  let text = '';
  try {
    // @ts-ignore
    for (let rule of sheet.cssRules) {
      text += rule.cssText + '\n';
    }
  } catch {
    // Security restrictions on some stylesheets
  }
  return text;
}

/**
 * Serialize a custom element to HTML with DSD and rootStyles support.
 * @param {HTMLElement} el
 * @param {Set<Function>} emittedStyles - track which constructors already emitted rootStyles
 * @returns {string}
 */
function serializeElement(el, emittedStyles) {
  let tagName = el.localName;
  let attrsStr = serializeAttrs(el);
  let ctor = /** @type {any} */ (el).constructor;

  let innerContent = '';

  // Light DOM rootStyles — inject <style> (once per constructor):
  if (ctor.rootStyleSheets && !emittedStyles.has(ctor)) {
    emittedStyles.add(ctor);
    for (let sheet of ctor.rootStyleSheets) {
      let cssText = extractCSS(sheet);
      if (cssText) {
        innerContent += `<style>${cssText}</style>`;
      }
    }
  }

  // Declarative Shadow DOM:
  if (el.shadowRoot) {
    let shadowHTML = '';
    if (ctor.shadowStyleSheets) {
      for (let sheet of ctor.shadowStyleSheets) {
        let cssText = extractCSS(sheet);
        if (cssText) {
          shadowHTML += `<style>${cssText}</style>`;
        }
      }
    }
    for (let child of el.shadowRoot.childNodes) {
      shadowHTML += serializeNode(child, emittedStyles);
    }
    innerContent += `<template shadowrootmode="open">${shadowHTML}</template>`;
  }

  // Light DOM content:
  for (let child of el.childNodes) {
    innerContent += serializeNode(child, emittedStyles);
  }

  return `<${tagName}${attrsStr}>${innerContent}</${tagName}>`;
}

/**
 * Serialize attributes of an element.
 * @param {HTMLElement} el
 * @returns {string}
 */
function serializeAttrs(el) {
  let str = '';
  if (el.attributes) {
    for (let attr of el.attributes) {
      str += ` ${attr.name}="${attr.value}"`;
    }
  }
  return str;
}

/**
 * Serialize a DOM node to HTML string.
 * @param {Node} node
 * @param {Set<Function>} emittedStyles
 * @returns {string}
 */
function serializeNode(node, emittedStyles) {
  // Custom element — recurse:
  if (node.nodeType === 1 && /** @type {Element} */ (node).localName?.includes('-')) {
    return serializeElement(/** @type {HTMLElement} */ (node), emittedStyles);
  }
  // Regular element:
  if (node.nodeType === 1) {
    let el = /** @type {HTMLElement} */ (node);
    let attrsStr = serializeAttrs(el);
    let childHTML = '';
    for (let child of el.childNodes) {
      childHTML += serializeNode(child, emittedStyles);
    }
    return `<${el.localName}${attrsStr}>${childHTML}</${el.localName}>`;
  }
  // Text node:
  if (node.nodeType === 3) {
    return node.textContent || '';
  }
  // Comment:
  if (node.nodeType === 8) {
    return `<!--${node.textContent}-->`;
  }
  return '';
}

/**
 * Stream-serialize an element, yielding chunks.
 * @param {HTMLElement} el
 * @param {Set<Function>} emittedStyles
 * @returns {AsyncGenerator<string>}
 */
async function* streamElement(el, emittedStyles) {
  let tagName = el.localName;
  let attrsStr = serializeAttrs(el);
  let ctor = /** @type {any} */ (el).constructor;

  yield `<${tagName}${attrsStr}>`;

  // Light DOM rootStyles (once per constructor):
  if (ctor.rootStyleSheets && !emittedStyles.has(ctor)) {
    emittedStyles.add(ctor);
    for (let sheet of ctor.rootStyleSheets) {
      let cssText = extractCSS(sheet);
      if (cssText) {
        yield `<style>${cssText}</style>`;
      }
    }
  }

  // Declarative Shadow DOM:
  if (el.shadowRoot) {
    yield '<template shadowrootmode="open">';
    if (ctor.shadowStyleSheets) {
      for (let sheet of ctor.shadowStyleSheets) {
        let cssText = extractCSS(sheet);
        if (cssText) {
          yield `<style>${cssText}</style>`;
        }
      }
    }
    for (let child of el.shadowRoot.childNodes) {
      yield* streamNode(child, emittedStyles);
    }
    yield '</template>';
  }

  // Light DOM content:
  for (let child of el.childNodes) {
    yield* streamNode(child, emittedStyles);
  }

  yield `</${tagName}>`;
}

/**
 * Stream-serialize a DOM node.
 * @param {Node} node
 * @param {Set<Function>} emittedStyles
 * @returns {AsyncGenerator<string>}
 */
async function* streamNode(node, emittedStyles) {
  if (node.nodeType === 1 && /** @type {Element} */ (node).localName?.includes('-')) {
    yield* streamElement(/** @type {HTMLElement} */ (node), emittedStyles);
    return;
  }
  if (node.nodeType === 1) {
    let el = /** @type {HTMLElement} */ (node);
    let attrsStr = serializeAttrs(el);
    if (el.childNodes.length) {
      yield `<${el.localName}${attrsStr}>`;
      for (let child of el.childNodes) {
        yield* streamNode(child, emittedStyles);
      }
      yield `</${el.localName}>`;
    } else {
      yield `<${el.localName}${attrsStr}>${el.innerHTML}</${el.localName}>`;
    }
    return;
  }
  if (node.nodeType === 3) {
    yield node.textContent || '';
    return;
  }
  if (node.nodeType === 8) {
    yield `<!--${node.textContent}-->`;
  }
}

export class SSR {

  static #doc = null;
  static #win = null;

  /**
   * Initialize the SSR environment using linkedom.
   * Called automatically by processHtml(). Call manually only for renderToString/renderToStream.
   */
  static async init() {
    // @ts-ignore
    let { parseHTML } = /** @type {any} */ (await import('linkedom'));
    let { document, window, HTMLElement, customElements, DocumentFragment, NodeFilter, MutationObserver } = parseHTML('<!DOCTYPE html><html><head></head><body></body></html>');

    SSR.#doc = document;
    SSR.#win = window;

    // Polyfill CSSStyleSheet for linkedom:
    if (!window.CSSStyleSheet || !('replaceSync' in (window.CSSStyleSheet?.prototype || {}))) {
      class SSRStyleSheet {
        #cssText = '';
        replaceSync(text) {
          this.#cssText = text;
        }
        replace(text) {
          this.#cssText = text;
          return Promise.resolve(this);
        }
        get cssText() {
          return this.#cssText;
        }
        get cssRules() {
          return [];
        }
      }
      // @ts-ignore
      window.CSSStyleSheet = SSRStyleSheet;
      // @ts-ignore
      globalThis.CSSStyleSheet = SSRStyleSheet;
    }

    // Polyfill NodeFilter:
    let nodeFilter = NodeFilter || {
      SHOW_ALL: 0xFFFFFFFF,
      SHOW_ELEMENT: 0x1,
      SHOW_TEXT: 0x4,
      SHOW_COMMENT: 0x80,
      FILTER_ACCEPT: 1,
      FILTER_REJECT: 2,
      FILTER_SKIP: 3,
    };

    // Polyfill MutationObserver:
    let mutationObserver = MutationObserver || class {
      observe() {}
      disconnect() {}
      takeRecords() { return []; }
    };

    // Polyfill adoptedStyleSheets (linkedom doesn't support it):
    if (!document.adoptedStyleSheets) {
      document.adoptedStyleSheets = [];
    }

    // Patch globals:
    globalThis.__SYMBIOTE_SSR = true;
    globalThis.document = document;
    globalThis.window = window;
    globalThis.HTMLElement = HTMLElement;
    globalThis.customElements = customElements;
    globalThis.DocumentFragment = DocumentFragment;
    globalThis.NodeFilter = nodeFilter;
    globalThis.MutationObserver = mutationObserver;

    return { document, window };
  }

  /**
   * Clean up the SSR environment.
   * Called automatically by processHtml(). Call manually only after renderToString/renderToStream.
   */
  static destroy() {
    if (SSR.#doc) {
      SSR.#doc.body.innerHTML = '';
    }
    delete globalThis.__SYMBIOTE_SSR;
    delete globalThis.document;
    delete globalThis.window;
    delete globalThis.HTMLElement;
    delete globalThis.customElements;
    delete globalThis.DocumentFragment;
    delete globalThis.NodeFilter;
    delete globalThis.MutationObserver;
    delete globalThis.CSSStyleSheet;
    SSR.#doc = null;
    SSR.#win = null;
  }

  /**
   * Process an arbitrary HTML string, rendering all Symbiote components found within.
   * Initializes and destroys the SSR environment automatically.
   *
   * @param {string} html - Any HTML string containing custom element tags
   * @returns {Promise<string>} Processed HTML with rendered components
   *
   * @example
   * ```js
   * await import('./my-components.js');
   * let result = await SSR.processHtml('<div><my-header></my-header><main>content</main></div>');
   * ```
   */
  static async processHtml(html) {
    let autoInited = !SSR.#doc;
    if (autoInited) {
      await SSR.init();
    }
    SSR.#doc.body.innerHTML = html;
    let emittedStyles = new Set();
    let result = '';
    for (let child of SSR.#doc.body.childNodes) {
      result += serializeNode(child, emittedStyles);
    }
    SSR.#doc.body.innerHTML = '';
    if (autoInited) {
      SSR.destroy();
    }
    return result;
  }

  /**
   * Render a single Symbiote component to an HTML string.
   * Requires manual init()/destroy() lifecycle.
   *
   * @param {string} tagName - Custom element tag name
   * @param {Object<string, string>} [attrs] - Attributes to set on the element
   * @returns {string}
   */
  static renderToString(tagName, attrs = {}) {
    if (!SSR.#doc) {
      throw new Error('[Symbiote SSR] Call SSR.init() before renderToString()');
    }
    let el = SSR.#doc.createElement(tagName);
    for (let [key, val] of Object.entries(attrs)) {
      el.setAttribute(key, String(val));
    }
    SSR.#doc.body.appendChild(el);
    let html = serializeElement(el, new Set());
    el.remove();
    return html;
  }

  /**
   * Render a single Symbiote component as a stream of HTML chunks.
   * Requires manual init()/destroy() lifecycle.
   *
   * @param {string} tagName - Custom element tag name
   * @param {Object<string, string>} [attrs] - Attributes to set on the element
   * @returns {AsyncGenerator<string>}
   */
  static async *renderToStream(tagName, attrs = {}) {
    if (!SSR.#doc) {
      throw new Error('[Symbiote SSR] Call SSR.init() before renderToStream()');
    }
    let el = SSR.#doc.createElement(tagName);
    for (let [key, val] of Object.entries(attrs)) {
      el.setAttribute(key, String(val));
    }
    SSR.#doc.body.appendChild(el);
    yield* streamElement(el, new Set());
    el.remove();
  }
}

export default SSR;
