/**
 * @module ssr
 * Server-side rendering for Symbiote.js components.
 * Requires `linkedom` as a peer dependency.
 *
 * Usage:
 * ```js
 * import { initSSR, renderToString } from '@symbiotejs/symbiote/core/ssr.js';
 * initSSR();
 * import './my-component.js';
 * let html = renderToString('my-component', { title: 'Hello' });
 * ```
 */

let ssrDocument = null;
let ssrWindow = null;

/**
 * Initialize the SSR environment using linkedom.
 * Must be called before importing any Symbiote components.
 */
export async function initSSR() {
  // @ts-ignore
  let { parseHTML } = /** @type {any} */ (await import('linkedom'));
  let { document, window, HTMLElement, customElements, DocumentFragment, NodeFilter, MutationObserver } = parseHTML('<!DOCTYPE html><html><head></head><body></body></html>');

  ssrDocument = document;
  ssrWindow = window;

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
    // @ts-ignore — SSR polyfill doesn't need full CSSStyleSheet interface
    window.CSSStyleSheet = SSRStyleSheet;
    // @ts-ignore
    globalThis.CSSStyleSheet = SSRStyleSheet;
  }

  // Polyfill NodeFilter (linkedom may not expose it):
  let nodeFilter = NodeFilter || {
    SHOW_ALL: 0xFFFFFFFF,
    SHOW_ELEMENT: 0x1,
    SHOW_TEXT: 0x4,
    SHOW_COMMENT: 0x80,
    FILTER_ACCEPT: 1,
    FILTER_REJECT: 2,
    FILTER_SKIP: 3,
  };

  // Polyfill MutationObserver (not needed for SSR one-shot render):
  let mutationObserver = MutationObserver || class {
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  };

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
 * Extract CSS text from a stylesheet (works with both CSSStyleSheet and SSR polyfill).
 * @param {CSSStyleSheet | {cssText: string}} sheet
 * @returns {string}
 */
function extractCSS(sheet) {
  if ('cssText' in sheet && typeof sheet.cssText === 'string') {
    return sheet.cssText;
  }
  // Standard CSSStyleSheet — extract from cssRules:
  let text = '';
  try {
    // @ts-ignore — cssRules may not exist on SSR polyfill
    for (let rule of sheet.cssRules) {
      text += rule.cssText + '\n';
    }
  } catch {
    // Security restrictions on some stylesheets
  }
  return text;
}

/**
 * Render a Symbiote component to an HTML string.
 * @param {string} tagName - Custom element tag name
 * @param {Object<string, string>} [attrs] - Attributes to set on the element
 * @returns {string} HTML string with Declarative Shadow DOM if applicable
 */
export function renderToString(tagName, attrs = {}) {
  if (!ssrDocument) {
    throw new Error('[Symbiote SSR] Call initSSR() before renderToString()');
  }

  let el = ssrDocument.createElement(tagName);

  for (let [key, val] of Object.entries(attrs)) {
    el.setAttribute(key, String(val));
  }

  // Trigger component lifecycle:
  ssrDocument.body.appendChild(el);

  // Build output HTML:
  let html = serializeElement(el);

  // Cleanup:
  el.remove();

  return html;
}

/**
 * Serialize a custom element to HTML with DSD support.
 * @param {HTMLElement} el
 * @returns {string}
 */
function serializeElement(el) {
  let tagName = el.localName;
  let attrsStr = '';
  if (el.attributes) {
    for (let attr of el.attributes) {
      attrsStr += ` ${attr.name}="${attr.value}"`;
    }
  }

  let innerContent = '';

  // Declarative Shadow DOM:
  if (el.shadowRoot) {
    let shadowHTML = '';

    // Inline shadow styles:
    let ctor = /** @type {any} */ (el).constructor;
    if (ctor.shadowStyleSheets) {
      for (let sheet of ctor.shadowStyleSheets) {
        let cssText = extractCSS(sheet);
        if (cssText) {
          shadowHTML += `<style>${cssText}</style>`;
        }
      }
    }

    shadowHTML += el.shadowRoot.innerHTML;
    innerContent += `<template shadowrootmode="open">${shadowHTML}</template>`;
  }

  // Light DOM content:
  if (!el.shadowRoot) {
    innerContent += el.innerHTML;
  }

  return `<${tagName}${attrsStr}>${innerContent}</${tagName}>`;
}

