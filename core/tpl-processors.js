import { DICT } from './dictionary.js';

function slotProcessor(fr, fnCtx) {
  if (fnCtx.renderShadow) {
    return;
  }
  let slots = [...fr.querySelectorAll('slot')];
  if (fnCtx.__initChildren.length && slots.length) {
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
    fnCtx.__initChildren.forEach((/** @type {Element} */ child) => {
      let slotName = child.getAttribute?.('slot');
      if (slotName) {
        slotMap[slotName].fr.appendChild(child);
      } else if (slotMap.__default__) {
        slotMap.__default__.fr.appendChild(child);
      }
    });
    Object.values(slotMap).forEach((mapObj) => {
      mapObj.slot.parentNode.insertBefore(mapObj.fr, mapObj.slot);
      mapObj.slot.remove();
    });
  } else {
    fnCtx.innerHTML = '';
  }
};

function refProcessor(fr, fnCtx) {
  [...fr.querySelectorAll(`[${DICT.EL_REF_ATTR}]`)].forEach((/** @type {HTMLElement} */ el) => {
    let refName = el.getAttribute(DICT.EL_REF_ATTR);
    fnCtx.ref[refName] = el;
    el.removeAttribute(DICT.EL_REF_ATTR);
  });
}

/**
 * @param {DocumentFragment} fr
 * @param {String} attr
 * @param {import('./State.js').State} state
 * @param {Set} subs
 */
function connectToState(fr, attr, state, subs) {
  [...fr.querySelectorAll(`[${attr}]`)].forEach((el) => {
    let subSr = el.getAttribute(attr);
    let keyValsArr = subSr.split(';');
    keyValsArr.forEach((keyValStr) => {
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
      if (state && !state.has(kv[1])) {
        state.add(kv[1], undefined);
      }
      subs.add(
        state.sub(kv[1], (val) => {
          if (isAttr) {
            if (val?.constructor === Boolean) {
              val ? el.setAttribute(prop, '') : el.removeAttribute(prop);
            } else {
              el.setAttribute(prop, val);
            }
          } else {
            el[prop] = val;
          }
        })
      );
    });
    el.removeAttribute(attr);
  });
}

function localStateProcessor(fr, fnCtx) {
  connectToState(fr, DICT.LOCAL_CTX_ATTR, fnCtx.localState, fnCtx.allSubs);
}

function externalStateProcessor(fr, fnCtx) {
  connectToState(fr, DICT.EXT_CTX_ATTR, fnCtx.externalState, fnCtx.allSubs);
}

export default [
  slotProcessor,
  refProcessor,
  localStateProcessor,
  externalStateProcessor,
];