import { DICT } from './dictionary.js';
import { setNestedProp } from '../utils/setNestedProp.js';
import { ownElements, isOwnNode } from './ownElements.js';

// Should go first among other processors:
import { itemizeProcessor } from './itemizeProcessor.js';



/**
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
function refProcessor(fr, fnCtx) {
  ownElements(fr, `[${DICT.EL_REF_ATTR}]`).forEach((/** @type {HTMLElement} */ el) => {
    let refName = el.getAttribute(DICT.EL_REF_ATTR);
    fnCtx.ref[refName] = el;
    if (!globalThis.__SYMBIOTE_SSR) {
      el.removeAttribute(DICT.EL_REF_ATTR);
    }
  });
}

/**
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
function domBindProcessor(fr, fnCtx) {
  ownElements(fr, `[${DICT.BIND_ATTR}]`).forEach((el) => {
    let subStr = el.getAttribute(DICT.BIND_ATTR);
    let keyValArr = subStr.split(';');
    keyValArr.forEach((keyValStr) => {
      if (!keyValStr) {
        return;
      }
      let kv = keyValStr.split(':').map((str) => str.trim());
      let prop = kv[0];
      let isAttr;

      if (prop.indexOf(DICT.ATTR_BIND_PX) === 0) {
        isAttr = true;
        prop = prop.replace(DICT.ATTR_BIND_PX, '');
      }
      /** @type {String[]} */
      let valKeysArr = kv[1].split(',').map((valKey) => {
        return valKey.trim();
      });
      for (let valKey of valKeysArr) {
        /** @type {'single' | 'double'} */
        let castType;
        if (valKey.startsWith('!!')) {
          castType = 'double';
          valKey = valKey.replace('!!', '');
        } else if (valKey.startsWith('!')) {
          castType = 'single';
          valKey = valKey.replace('!', '');
        }
        if (!fnCtx.has(valKey) && fnCtx.allowTemplateInits) {
          if (valKey.startsWith(DICT.ATTR_BIND_PX)) {
            fnCtx.add(valKey, fnCtx.getAttribute(valKey.replace(DICT.ATTR_BIND_PX, '')));
          } else {
            fnCtx.add(valKey, null);
            // Dev-only: warn about bindings that aren't in init$ (likely typos)
            if (fnCtx.Symbiote?.devMode && !prop.startsWith('on')) {
              let known = Object.keys(fnCtx.init$).filter((k) => !k.startsWith('+'));
              console.warn(
                `[Symbiote dev] <${fnCtx.localName}>: binding key "${valKey}" not found in init$ (auto-initialized to null).\n`
                + `Known keys: [${known.join(', ')}]`
              );
            }
          }
        }
        // In case of event handler is null, bind to fallback method (if defined):
        if (prop.startsWith('on') && fnCtx.localCtx.read(valKey) === null && typeof fnCtx[valKey] === 'function') {
          fnCtx.add(valKey, fnCtx[valKey].bind(fnCtx), true);
        }
        fnCtx.sub(valKey, (val) => {
          if (castType === 'double') {
            val = !!val;
          } else if (castType === 'single') {
            val = !val;
          }
          if (isAttr) {
            if (val?.constructor === Boolean) {
              val ? el.setAttribute(prop, '') : el.removeAttribute(prop);
            } else {
              el.setAttribute(prop, val);
            }
          } else {
            if (!setNestedProp(el, prop, val)) {
              // Custom element instances are not constructed properly at this moment, so:
              if (!el[DICT.SET_LATER_KEY]) {
                el[DICT.SET_LATER_KEY] = Object.create(null);
              }
              el[DICT.SET_LATER_KEY][prop] = val;
            }
          }
        }, !(fnCtx.ssrMode && !globalThis.__SYMBIOTE_SSR && (prop === 'textContent' || isAttr)));
      }
    });
    if (!globalThis.__SYMBIOTE_SSR) {
      el.removeAttribute(DICT.BIND_ATTR);
    }
  });
}

function getTextNodesWithTokens(el) {
  let isCustomEl = el instanceof HTMLElement && el.localName?.includes('-');
  let node;
  let result = [];
  let walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (txt) => {
      if (isCustomEl && !isOwnNode(txt, el)) return NodeFilter.FILTER_REJECT;
      return !txt.parentElement?.hasAttribute(DICT.TEXT_NODE_SKIP_ATTR) 
        && txt.textContent.includes(DICT.TEXT_NODE_OPEN_TOKEN) 
        && txt.textContent.includes(DICT.TEXT_NODE_CLOSE_TOKEN) 
        && 1;
    },
  });
  while ((node = walk.nextNode())) {
    result.push(node);
  }
  return result;
}

/**
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
const txtNodesProcessor = function (fr, fnCtx) {
  // Skip TreeWalker entirely if no {{ tokens in the fragment
  if (!fr.textContent?.includes(DICT.TEXT_NODE_OPEN_TOKEN)) {
    return;
  }
  let txtNodes = getTextNodesWithTokens(fr);
  txtNodes.forEach((/** @type {Text} */ txtNode) => {
    let tokenNodes = [];
    let offset;
    // Splitting of the text node:
    while (txtNode.textContent.includes(DICT.TEXT_NODE_CLOSE_TOKEN)) {
      if (txtNode.textContent.startsWith(DICT.TEXT_NODE_OPEN_TOKEN)) {
        offset = txtNode.textContent.indexOf(DICT.TEXT_NODE_CLOSE_TOKEN) + DICT.TEXT_NODE_CLOSE_TOKEN.length;
        txtNode.splitText(offset);
        tokenNodes.push(txtNode);
      } else {
        offset = txtNode.textContent.indexOf(DICT.TEXT_NODE_OPEN_TOKEN);
        txtNode.splitText(offset);
      }
      // @ts-expect-error
      txtNode = txtNode.nextSibling;
    }
    tokenNodes.forEach((tNode) => {
      let prop = tNode.textContent.replace(DICT.TEXT_NODE_OPEN_TOKEN, '').replace(DICT.TEXT_NODE_CLOSE_TOKEN, '');
      tNode.textContent = '';
      if (!fnCtx.has(prop) && fnCtx.allowTemplateInits) {
        if (prop.startsWith(DICT.ATTR_BIND_PX)) {
          fnCtx.add(prop, fnCtx.getAttribute(prop.replace(DICT.ATTR_BIND_PX, '')));
          fnCtx.initAttributeObserver();
        } else {
          fnCtx.add(prop, null);
        }
      }
      fnCtx.sub(prop, (val) => {
        tNode.textContent = val;
      });
    });
  });
};

export default [itemizeProcessor, refProcessor, domBindProcessor, txtNodesProcessor];
