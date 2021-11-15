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
}

function refProcessor(fr, fnCtx) {
  [...fr.querySelectorAll(`[${DICT.EL_REF_ATTR}]`)].forEach((/** @type {HTMLElement} */ el) => {
    let refName = el.getAttribute(DICT.EL_REF_ATTR);
    fnCtx.ref[refName] = el;
    el.removeAttribute(DICT.EL_REF_ATTR);
  });
}

/**
 * @param {DocumentFragment} fr
 * @param {any} fnCtx
 */
function domSetProcessor(fr, fnCtx) {
  [...fr.querySelectorAll(`[${DICT.BIND_ATTR}]`)].forEach((el) => {
    let subStr = el.getAttribute(DICT.BIND_ATTR);
    let keyValsArr = subStr.split(';');
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
        fnCtx.sub(valKey, (val) => {
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

export default [slotProcessor, refProcessor, domSetProcessor];
