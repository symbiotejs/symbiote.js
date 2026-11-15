import { animateOut } from './animateOut.js';
import { warnMsg } from './warn.js';
import { setupItemize, setItemWebMCPMetadata } from './itemizeSetup.js';

/**
 * Optional Itemize processor with stable keyed identity.
 * Keyed records always keep their element, including complete reversals.
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
export function itemizeProcessor(fr, fnCtx) {
  setupItemize(fr, fnCtx, ({
    el,
    itemClass,
    repeatDataKey,
    clientSSR,
    isLazy,
  }) => {
    /** @type {any[]} */
    let previous = [];
    let hydrating = clientSSR;
    /** @type {any[]} */
    let active = [
      ...el.children,
    ];

    fnCtx.sub(repeatDataKey, (data) => {
      /** @type {any[]} */
      let items = [];
      if (data) {
        if (Array.isArray(data)) {
          items = data;
        } else if (data.constructor === Object) {
          items = Object.entries(data).map(([
            key,
            value,
          ]) => ({
            ...value,
            _KEY_: key,
          }));
        } else {
          warnMsg(16, fnCtx.localName, typeof data, data);
          return;
        }
      }
      if (items === previous) {
        return;
      }
      let keyProp = items[0]?.id !== undefined && Array.isArray(data) ? 'id'
        : items[0]?._KEY_ !== undefined ? '_KEY_' : null;
      let keys = keyProp ? items.map((item) => item[keyProp]) : [];
      if (keyProp && (keys.some((key) => key === undefined) || new Set(keys).size !== keys.length)) {
        throw new TypeError('Keyed Itemize requires unique keys on every record.');
      }
      let byKey = new Map();
      if (keyProp) {
        previous.forEach((item, index) => byKey.set(item[keyProp], index));
      }
      let retained = new Set();
      let next = items.map((item, index) => {
        let previousIndex = hydrating ? index : keyProp ? byKey.get(item[keyProp]) : index;
        let child = previousIndex === undefined ? null : active[previousIndex];
        if (child) {
          retained.add(child);
          if (hydrating) {
            child.ssrMode = true;
            child.$ = item;
          } else if (item !== previous[previousIndex]) {
            if (child.set$) {
              child.set$(item);
            } else {
              Object.assign(child, item);
            }
          }
        } else {
          child = new itemClass();
          if (isLazy) {
            child.lazyMode = true;
          }
          Object.assign(child.init$ || child, item);
        }
        setItemWebMCPMetadata(child, item, index, keyProp ? item[keyProp] : undefined);
        return child;
      });
      // Leaving elements are excluded from future reconciliation immediately.
      for (let child of active) {
        if (!retained.has(child)) {
          child.setAttribute('inert', '');
          animateOut(child);
        }
      }
      let focused = el.ownerDocument.activeElement;
      for (let index = 0; index < next.length; index++) {
        let child = next[index];
        let before = el.children[index] || null;
        if (before !== child) {
          let moveBefore = Reflect.get(el, 'moveBefore');
          if (typeof moveBefore === 'function' && child.parentElement === el && el.isConnected) {
            moveBefore.call(el, child, before);
          } else {
            el.insertBefore(child, before);
          }
        }
      }
      if (focused instanceof HTMLElement && focused.isConnected
        && el.contains(focused) && el.ownerDocument.activeElement !== focused) {
        focused.focus({
          preventScroll: true,
        });
      }
      hydrating = false;
      previous = items;
      active = next;
    });
  });
}
