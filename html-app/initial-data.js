import { DICT } from '../core/dictionary.js';

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
 * Initialize template-owned defaults before native binding and Itemize processors.
 * @param {Element | DocumentFragment} root
 * @param {import('./BaseClass.js').BaseClass} owner
 */
export function initialDataProcessor(root, owner) {
  for (let [
    key,
    value,
  ] of Object.entries(readInitialData(root))) {
    owner.localCtx.add(key, value);
  }
}
