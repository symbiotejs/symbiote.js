import { DICT } from '../core/dictionary.js';
import { resolveTemplate } from '../core/resolveTemplate.js';

/** @type {WeakMap<import('../core/PubSub.js').PubSub, Record<string, unknown>>} */
export let initialDefaults = new WeakMap();

/**
 * Remember authored defaults separately from mutable application state.
 * @param {import('../core/PubSub.js').PubSub} context
 * @param {Record<string, unknown>} data
 */
export function rememberDefaults(context, data) {
  let defaults = initialDefaults.get(context) || {};
  for (let key of Object.keys(data)) {
    if (!Object.hasOwn(defaults, key)) {
      defaults[key] = structuredClone(data[key]);
    }
  }
  initialDefaults.set(context, defaults);
}

/** @param {string} key */
export function isDataKey(key) {
  return !!key && !key.startsWith('__htmlApp') && key !== 'prototype' && !Object.hasOwn(Object.prototype, key) && !/^[@*^+]/.test(key) && !key.startsWith('--') && !key.includes('/');
}

/** @param {string} text */
export function parseInitialData(text) {
  let data = JSON.parse(text, (key, value) => {
    if (key === 'prototype' || Object.hasOwn(Object.prototype, key)) {
      throw new TypeError('HTML-app data contains an unsafe key.');
    }
    return value;
  });
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || Object.keys(data).some((key) => !isDataKey(key))) {
    throw new TypeError('HTML-app data must be an object with local data keys.');
  }
  return data;
}

/** @param {Element | DocumentFragment} root */
export function readInitialData(root) {
  let scripts = [...root.children].filter((element) => element.matches('script[type="application/json"]'));
  if (scripts.length > 1) {
    throw new TypeError('HTML-app accepts one direct JSON data script per component.');
  }
  let script = scripts[0];
  if (!script) { return {}; }
  let data = parseInitialData(script.textContent || '');
  script.setAttribute(DICT.TEXT_NODE_SKIP_ATTR, '');
  return data;
}

/**
 * Read the selected native template before incoming object bindings initialize.
 * @param {import('./BaseClass.js').BaseClass} owner
 */
export function readTemplateData(owner) {
  let selector = owner.allowCustomTemplate && owner.getAttribute('use-template');
  let source = selector ? resolveTemplate(owner, selector) : null;
  if (source) {
    return readInitialData(/** @type {DocumentFragment} */ (source.content.cloneNode(true)));
  }
  let markup = Reflect.get(owner.constructor, 'template');
  if (!markup) {
    return {};
  }
  let template = owner.ownerDocument.createElement('template');
  template.innerHTML = markup;
  return readInitialData(template.content);
}

/**
 * Initialize template-owned defaults before native binding and Itemize processors.
 * @param {Element | DocumentFragment} root
 * @param {import('./BaseClass.js').BaseClass} owner
 */
export function initialDataProcessor(root, owner) {
  let data = readInitialData(root);
  rememberDefaults(owner.localCtx, data);
  for (let [
    key,
    value,
  ] of Object.entries(data)) {
    owner.localCtx.add(key, value);
  }
}
