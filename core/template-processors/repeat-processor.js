import { DICT } from '../dictionary.js';
import { domRepeatSetProcessor } from './dom-repeat-set-processor.js';
import { domSetProcessor } from './dom-set-processor.js';
import { txtNodesProcessor } from './txt-nodes-processor.js';

/**
 * @param {Element} container
 * @param {DocumentFragment} templateFr
 * @param {<T = import('../Data.js').Data>(item: T[]) => string} keyFn
 * @param {any} fnCtx
 * @returns {any}
 */
function domFlusher(container, templateFr, keyFn, fnCtx) {
  let elements = new Map();

  return function (items) {
    if (items.length === 0) {
      container.innerHTML = '';
      return;
    }

    // remove unneeded elements from dom
    for (let elementKey of elements.keys()) {
      let isRemoved = true;
      for (let item of items) {
        let itemKey = keyFn(item);
        if (elementKey === itemKey) {
          isRemoved = false;
          break;
        }
      }
      if (isRemoved) {
        elements.get(elementKey).remove();
        elements.delete(elementKey);
      }
    }

    // create new elements and generate replace mapping
    let insertMapping = new Map();
    let maxInsertIdx = 0;
    let virtualChildren = [...container.children];
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let itemKey = keyFn(item);
      let element = elements.get(itemKey);

      if (!elements.has(itemKey)) {
        let fr = /** @type {DocumentFragment} */ (templateFr.cloneNode(true));
        domRepeatSetProcessor(fr, item);
        txtNodesProcessor(fr, item);
        domSetProcessor(fr, fnCtx);
        element = fr.firstElementChild;
        elements.set(itemKey, element);
      }

      let renderedElement = virtualChildren[i];
      if (element !== renderedElement) {
        insertMapping.set(element, i);
        maxInsertIdx = i;
      }
    }

    // apply replace mapping to the dom
    let fr = document.createDocumentFragment();
    let prevIdx = 0;
    for (let [element, i] of insertMapping) {
      if (i - prevIdx > 1) {
        container.insertBefore(fr, virtualChildren[prevIdx + 1] || null);
      }
      if (i === maxInsertIdx) {
        fr.appendChild(element);
        container.insertBefore(fr, virtualChildren[i + 1] || null);
        break;
      }
      fr.appendChild(element);
      prevIdx = i;
    }
  };
}

/** @type {import('./typedef.js').TplProcessor} */
export function repeatProcessor(fr, fnCtx) {
  [...fr.querySelectorAll(`[${DICT.REPEAT_ITEMS_ATTR}]`)].forEach((el) => {
    let keyStr = el.getAttribute(DICT.REPEAT_KEY_ATTR);
    let itemsStr = el.getAttribute(DICT.REPEAT_ITEMS_ATTR);
    el.removeAttribute(DICT.REPEAT_KEY_ATTR);
    el.removeAttribute(DICT.REPEAT_ITEMS_ATTR);

    if (el.childElementCount > 1) {
      console.warn('[repeat] Element has more than one child element. Only the first child will be used as template.');
    }
    let templateFr = document.createDocumentFragment();
    templateFr.appendChild(el.firstElementChild);
    el.innerHTML = '';

    let keyFn = fnCtx.$[keyStr];
    let flush = domFlusher(el, templateFr, keyFn, fnCtx);

    fnCtx.sub(itemsStr, (items) => {
      flush(items);
    });
  });
}
