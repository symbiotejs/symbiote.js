import { isDataKey } from './initial-data.js';
/**
 * @param {string} reference
 * @param {boolean} [computed]
 */
export function isDataReference(reference, computed = false) {
  if (!reference || /[\s:;,\[\]]/.test(reference)) {
    return false;
  }
  let name = reference;
  if (name.startsWith('^') || name.startsWith('*')) {
    name = name.slice(1);
  }
  else if (name.includes('/')) {
    let index = name.indexOf('/');
    if (!index) {
      return false;
    }
    name = name.slice(index + 1);
  }
  if (computed && name.startsWith('+')) {
    name = name.slice(1);
  }
  return isDataKey(name);
}
/**
 * @param {import('./BaseClass.js').BaseClass} owner
 * @param {string} reference
 * @param {boolean} [computed]
 */
export function resolveData(owner, reference, computed = false) {
  if (!isDataReference(reference, computed)) {
    throw new TypeError('Expected a data context reference: ' + reference);
  }
  let result = dataReference(owner, reference, computed);
  if (!result || !result.ctx.has(result.name)) {
    throw new TypeError('Unknown data target: ' + reference);
  }
  return result;
}
/**
 * Resolve a validated read reference even before a named field arrives.
 * @param {import('./BaseClass.js').BaseClass} owner
 * @param {string} reference
 * @param {boolean} [computed]
 */
export function dataReference(owner, reference, computed = false) {
  if (!isDataReference(reference, computed)) {
    throw new TypeError('Expected a data context reference: ' + reference);
  }
  return owner.Symbiote.parseProp(reference, owner);
}

/** @param {string} source */
export function parseAction(source) {
  let match = /^\[(toggle|set|pub-to|append|prepend|patch-matching|remove-matching|item-pub|item-toggle|item-remove|load|sync|persist|restore|navigate)(?:-(\d+))?\](.*)$/.exec(source);
  let operation = match?.[1];
  let reference = match?.[3] || '';
  let validReference = [
    'load',
    'sync',
    'persist',
    'restore',
    'navigate',
  ].includes(operation)
    ? !!reference && !/[\s/:;,\[\]@*^+]/.test(reference)
    : operation === 'item-remove' ? !reference
    : operation?.startsWith('item-') ? isDataKey(reference) && !/[\s:;,\[\]]/.test(reference)
    : isDataReference(reference);
  if (!match || (match[2] !== undefined && ![
    'pub-to',
    'item-pub',
  ].includes(operation)) || !validReference) {
    throw new TypeError('Invalid HTML-app action: ' + source);
  }
  let delay = match[2] === undefined ? 0 : Number(match[2]);
  if (!Number.isSafeInteger(delay) || delay > 2147483647) {
    throw new TypeError('Invalid action debounce delay.');
  }
  return {
    operation: match[1],
    reference: match[3],
    delay,
  };
}
/**
 * @param {Element} element
 * @param {import('./BaseClass.js').BaseClass} owner
 */
export function unavailable(element, owner) {
  return !owner.isConnected || !element.isConnected || element.matches(':disabled')
    || !!element.closest('[inert], [aria-disabled="true"]') || element.hasAttribute('readonly');
}
/**
 * @param {Element} element
 * @param {unknown} current
 * @returns {{ skip?: boolean, value?: unknown }}
 */
export function controlValue(element, current) {
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox') {
      return {
        value: element.checked,
      };
    }
    if (element.type === 'radio' && !element.checked) {
      return {
        skip: true,
      };
    }
    if (element.type === 'number' || element.type === 'range') {
      let value = element.value === '' ? null : element.valueAsNumber;
      if (value !== null && !Number.isFinite(value)) {
        throw new TypeError('Invalid numeric input.');
      }
      return {
        value,
      };
    }
    if (element.type === 'file') {
      throw new TypeError('File inputs require an explicit upload workflow.');
    }
    return {
      value: element.value,
    };
  }
  if (element instanceof HTMLSelectElement) {
    return {
      value: element.multiple ? [
        ...element.selectedOptions,
      ].map((option) => option.value) : element.value,
    };
  }
  if (element instanceof HTMLTextAreaElement) {
    return {
      value: element.value,
    };
  }
  if (!element.hasAttribute('value')) {
    throw new TypeError('The action requires value or action-data.');
  }
  let value = element.getAttribute('value');
  if (typeof current === 'boolean') {
    if (value !== 'true' && value !== 'false') {
      throw new TypeError('Expected a boolean value.');
    }
    return {
      value: value === 'true',
    };
  }
  return {
    value,
  };
}
/**
 * @param {unknown} current
 * @param {unknown} value
 */
export function validateValue(current, value) {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol'
    || typeof value === 'bigint' || (typeof value === 'number' && !Number.isFinite(value))) {
    throw new TypeError('Actions publish data values only.');
  }
  if (current !== null && current !== undefined && value !== null
    && (typeof current !== typeof value || Array.isArray(current) !== Array.isArray(value))) {
    throw new TypeError('The action value does not match the target type.');
  }
}
