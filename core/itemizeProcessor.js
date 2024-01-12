import { DICT } from './dictionary.js';

/**
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
export function itemizeProcessor(fr, fnCtx) {
  [...fr.querySelectorAll(`[${DICT.LIST_ATTR}]`)]
    .filter((el) => {
      return !el.matches(`[${DICT.LIST_ATTR}] [${DICT.LIST_ATTR}]`);
    })
    .forEach((el) => {
      let itemTag = el.getAttribute(DICT.LIST_ITEM_TAG_ATTR);
      let itemClass;
      if (itemTag) {
        itemClass = window.customElements.get(itemTag);
      }
      if (!itemClass) {
        // @ts-ignore - TS doesn't resolve Symbiote via getter =(
        itemClass = class extends fnCtx.Symbiote {
          constructor() {
            super();
            if (!itemTag) {
              this.style.display = 'contents';
            }
          }
        };
        let itemTpl = el.innerHTML;
        itemClass.template = itemTpl;
        itemClass.reg(itemTag);
      }
      while (el.firstChild) {
        el.firstChild.remove();
      }
      let repeatDataKey = el.getAttribute(DICT.LIST_ATTR);
      fnCtx.sub(repeatDataKey, (data) => {
        if (!data) {
          while (el.firstChild) {
            el.firstChild.remove();
          }
          return;
        }
        let currentList = [...el.children];
        let fragment;
        let fillItems = (/** @type {any[]} */ items) => {
          items.forEach((item, idx) => {
            if (currentList[idx]) {
              // @ts-ignore
              if (currentList[idx].set$) {
                // wait until repeated element's state will be initialized
                setTimeout(() => {
                  // @ts-ignore
                  currentList[idx].set$(item);
                });
              } else {
                for (let k in item) {
                  currentList[idx][k] = item[k];
                }
              }
            } else {
              if (!fragment) {
                fragment = new DocumentFragment();
              }
              let repeatItem = new itemClass();
              Object.assign((repeatItem?.init$ || repeatItem), item);
              fragment.appendChild(repeatItem);
            }
          });
          fragment && el.appendChild(fragment);
          let oversize = currentList.slice(items.length, currentList.length);
          for (let exItm of oversize) {
            exItm.remove();
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
          console.warn('Symbiote list data type error:');
          console.log(data);
        }
      });
      el.removeAttribute(DICT.LIST_ATTR);
      el.removeAttribute(DICT.LIST_ITEM_TAG_ATTR);
    });
}
