import { DICT } from './dictionary.js';

/** @type {String[]} */
export const RESERVED_ATTRIBUTES = [
  DICT.LIST_ATTR,
  DICT.LIST_ITEM_TAG_ATTR,
  DICT.EL_REF_ATTR,
  DICT.USE_TPL_ATTR,
  DICT.CTX_NAME_ATTR,
];

/** @typedef {Record<keyof import('./Symbiote.js').Symbiote, String>} BindDescriptor */

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
    if (idx >= props.length) return;
    let val = props[idx];
    if (val === undefined || val === null) {
      console.error(
        `[Symbiote > html] \`this\` used in template interpolation (value: ${val}).\n`
        + 'Templates are context-free — use ${{ prop: \'stateKey\' }} binding syntax instead.'
      );
      return;
    }
    if (val?.constructor === Object) {
      let bindStr = '';
      // @ts-expect-error
      for (let key in val) {
        if (RESERVED_ATTRIBUTES.includes(key)) {
          resultHtml += ` ${key}="${val[key]}"`;
        } else {
          bindStr += `${key}:${val[key]};`;
        }
      }
      bindStr && (resultHtml += ` ${DICT.BIND_ATTR}="${bindStr}"`);
    } else {
      resultHtml += val;
    }
  });
  return resultHtml;
}

export default html;
