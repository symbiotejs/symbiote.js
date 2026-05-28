import { DICT } from './dictionary.js';
import { errMsg } from './warn.js';

/** @type {String[]} */
export const RESERVED_ATTRIBUTES = [
  DICT.LIST_ATTR,
  DICT.LIST_ITEM_TAG_ATTR,
  DICT.EL_REF_ATTR,
  DICT.USE_TPL_ATTR,
  DICT.CTX_NAME_ATTR,
];

const RESERVED_ATTRIBUTES_SET = new Set(RESERVED_ATTRIBUTES);
const SELF_CLOSING_CUSTOM_ELEMENT_RE = /<([a-z][.0-9_a-z]*-[\-.0-9_a-z]*)(\s+(?:"[^"]*"|'[^']*'|[^'"<>])*)?\/>/gi;

function hasImmediateClosingTag(htmlString, startIdx, tagName) {
  let idx = startIdx;
  let len = htmlString.length;
  while (idx < len) {
    let code = htmlString.charCodeAt(idx);
    if (code !== 32 && code !== 9 && code !== 10 && code !== 12 && code !== 13) break;
    idx++;
  }
  if (htmlString.charCodeAt(idx) !== 60 || htmlString.charCodeAt(idx + 1) !== 47) return false;
  let tagStart = idx + 2;
  if (htmlString.charCodeAt(tagStart + tagName.length) !== 62) return false;
  let closingTagName = htmlString.slice(tagStart, tagStart + tagName.length);
  return closingTagName === tagName || closingTagName.toLowerCase() === tagName.toLowerCase();
}

function closeSelfClosingCustomElements(resultHtml) {
  if (resultHtml.indexOf('/>') === -1) return resultHtml;
  return resultHtml.replace(SELF_CLOSING_CUSTOM_ELEMENT_RE, (match, tagName, attrs = '', offset, htmlString) => {
    let openTag = `<${tagName}${attrs && attrs.trimEnd()}>`;
    if (hasImmediateClosingTag(htmlString, offset + match.length, tagName)) {
      return openTag;
    }
    return `${openTag}</${tagName}>`;
  });
}

/** @typedef {Record<keyof import('./Symbiote.js').Symbiote, String>} BindDescriptor */

/**
 * @template T
 * @param {TemplateStringsArray} parts
 * @param {(Object<string, String> | BindDescriptor | String | T)[]} props
 * @returns {String}
 */
export function html(parts, ...props) {
  let resultHtml = '';
  let propsLength = props.length;
  for (let idx = 0; idx < parts.length; idx++) {
    resultHtml += parts[idx];
    if (idx >= propsLength) continue;
    let val = props[idx];
    if (val === undefined || val === null) {
      errMsg(15, val);
      continue;
    }
    if (val.constructor === Object) {
      let bindStr = '';
      // @ts-expect-error
      for (let key in val) {
        if (RESERVED_ATTRIBUTES_SET.has(key)) {
          resultHtml += ` ${key}="${val[key]}"`;
        } else {
          bindStr += `${key}:${val[key]};`;
        }
      }
      bindStr && (resultHtml += ` ${DICT.BIND_ATTR}="${bindStr}"`);
    } else {
      resultHtml += val;
    }
  }
  return closeSelfClosingCustomElements(resultHtml);
}

export default html;
