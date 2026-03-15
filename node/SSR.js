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
 * Check if a node is inside a <pre> or <code> ancestor.
 * @param {Node} node
 * @returns {boolean}
 */
function isInsidePreformatted(node) {
  let el = node.parentElement;
  while (el) {
    let tag = el.localName;
    if (tag === 'pre' || tag === 'code') return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * Resolve {{prop}} text node tokens by reading values from the closest custom element.
 * @param {string} text
 * @param {Node} node
 * @returns {string}
 */
function resolveTextTokens(text, node) {
  if (!text.includes('{{')) return text;
  // Find closest parent custom element:
  let el = node.parentElement;
  while (el && !el.localName?.includes('-')) {
    el = el.parentElement;
  }
  if (!el || !/** @type {any} */ (el).localCtx) return text;
  let ctx = /** @type {any} */ (el).localCtx;
  return text.replace(/\{\{([^}]+)\}\}/g, (match, prop) => {
    let val = ctx.has(prop) ? ctx.read(prop) : undefined;
    // Fallback to own class properties (mirrors initPropFallback logic):
    if (val === undefined || val === null) {
      if (Object.hasOwn(el, prop) && el[prop] !== undefined) {
        val = el[prop];
      } else if (typeof el[prop] === 'function') {
        val = el[prop]();
      }
    }
    return val !== undefined && val !== null ? String(val) : '';
  });
}

/**
 * Serialize a custom element to HTML with DSD and rootStyles support.
 * @param {HTMLElement} el
 * @param {Set<Function>} emittedStyles - track which constructors already emitted rootStyles
 * @param {string} [nonce] - CSP nonce for inline style tags
 * @returns {string}
 */
function serializeElement(el, emittedStyles, nonce) {
  let tagName = el.localName;
  let attrsStr = serializeAttrs(el);
  let ctor = /** @type {any} */ (el).constructor;

  let innerContent = '';
  let nonceAttr = nonce ? ` nonce="${nonce}"` : '';

  // Light DOM rootStyles — inject <style> (once per constructor):
  if (ctor.rootStyleSheets && !emittedStyles.has(ctor)) {
    emittedStyles.add(ctor);
    for (let sheet of ctor.rootStyleSheets) {
      let cssText = extractCSS(sheet);
      if (cssText) {
        innerContent += `<style${nonceAttr}>${cssText}</style>`;
      }
    }
  }

  // Declarative Shadow DOM:
  if (el.shadowRoot) {
    let shadowHTML = '';
    // New scope — each shadow root is a separate styling root:
    let shadowEmitted = new Set();
    if (ctor.shadowStyleSheets) {
      for (let sheet of ctor.shadowStyleSheets) {
        let cssText = extractCSS(sheet);
        if (cssText) {
          shadowHTML += `<style${nonceAttr}>${cssText}</style>`;
        }
      }
    }
    for (let child of el.shadowRoot.childNodes) {
      shadowHTML += serializeNode(child, shadowEmitted, nonce);
    }
    innerContent += `<template shadowrootmode="open">${shadowHTML}</template>`;
  }

  // Light DOM content:
  for (let child of el.childNodes) {
    innerContent += serializeNode(child, emittedStyles, nonce);
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
 * @param {string} [nonce] - CSP nonce for inline style tags
 * @returns {string}
 */
function serializeNode(node, emittedStyles, nonce) {
  let preformatted = isInsidePreformatted(node);
  // Custom element — recurse (skip inside pre/code):
  if (!preformatted && node.nodeType === 1 && /** @type {Element} */ (node).localName?.includes('-')) {
    return serializeElement(/** @type {HTMLElement} */ (node), emittedStyles, nonce);
  }
  // Regular element:
  if (node.nodeType === 1) {
    let el = /** @type {HTMLElement} */ (node);
    let attrsStr = serializeAttrs(el);
    let childHTML = '';
    for (let child of el.childNodes) {
      childHTML += serializeNode(child, emittedStyles, nonce);
    }
    return `<${el.localName}${attrsStr}>${childHTML}</${el.localName}>`;
  }
  // Text node:
  if (node.nodeType === 3) {
    if (preformatted) return node.textContent || '';
    return resolveTextTokens(node.textContent || '', node);
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
 * @param {string} [nonce] - CSP nonce for inline style tags
 * @returns {AsyncGenerator<string>}
 */
async function* streamElement(el, emittedStyles, nonce) {
  let tagName = el.localName;
  let attrsStr = serializeAttrs(el);
  let ctor = /** @type {any} */ (el).constructor;

  let nonceAttr = nonce ? ` nonce="${nonce}"` : '';

  yield `<${tagName}${attrsStr}>`;

  // Light DOM rootStyles (once per constructor):
  if (ctor.rootStyleSheets && !emittedStyles.has(ctor)) {
    emittedStyles.add(ctor);
    for (let sheet of ctor.rootStyleSheets) {
      let cssText = extractCSS(sheet);
      if (cssText) {
        yield `<style${nonceAttr}>${cssText}</style>`;
      }
    }
  }

  // Declarative Shadow DOM:
  if (el.shadowRoot) {
    yield '<template shadowrootmode="open">';
    // New scope — each shadow root is a separate styling root:
    let shadowEmitted = new Set();
    if (ctor.shadowStyleSheets) {
      for (let sheet of ctor.shadowStyleSheets) {
        let cssText = extractCSS(sheet);
        if (cssText) {
          yield `<style${nonceAttr}>${cssText}</style>`;
        }
      }
    }
    for (let child of el.shadowRoot.childNodes) {
      yield* streamNode(child, shadowEmitted, nonce);
    }
    yield '</template>';
  }

  // Light DOM content:
  for (let child of el.childNodes) {
    yield* streamNode(child, emittedStyles, nonce);
  }

  yield `</${tagName}>`;
}

/**
 * Stream-serialize a DOM node.
 * @param {Node} node
 * @param {Set<Function>} emittedStyles
 * @param {string} [nonce] - CSP nonce for inline style tags
 * @returns {AsyncGenerator<string>}
 */
async function* streamNode(node, emittedStyles, nonce) {
  let preformatted = isInsidePreformatted(node);
  // Custom element — stream (skip inside pre/code):
  if (!preformatted && node.nodeType === 1 && /** @type {Element} */ (node).localName?.includes('-')) {
    yield* streamElement(/** @type {HTMLElement} */ (node), emittedStyles, nonce);
    return;
  }
  if (node.nodeType === 1) {
    let el = /** @type {HTMLElement} */ (node);
    let attrsStr = serializeAttrs(el);
    if (el.childNodes.length) {
      yield `<${el.localName}${attrsStr}>`;
      for (let child of el.childNodes) {
        yield* streamNode(child, emittedStyles, nonce);
      }
      yield `</${el.localName}>`;
    } else {
      yield `<${el.localName}${attrsStr}>${el.innerHTML}</${el.localName}>`;
    }
    return;
  }
  if (node.nodeType === 3) {
    if (preformatted) {
      yield node.textContent || '';
    } else {
      yield resolveTextTokens(node.textContent || '', node);
    }
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
   * @param {{ nonce?: string }} [options] - SSR options
   * @returns {Promise<string>} Processed HTML with rendered components
   *
   * @example
   * ```js
   * await import('./my-components.js');
   * let result = await SSR.processHtml('<div><my-header></my-header><main>content</main></div>');
   * // With CSP nonce:
   * let safe = await SSR.processHtml('<my-app></my-app>', { nonce: 'abc123' });
   * ```
   */
  static async processHtml(html, options = {}) {
    let doctype = '';
    let doctypeMatch = html.match(/^(\s*<!doctype[^>]*>\s*)/i);
    if (doctypeMatch) {
      doctype = doctypeMatch[1];
      html = html.slice(doctypeMatch[0].length);
    }

    let autoInited = !SSR.#doc;
    if (autoInited) {
      await SSR.init();
    }
    SSR.#doc.body.innerHTML = html;
    let emittedStyles = new Set();
    let result = '';
    for (let child of SSR.#doc.body.childNodes) {
      result += serializeNode(child, emittedStyles, options.nonce);
    }
    if (autoInited) {
      SSR.destroy();
    }
    return doctype + result;
  }

  /**
   * Render a single Symbiote component to an HTML string.
   * Requires manual init()/destroy() lifecycle.
   *
   * @param {string} tagName - Custom element tag name
   * @param {Object<string, string>} [attrs] - Attributes to set on the element
   * @param {{ nonce?: string }} [options] - SSR options
   * @returns {string}
   */
  static renderToString(tagName, attrs = {}, options = {}) {
    if (!SSR.#doc) {
      throw new Error('[Symbiote SSR] Call SSR.init() before renderToString()');
    }
    let el = SSR.#doc.createElement(tagName);
    for (let [key, val] of Object.entries(attrs)) {
      el.setAttribute(key, String(val));
    }
    SSR.#doc.body.appendChild(el);
    let html;
    // isVirtual replaces the element with its template fragment:
    if (/** @type {any} */ (el).isVirtual) {
      let emittedStyles = new Set();
      html = '';
      for (let child of SSR.#doc.body.childNodes) {
        html += serializeNode(child, emittedStyles, options.nonce);
      }
    } else {
      html = serializeElement(el, new Set(), options.nonce);
      el.remove();
    }
    return html;
  }

  /**
   * Render a single Symbiote component as a stream of HTML chunks.
   * Requires manual init()/destroy() lifecycle.
   *
   * @param {string} tagName - Custom element tag name
   * @param {Object<string, string>} [attrs] - Attributes to set on the element
   * @param {{ nonce?: string }} [options] - SSR options
   * @returns {AsyncGenerator<string>}
   */
  static async *renderToStream(tagName, attrs = {}, options = {}) {
    if (!SSR.#doc) {
      throw new Error('[Symbiote SSR] Call SSR.init() before renderToStream()');
    }
    let el = SSR.#doc.createElement(tagName);
    for (let [key, val] of Object.entries(attrs)) {
      el.setAttribute(key, String(val));
    }
    SSR.#doc.body.appendChild(el);
    // isVirtual replaces the element with its template fragment:
    if (/** @type {any} */ (el).isVirtual) {
      let emittedStyles = new Set();
      for (let child of SSR.#doc.body.childNodes) {
        yield* streamNode(child, emittedStyles, options.nonce);
      }
    } else {
      yield* streamElement(el, new Set(), options.nonce);
      el.remove();
    }
  }
}

export default SSR;
