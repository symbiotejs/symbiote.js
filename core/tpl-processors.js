import { DICT } from './dictionary.js';
import { setNestedProp } from '../utils/setNestedProp.js';
import { kebabToCamel } from '../utils/kebabToCamel.js';
// Should go first among other processors:
import { repeatProcessor } from './repeatProcessor.js';

const DEFAULT_SLOT_KEY = '__default__';

/**
 * @template {import('./BaseComponent.js').BaseComponent} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
function slotProcessor(fr, fnCtx) {
  if (fnCtx.shadowRoot) {
    return;
  }
  let slots = [...fr.querySelectorAll('slot')];
  if (!slots.length) {
    return;
  }

  /** @type {Record<string, { slot: HTMLSlotElement; fr: DocumentFragment }>} */
  let slotMap = {};
  slots.forEach((slot) => {
    let slotName = slot.getAttribute('name') || DEFAULT_SLOT_KEY;
    slotMap[slotName] = {
      slot,
      fr: document.createDocumentFragment(),
    };
  });
  fnCtx.initChildren.forEach((child) => {
    let slotName = DEFAULT_SLOT_KEY;
    if (child instanceof Element && child.hasAttribute('slot')) {
      slotName = child.getAttribute('slot');
      child.removeAttribute('slot');
    }
    slotMap[slotName]?.fr.appendChild(child);
  });
  Object.values(slotMap).forEach((mapObj) => {
    if (mapObj.fr.childNodes.length) {
      mapObj.slot.parentNode.replaceChild(mapObj.fr, mapObj.slot);
    } else if (mapObj.slot.childNodes.length) {
      let slotFr = document.createDocumentFragment();
      slotFr.append(...mapObj.slot.childNodes);
      mapObj.slot.parentNode.replaceChild(slotFr, mapObj.slot);
    } else {
      mapObj.slot.remove();
    }
  });
}

/**
 * @template {import('./BaseComponent.js').BaseComponent} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
function refProcessor(fr, fnCtx) {
  [...fr.querySelectorAll(`[${DICT.EL_REF_ATTR}]`)].forEach((/** @type {HTMLElement} */ el) => {
    let refName = el.getAttribute(DICT.EL_REF_ATTR);
    fnCtx.ref[refName] = el;
    el.removeAttribute(DICT.EL_REF_ATTR);
  });
}

/**
 * @template {import('./BaseComponent.js').BaseComponent} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
function domSetProcessor(fr, fnCtx) {
  [...fr.querySelectorAll(`[${DICT.BIND_ATTR}]`)].forEach((el) => {
    let subStr = el.getAttribute(DICT.BIND_ATTR);
    let keyValArr = subStr.split(';');
    [...el.attributes].forEach((attr) => {
      if (attr.name.startsWith('-') && attr.value) {
        let key = kebabToCamel(attr.name.replace('-', ''));
        keyValArr.push(key + ':' + attr.value);
        el.removeAttribute(attr.name);
      }
    });
    keyValArr.forEach((keyValStr) => {
      if (!keyValStr) {
        return;
      }
      let kv = keyValStr.split(':').map((str) => str.trim());
      let prop = kv[0];
      let isAttr;

      if (prop.indexOf(DICT.ATTR_BIND_PRFX) === 0) {
        isAttr = true;
        prop = prop.replace(DICT.ATTR_BIND_PRFX, '');
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
              // Custom element instances are not constructed properly at this time, so:
              if (!el[DICT.SET_LATER_KEY]) {
                el[DICT.SET_LATER_KEY] = Object.create(null);
              }
              el[DICT.SET_LATER_KEY][prop] = val;
            }
          }
        });
      }
    });
    el.removeAttribute(DICT.BIND_ATTR);
  });
}

const OPEN_TOKEN = '{{';
const CLOSE_TOKEN = '}}';
const SKIP_ATTR = 'skip-text';

function getTextNodesWithTokens(el) {
  let node;
  let result = [];
  let walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (txt) => {
      return !txt.parentElement?.hasAttribute(SKIP_ATTR) && txt.textContent.includes(OPEN_TOKEN) && txt.textContent.includes(CLOSE_TOKEN) && 1;
    },
  });
  while ((node = walk.nextNode())) {
    result.push(node);
  }
  return result;
}

/**
 * @template {import('./BaseComponent.js').BaseComponent} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
const txtNodesProcessor = function (fr, fnCtx) {
  let txtNodes = getTextNodesWithTokens(fr);
  txtNodes.forEach((/** @type {Text} */ txtNode) => {
    let tokenNodes = [];
    let offset;
    // Splitting of the text node:
    while (txtNode.textContent.includes(CLOSE_TOKEN)) {
      if (txtNode.textContent.startsWith(OPEN_TOKEN)) {
        offset = txtNode.textContent.indexOf(CLOSE_TOKEN) + CLOSE_TOKEN.length;
        txtNode.splitText(offset);
        tokenNodes.push(txtNode);
      } else {
        offset = txtNode.textContent.indexOf(OPEN_TOKEN);
        txtNode.splitText(offset);
      }
      // @ts-ignore
      txtNode = txtNode.nextSibling;
    }
    tokenNodes.forEach((tNode) => {
      let prop = tNode.textContent.replace(OPEN_TOKEN, '').replace(CLOSE_TOKEN, '');
      tNode.textContent = '';
      fnCtx.sub(prop, (val) => {
        tNode.textContent = val;
      });
    });
  });
};

export default [repeatProcessor, slotProcessor, refProcessor, domSetProcessor, txtNodesProcessor];
