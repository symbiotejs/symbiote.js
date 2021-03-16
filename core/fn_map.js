import { State } from './State.js';
import { extractByAttr, setAriaClick } from './render_utils.js';
import { DICT } from './dictionary.js';

export const FN = Object.freeze({
  /**
   * @param {any} fnCtx
   * @param {String} propName
   * @param {String} ctxName
   * @returns {import('./State').State}
   */
  getCtx: function (fnCtx, propName, ctxName) {
    let ctx = null;
    if (ctxName) {
      ctx = State.getNamedCtx(ctxName);
    } else if (propName.indexOf(DICT.DATA_CTX_PREFIX) === 0) {
      ctx = fnCtx.providerState;
    } else {
      ctx = fnCtx.localState;
    }
    return ctx || null;
  },

  /** @param {String} propName */
  cleanupPropName: function (propName) {
    return propName.replace(DICT.DATA_CTX_PREFIX, '');
  },

  /**
   * @param {any} fnCtx
   * @param {DocumentFragment} fr
   */
  reflectElements: function (fnCtx, fr) {
    let attrName = DICT.EL_REF_ATTR;
    let elements = extractByAttr(fr, attrName);
    elements.forEach((el) => {
      if (!fnCtx.__refsMap) {
        fnCtx.__refsMap = Object.create(null);
      }
      let refName = el.getAttribute(attrName);
      fnCtx.__refsMap[refName] = el;
      if (refName.includes('-')) {
        fnCtx[refName] = el;
      }
      el.removeAttribute(attrName);
    });
  },

  /** @param {DocumentFragment} fr */
  callAllReadyCbks: function (fr) {
    let cbName = 'readyCallback';
    [...fr.querySelectorAll('*')].forEach((el) => {
      if (el.tagName.includes('-')) {
        el[cbName] && el[cbName]();
      }
    });
  },

  /**
   * @param {any} fnCtx
   * @param {DocumentFragment} fragment
   */
  parseFr: function (fnCtx, fragment) {
    // Fragment processing defined in extensions:
    fnCtx.constructor.processExtendedFragment(fnCtx, fragment);
    FN.reflectElements(fnCtx, fragment);
    extractByAttr(fragment, DICT.DSL_ATTR).forEach((el) => {
      let bKey = el.getAttribute(DICT.DSL_ATTR);
      let pairsArr = bKey.split(DICT.DSL_PAIR_SPLIT);
      pairsArr.forEach((pair) => {
        if (!pair) {
          return;
        }
        let keyValArr = pair.split(':').map((str) => str.trim());
        let propName = keyValArr[0];
        let valKey = keyValArr[1];
        let sub;
        if (valKey && valKey.indexOf(DICT.NAMED_CTX_BRACKETS[0]) === 0 && valKey.indexOf(DICT.NAMED_CTX_BRACKETS[1]) !== -1) {
          let valArr = valKey.split(DICT.NAMED_CTX_BRACKETS[1]);
          let ctxName = valArr[0].replace(DICT.NAMED_CTX_BRACKETS[0], '');
          valKey = valArr[1].trim();
          sub = (prop, val) => {
            fnCtx.sub(prop, val, ctxName);
          };
        } else if (valKey && valKey.indexOf(DICT.DATA_CTX_PREFIX) === 0) {
          valKey = valKey.replace(DICT.DATA_CTX_PREFIX, '');
          sub = fnCtx.sub.bind(fnCtx.dataCtxProvider);
        } else {
          sub = fnCtx.sub.bind(fnCtx);
        }
        if (propName.indexOf(DICT.ATTR_BIND_PREFIX) === 0) {
          let attrName = propName.replace(DICT.ATTR_BIND_PREFIX, '');
          sub(valKey, (val) => {
            el.setAttribute(attrName, val);
          });
        } else if (propName.indexOf(DICT.STATE_BIND_PREFIX) === 0) {
          propName = propName.replace(DICT.STATE_BIND_PREFIX, '');
          sub(valKey, (val) => {
            // 'state' is not a DICT-string here:
            el['state'] && (el['state'][propName] = val);
          });
        } else {
          sub(valKey, (val) => {
            if (propName === DICT.SUB_INNER_HTML && val.constructor === String) {
              fnCtx.constructor.__processSubtreeSubscribtion(fnCtx, el, val);
            } else if (propName === DICT.CSS_ATTR && val.constructor === String) {
              el[DICT.CSS_LIST] && (el[DICT.CSS_LIST].value = val);
            } else if (propName === DICT.RULE_ATTR && val.constructor === String) {
              el[DICT.RULE_LIST] && (el[DICT.RULE_LIST].value = val);
            } else if (propName === DICT.SUB_ARIA_CLICK) {
              setAriaClick(el, val);
            } else {
              el[propName] = val;
            }
          });
        }
      });
      el.removeAttribute(DICT.DSL_ATTR);
    });
    // Should go after binding processing:
    FN.callAllReadyCbks(fragment);
  },

  /**
   * @param {any} fnCtx
   * @param {DocumentFragment} fr
   */
  processSlots: function (fnCtx, fr) {
    fnCtx.__slots = [...fr.querySelectorAll('slot')];
    if (fnCtx.innerHTML && fnCtx.__slots.length) {
      let slotMap = {};
      fnCtx.__slots.forEach((slot) => {
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
      [...fnCtx.children].forEach((child) => {
        let slotName = child.getAttribute('slot');
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
  },

  /** @param {any} fnCtx */
  removeSubscriptions: function (fnCtx) {
    if (fnCtx.__subscriptions) {
      fnCtx.__subscriptions.forEach((sub) => {
        sub.remove();
      });
      fnCtx.__subscriptions = null;
    }
  },
});
