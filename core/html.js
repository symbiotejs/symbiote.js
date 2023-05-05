import { DICT } from './dictionary.js';

/** @typedef {Record<keyof import('./BaseComponent.js').BaseComponent, String>} BindDescriptor */

/**
 * @param {TemplateStringsArray} parts
 * @param {(Object<string, String> | BindDescriptor | String)[]} props
 * @returns {String}
 */
export function html(parts, ...props) {
  let resultHtml = '';
  parts.forEach((part, idx) => {
    resultHtml += part;
    if (props[idx]?.constructor === Object) {
      let bindStr = '';
      // @ts-ignore
      for (let key in props[idx]) {
        bindStr += `${key}:${props[idx][key]};`;
      }
      resultHtml += ` ${DICT.BIND_ATTR}="${bindStr}"`;
    } else if (props[idx]) {
      resultHtml += props[idx];
    }
  });
  return resultHtml;
}

export default html;
