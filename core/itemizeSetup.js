import { DICT } from './dictionary.js';
import { ownElements } from './ownElements.js';
import { initPropFallback } from './initPropFallback.js';

/**
 * @typedef {Object} ItemizeDescriptor
 * @property {Element} el
 * @property {*} itemClass
 * @property {string} repeatDataKey
 * @property {boolean} clientSSR
 */

/**
 * Shared setup for itemize processors.
 * Handles element discovery, class creation, SSR hydration, template derivation,
 * child clearing, initPropFallback, and attribute cleanup.
 *
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 * @param {(desc: ItemizeDescriptor) => void} handler
 */
export function setupItemize(fr, fnCtx, handler) {
  let clientSSR = fnCtx.ssrMode && !globalThis.__SYMBIOTE_SSR;

  ownElements(fr, `[${DICT.LIST_ATTR}]`).filter((el) => {
    return !el.matches(`[${DICT.LIST_ATTR}] [${DICT.LIST_ATTR}]`);
  }).forEach((el) => {
    let itemTag = el.getAttribute(DICT.LIST_ITEM_TAG_ATTR);
    let repeatDataKey = el.getAttribute(DICT.LIST_ATTR);
    let itemClass;
    if (itemTag) {
      itemClass = window.customElements.get(itemTag);
    }
    if (!itemClass) {
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
          let tpl = document.createElement('template');
          // @ts-expect-error
          tpl.innerHTML = fnCtx.constructor.template;
          let staticEl = tpl.content.querySelector(
            `[${DICT.LIST_ATTR}="${repeatDataKey}"]`
          );
          itemClass.template = staticEl?.querySelector('template')?.innerHTML
            || el.children[0].innerHTML;
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
    if (!fnCtx.has(repeatDataKey) && fnCtx.allowTemplateInits) {
      initPropFallback(fnCtx, repeatDataKey);
    }

    handler({ el, itemClass, repeatDataKey, clientSSR });

    if (!globalThis.__SYMBIOTE_SSR) {
      el.removeAttribute(DICT.LIST_ATTR);
      el.removeAttribute(DICT.LIST_ITEM_TAG_ATTR);
    }
  });
}
