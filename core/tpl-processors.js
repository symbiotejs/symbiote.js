import { DICT } from './dictionary.js';
// Should go first among other processors:
import { repeatProcessor } from './repeatProcessor.js';

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
  if (fnCtx.initChildren.length && slots.length) {
    let slotMap = {};
    slots.forEach((slot) => {
      let slotName = slot.getAttribute('name');
      if (slotName) {
        slotMap[slotName] = {
          slot,
          fr: document.createDocumentFragment(),
        };
      } else {
        slotMap.__default__ = {
          slot,
          fr: document.createDocumentFragment(),
        };
      }
    });
    fnCtx.initChildren.forEach((/** @type {Element} */ child) => {
      let slotName = child.getAttribute?.('slot');
      if (slotName) {
        child.removeAttribute('slot');
        slotMap[slotName].fr.appendChild(child);
      } else if (slotMap.__default__) {
        slotMap.__default__.fr.appendChild(child);
      }
    });
    Object.values(slotMap).forEach((mapObj) => {
      mapObj.slot.parentNode.insertBefore(mapObj.fr, mapObj.slot);
      mapObj.slot.remove();
    });
  }
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
      // Deep property:
      let isDeep, parent, lastStep, dive;
      if (prop.includes('.')) {
        isDeep = true;
        let propPath = prop.split('.');
        dive = () => {
          parent = el;
          propPath.forEach((step, idx) => {
            if (idx < propPath.length - 1) {
              parent = parent[step];
            } else {
              lastStep = step;
            }
          });
        };
        dive();
      }
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
          } else if (isDeep) {
            if (parent) {
              parent[lastStep] = val;
            } else {
              // Custom element instances are not constructed properly at this time, so:
              window.setTimeout(() => {
                dive();
                parent[lastStep] = val;
              });
              // TODO: investigate how to do it better ^^^
            }
          } else {
            el[prop] = val;
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
      fnCtx.sub(prop, (val) => {
        tNode.textContent = val;
      });
    });
  });
};

export default [repeatProcessor, slotProcessor, refProcessor, domSetProcessor, txtNodesProcessor];
