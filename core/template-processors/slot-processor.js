/** @type {import('./typedef.js').TplProcessor<import('../BaseComponent.js').BaseComponent>} */
export function slotProcessor(fr, fnCtx) {
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
