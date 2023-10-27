import { DICT } from './dictionary.js';

/** @type {String[]} */
export const RESERVED_ATTRIBUTES = [
  DICT.LIST_ATTR,
  DICT.LIST_ITEM_TAG_ATTR,
  DICT.EL_REF_ATTR,
  DICT.USE_TPL_ATTR,
  DICT.CTX_NAME_ATTR,
  DICT.CTX_OWNER_ATTR,
];

/** @typedef {Record<keyof import('./BaseComponent.js').BaseComponent, String>} BindDescriptor */

/**
 * @template T
 * @param {TemplateStringsArray} parts
 * @param {(Object<string, String> | BindDescriptor | String | T)[]} props
 * @returns {String}
 */
export function html(parts, ...props) {
  let resultHtml = '';
  parts.forEach((part, idx) => {
    resultHtml += part;
    if (props[idx]?.constructor === Object) {
      let bindStr = '';
      // @ts-expect-error
      for (let key in props[idx]) {
        if (RESERVED_ATTRIBUTES.includes(key)) {
          resultHtml += ` ${key}="${props[idx][key]}"`;
        } else {
          bindStr += `${key}:${props[idx][key]};`;
        }
      }
      bindStr && (resultHtml += ` ${DICT.BIND_ATTR}="${bindStr}"`);
    } else if (props[idx]) {
      resultHtml += props[idx];
    }
  });
  return resultHtml;
}

export default html;
