import { DICT } from './dictionary.js';

/**
 * Optimized itemize template processor.
 *
 * Drop-in replacement for the default itemizeProcessor with:
 * - Reference-equality fast paths for append, truncate, and no-op
 * - Key-based reconciliation (using `_KEY_` or `id` properties) for efficient reordering
 * - Skip-if-same optimization for index-based patching
 *
 * Usage:
 * ```js
 * import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
 * import { itemizeProcessor as defaultProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor.js';
 *
 * class MyList extends Symbiote {
 *   constructor() {
 *     super();
 *     // Swap default for keyed version
 *     this.templateProcessors.delete(defaultProcessor);
 *     this.templateProcessors = new Set([itemizeProcessor, ...this.templateProcessors]);
 *   }
 * }
 * ```
 *
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
export function itemizeProcessor(fr, fnCtx) {
  [...fr.querySelectorAll(`[${DICT.LIST_ATTR}]`)].filter((el) => {
    return !el.matches(`[${DICT.LIST_ATTR}] [${DICT.LIST_ATTR}]`);
  }).forEach((el) => {
    let itemTag = el.getAttribute(DICT.LIST_ITEM_TAG_ATTR);
    let itemClass;
    if (itemTag) {
      itemClass = window.customElements.get(itemTag);
    }
    if (!itemClass) {
      itemClass = class extends fnCtx.Symbiote {
        constructor() {
          super();
          if (!itemTag) {
            this.style.display = 'contents';
          }
        }
      };
      itemClass.template = el.querySelector('template')?.innerHTML || el.innerHTML;
      itemClass.reg(itemTag);
    }
    while (el.firstChild) {
      el.firstChild.remove();
    }
    let repeatDataKey = el.getAttribute(DICT.LIST_ATTR);

    /** @type {*[]} */
    let prevData = [];

    fnCtx.sub(repeatDataKey, (data) => {
      if (!data) {
        while (el.firstChild) {
          el.firstChild.remove();
        }
        prevData = [];
        return;
      }

      /** @type {*[]} */
      let items;
      if (data.constructor === Array) {
        items = data;
      } else if (data.constructor === Object) {
        items = [];
        for (let itemKey in data) {
          let init = data[itemKey];
          Object.defineProperty(init, '_KEY_', {
            value: itemKey,
            enumerable: true,
          });
          items.push(init);
        }
      } else {
        console.warn('Symbiote list data type error:');
        console.log(data);
        return;
      }

      let children = el.children;
      let prevLen = children.length;
      let newLen = items.length;

      // ── Fast path: no-op (same array reference) ──
      if (data === prevData || items === prevData) {
        return;
      }

      // ── Fast path: simple truncate (tail removal) ──
      if (newLen < prevLen && newLen > 0) {
        if (items[0] === prevData[0] && items[newLen - 1] === prevData[newLen - 1]) {
          for (let i = prevLen - 1; i >= newLen; i--) {
            children[i].remove();
          }
          prevData = items;
          return;
        }
      }

      // ── Fast path: simple append ──
      if (newLen > prevLen && prevLen > 0) {
        if (items[0] === prevData[0] && items[prevLen - 1] === prevData[prevLen - 1]) {
          let fragment = new DocumentFragment();
          for (let i = prevLen; i < newLen; i++) {
            let repeatItem = new itemClass();
            Object.assign((repeatItem?.init$ || repeatItem), items[i]);
            fragment.appendChild(repeatItem);
          }
          el.appendChild(fragment);
          prevData = items;
          return;
        }
      }

      // ── Full reconciliation ──
      let keyProp = items[0]?._KEY_ !== undefined ? '_KEY_' : (items[0]?.id !== undefined ? 'id' : null);

      if (keyProp && prevLen > 0) {
        /** @type {Map<*, number>} */
        let prevKeyToIdx = new Map();
        for (let i = 0; i < prevLen; i++) {
          let key = prevData[i]?.[keyProp];
          if (key !== undefined) {
            prevKeyToIdx.set(key, i);
          }
        }

        // Count out-of-order moves to decide strategy
        let movesNeeded = 0;
        let lastReusedIdx = -1;

        for (let i = 0; i < newLen; i++) {
          let prevIdx = prevKeyToIdx.get(items[i][keyProp]);
          if (prevIdx !== undefined) {
            if (prevIdx < lastReusedIdx) {
              movesNeeded++;
            }
            lastReusedIdx = prevIdx;
          }
        }

        // DOM reorder only when few moves needed; otherwise patch in-place
        if (movesNeeded < newLen * 0.3) {
          let newChildren = [];
          let toRemove = new Set(prevKeyToIdx.keys());

          for (let i = 0; i < newLen; i++) {
            let item = items[i];
            let key = item[keyProp];
            let prevIdx = prevKeyToIdx.get(key);

            if (prevIdx !== undefined) {
              let existing = children[prevIdx];
              if (item !== prevData[prevIdx]) {
                // @ts-expect-error
                if (existing.set$) {
                  // @ts-expect-error
                  existing.set$(item);
                } else {
                  for (let k in item) {
                    existing[k] = item[k];
                  }
                }
              }
              toRemove.delete(key);
              newChildren.push(existing);
            } else {
              let repeatItem = new itemClass();
              Object.assign((repeatItem?.init$ || repeatItem), item);
              newChildren.push(repeatItem);
            }
          }

          for (let key of toRemove) {
            children[prevKeyToIdx.get(key)].remove();
          }

          for (let i = 0; i < newChildren.length; i++) {
            if (children[i] !== newChildren[i]) {
              el.insertBefore(newChildren[i], children[i] || null);
            }
          }

          prevData = items;
          return;
        }
      }

      // ── Index-based patching (fallback, same as default + skip-if-same) ──
      let fragment;
      for (let i = 0; i < newLen; i++) {
        if (i < prevLen) {
          if (items[i] !== prevData[i]) {
            let child = children[i];
            // @ts-expect-error
            if (child.set$) {
              // @ts-expect-error
              child.set$(items[i]);
            } else {
              for (let k in items[i]) {
                child[k] = items[i][k];
              }
            }
          }
        } else {
          if (!fragment) {
            fragment = new DocumentFragment();
          }
          let repeatItem = new itemClass();
          Object.assign((repeatItem?.init$ || repeatItem), items[i]);
          fragment.appendChild(repeatItem);
        }
      }
      fragment && el.appendChild(fragment);
      for (let i = prevLen - 1; i >= newLen; i--) {
        children[i].remove();
      }

      prevData = items;
    });
    el.removeAttribute(DICT.LIST_ATTR);
    el.removeAttribute(DICT.LIST_ITEM_TAG_ATTR);
  });
}
