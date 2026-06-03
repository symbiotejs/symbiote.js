import { animateOut } from './animateOut.js';
import { warnMsg } from './warn.js';
import { setupItemize } from './itemizeSetup.js';
import { DICT } from './dictionary.js';

function setItemWebMCPMetadata(itemEl, item, idx) {
  if (!itemEl) return;
  itemEl[DICT.MCP_ITEM_INDEX_KEY] = idx;
  if (item && Object.prototype.hasOwnProperty.call(item, '_KEY_')) {
    itemEl[DICT.MCP_ITEM_KEY_KEY] = item._KEY_;
  } else {
    delete itemEl[DICT.MCP_ITEM_KEY_KEY];
  }
}

/**
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
export function itemizeProcessor(fr, fnCtx) {
  setupItemize(fr, fnCtx, ({ el, itemClass, repeatDataKey, clientSSR, isLazy }) => {
    fnCtx.sub(repeatDataKey, (data) => {
      if (!data) {
        while (el.firstChild) {
          el.firstChild.remove();
        }
        return;
      }
      /** @type {*[]} */
      let currentList = [...el.children];
      let fragment;
      let fillItems = (/** @type {*[]} */ items) => {
        items.forEach((item, idx) => {
          if (currentList[idx]) {
            setItemWebMCPMetadata(currentList[idx], item, idx);
            if (currentList[idx].set$) {
              currentList[idx].set$(item);
            } else {
              for (let k in item) {
                currentList[idx][k] = item[k];
              }
            }
          } else {
            if (!fragment) {
              fragment = document.createDocumentFragment();
            }
            let repeatItem = new itemClass();
            if (isLazy) {
              repeatItem.lazyMode = true;
            }
            setItemWebMCPMetadata(repeatItem, item, idx);
            Object.assign((repeatItem?.init$ || repeatItem), item);
            fragment.appendChild(repeatItem);
          }
        });
        fragment && el.appendChild(fragment);
        let oversize = currentList.slice(items.length, currentList.length);
        for (let exItm of oversize) {
          animateOut(exItm);
        }
      };
      if (data.constructor === Array) {
        fillItems(data);
      } else if (data.constructor === Object) {
        let items = [];
        for (let itemKey in data) {
          let init = data[itemKey];
          Object.defineProperty(init, '_KEY_', {
            value: itemKey,
            enumerable: true,
          });
          items.push(init);
        }
        fillItems(items);
      } else {
        warnMsg(16, fnCtx.localName, typeof data, data);
      }
    }, !clientSSR);
  });
}
