import { DICT } from './dictionary.js';
import {repeatProcessor} from './repeat-processor.js'
import {createDomSetProcessor} from './create-dom-set-processor.js';
import { createTxtNodesProcessor } from './create-txt-nodes-processor.js';

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


export const domSetProcessor = createDomSetProcessor(DICT.BIND_ATTR, (key, fnCtx, callback) => {
  fnCtx.sub(key, callback)
})

export const txtNodesProcessor = createTxtNodesProcessor((key, fnCtx, callback) => {
  fnCtx.sub(key, callback)
})

export default [slotProcessor, refProcessor, repeatProcessor, domSetProcessor, txtNodesProcessor];
