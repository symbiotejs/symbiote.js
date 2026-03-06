import { DICT } from './dictionary.js';
import { animateOut } from './animateOut.js';
import { ownElements } from './ownElements.js';
import { initPropFallback } from './initPropFallback.js';

/**
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
export function itemizeProcessor(fr, fnCtx) {
  let clientSSR = fnCtx.ssrMode && !globalThis.__SYMBIOTE_SSR;

  ownElements(fr, `[${DICT.LIST_ATTR}]`).filter((el) => {
      return !el.matches(`[${DICT.LIST_ATTR}] [${DICT.LIST_ATTR}]`);
    }).forEach((el) => {
      let itemTag = el.getAttribute(DICT.LIST_ITEM_TAG_ATTR);
      let itemClass;
      if (itemTag) {
        itemClass = window.customElements.get(itemTag);
      }
      if (!itemClass) {
        // During hydration, adopt existing SSR item tag and derive template
        if (clientSSR && el.children.length > 0) {
          let ssrTag = el.children[0].localName;
          itemClass = window.customElements.get(ssrTag);
          if (!itemClass) {
            itemClass = class extends fnCtx.Symbiote {
              constructor() {
                super();
                this.isoMode = true;
                if (!itemTag) {
                  this.style.display = 'contents';
                }
              }
            };
            itemClass.template = el.children[0].innerHTML;
            itemClass.reg(ssrTag);
          }
        } else {
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
      }
      if (!clientSSR) {
        while (el.firstChild) {
          el.firstChild.remove();
        }
      }
      let repeatDataKey = el.getAttribute(DICT.LIST_ATTR);
      if (!fnCtx.has(repeatDataKey) && fnCtx.allowTemplateInits) {
        initPropFallback(fnCtx, repeatDataKey);
      }
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
          console.warn(`[Symbiote] <${fnCtx.localName}>: itemize data must be Array or Object, got ${typeof data}:`, data);
        }
      }, !clientSSR);
      if (!globalThis.__SYMBIOTE_SSR) {
        el.removeAttribute(DICT.LIST_ATTR);
        el.removeAttribute(DICT.LIST_ITEM_TAG_ATTR);
      }
    });
}
