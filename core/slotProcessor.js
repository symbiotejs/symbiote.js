import { DICT } from './dictionary.js';

/**
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
export function slotProcessor(fr, fnCtx) {
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
    let slotName = slot.getAttribute('name') || DICT.DEFAULT_SLOT_KEY;
    slotMap[slotName] = {
      slot,
      fr: document.createDocumentFragment(),
    };
  });
  fnCtx.initChildren.forEach((child) => {
    /** @type {String} */
    let slotName = DICT.DEFAULT_SLOT_KEY;
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

export default slotProcessor;