/**
 * Render a Symbiote component to a stream of HTML chunks.
 * @param {string} tagName - Custom element tag name
 * @param {Object<string, string>} [attrs] - Attributes to set on the element
 * @returns {AsyncGenerator<string>}
 */
export async function* renderToStream(tagName, attrs = {}) {
  if (!ssrDocument) {
    throw new Error('[Symbiote SSR] Call initSSR() before renderToStream()');
  }

  let el = ssrDocument.createElement(tagName);

  for (let [key, val] of Object.entries(attrs)) {
    el.setAttribute(key, String(val));
  }

  // Trigger component lifecycle:
  ssrDocument.body.appendChild(el);

  // Stream the element:
  yield* streamElement(el);

  // Cleanup:
  el.remove();
}

/**
 * Stream-serialize an element, yielding chunks.
 * Custom element children are recursed into for granular streaming.
 * @param {HTMLElement} el
 * @returns {AsyncGenerator<string>}
 */
async function* streamElement(el) {
  let tagName = el.localName;
  let attrsStr = '';
  if (el.attributes) {
    for (let attr of el.attributes) {
      attrsStr += ` ${attr.name}="${attr.value}"`;
    }
  }

  yield `<${tagName}${attrsStr}>`;

  // Declarative Shadow DOM:
  if (el.shadowRoot) {
    yield '<template shadowrootmode="open">';

    let ctor = /** @type {any} */ (el).constructor;
    if (ctor.shadowStyleSheets) {
      for (let sheet of ctor.shadowStyleSheets) {
        let cssText = extractCSS(sheet);
        if (cssText) {
          yield `<style>${cssText}</style>`;
        }
      }
    }

    // Stream shadow DOM children:
    for (let child of el.shadowRoot.childNodes) {
      yield* streamNode(child);
    }

    yield '</template>';
  } else {
    // Stream light DOM children:
    for (let child of el.childNodes) {
      yield* streamNode(child);
    }
  }

  yield `</${tagName}>`;
}

/**
 * Stream-serialize a DOM node.
 * @param {Node} node
 * @returns {AsyncGenerator<string>}
 */
async function* streamNode(node) {
  // Custom element — recurse for granular streaming:
  if (node.nodeType === 1 && /** @type {Element} */ (node).localName?.includes('-')) {
    yield* streamElement(/** @type {HTMLElement} */ (node));
    return;
  }
  // Regular element with children:
  if (node.nodeType === 1) {
    let el = /** @type {HTMLElement} */ (node);
    let attrsStr = '';
    if (el.attributes) {
      for (let attr of el.attributes) {
        attrsStr += ` ${attr.name}="${attr.value}"`;
      }
    }
    if (el.childNodes.length) {
      yield `<${el.localName}${attrsStr}>`;
      for (let child of el.childNodes) {
        yield* streamNode(child);
      }
      yield `</${el.localName}>`;
    } else {
      yield `<${el.localName}${attrsStr}>${el.innerHTML}</${el.localName}>`;
    }
    return;
  }
  // Text node:
  if (node.nodeType === 3) {
    yield node.textContent || '';
    return;
  }
  // Comment node:
  if (node.nodeType === 8) {
    yield `<!--${node.textContent}-->`;
  }
}

/**
 * Clean up the SSR environment.
 */
export function destroySSR() {
  if (ssrDocument) {
    ssrDocument.body.innerHTML = '';
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
  ssrDocument = null;
  ssrWindow = null;
}
