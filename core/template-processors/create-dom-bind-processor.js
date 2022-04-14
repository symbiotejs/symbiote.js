import { DICT } from '../dictionary.js';

/**
 * @param {String} bindAttr
 * @returns {import('./typedef.js').TplProcessor}
 */
export function createDomBindProcessor(bindAttr, createSub, removeSub) {
  return (fr, fnCtx) => {
    let sub = createSub(fnCtx);

    [...fr.querySelectorAll(`[${bindAttr}]`)].forEach((el) => {
      let subStr = el.getAttribute(bindAttr);
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
          sub(valKey, (val) => {
            if (isAttr) {
              if (val?.constructor === Boolean) {
                val ? el.setAttribute(prop, '') : el.removeAttribute(prop);
              } else {
                el.setAttribute(prop, /** @type {String} */ (val));
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
      el.removeAttribute(bindAttr);
    });

    return removeSub?.(fnCtx);
  };
}
