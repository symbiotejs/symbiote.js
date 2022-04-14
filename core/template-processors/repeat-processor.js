import { DICT } from '../dictionary.js';
import { domRepeatSetProcessor } from './dom-repeat-set-processor.js';
import { domSetProcessor } from './dom-set-processor.js';
import { repeatTxtNodesProcessor } from './repeat-txt-nodes-processor.js';

/** @typedef {import('../Data.js').Data} Data */
/** @typedef {import('./typedef.js').Subscribable} Subscribable */
/** @typedef {import('../BaseComponent.js').BaseComponent} BaseComponent */

/**
 * @template {BaseComponent} [T=BaseComponent] Default is `BaseComponent`
 * @template {Subscribable} [D=Data] Default is `Data`
 * @param {Element} container
 * @param {DocumentFragment} templateFr
 * @param {T} fnCtx
 * @param {(item: D) => string} keyFn
 * @returns {(items: D[]) => void}
 */
function createKeyedDomReconciler(container, templateFr, fnCtx, keyFn) {
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
    // TODO: probably this is not the fastest way to do this, investigate
    let virtualChildren = [...container.children];
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let itemKey = keyFn(item);
      let element = elements.get(itemKey);

      if (!elements.has(itemKey)) {
        let fr = /** @type {DocumentFragment} */ (templateFr.cloneNode(true));
        // TODO: we need to unsubscribe when element will be removed
        domRepeatSetProcessor(fr, item);
        repeatTxtNodesProcessor(fr, item);
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

/**
 * @template {BaseComponent} [T=BaseComponent] Default is `BaseComponent`
 * @param {Element} container
 * @param {DocumentFragment} templateFr
 * @param {T} fnCtx
 * @returns {(items: Data[]) => void}
 */
function createNonKeyedDomReconciler(container, templateFr, fnCtx) {
  /** @type {Data[]} */
  let dataList = [];
  let unsubscribers = new WeakMap();

  return function (items) {
    if (items.length === 0) {
      container.innerHTML = '';
      return;
    }

    let children = container.children;
    let itemsCount = items.length;
    let renderedCount = children.length;
    let appendFr = document.createDocumentFragment();

    if (itemsCount > renderedCount) {
      for (let i = renderedCount; i < itemsCount; i++) {
        let item = items[i].clone();
        let fr = /** @type {DocumentFragment} */ (templateFr.cloneNode(true));
        let removeRepeatSetProcessor = domRepeatSetProcessor(fr, item);
        let removeRepeatTxtProcessor = repeatTxtNodesProcessor(fr, item);
        domSetProcessor(fr, fnCtx);
        let element = fr.firstElementChild;
        appendFr.appendChild(element);
        dataList[i] = item;

        let unsubElement = () => {
          removeRepeatSetProcessor && removeRepeatSetProcessor();
          removeRepeatTxtProcessor && removeRepeatTxtProcessor();
        };
        unsubscribers.set(element, unsubElement);
      }
      container.appendChild(appendFr);
    } else if (itemsCount < renderedCount) {
      for (let i = itemsCount; i < renderedCount; i++) {
        unsubscribers.get(children[i])();
        unsubscribers.delete(children[i]);
        children[i].remove();
        dataList[i] = undefined;
      }
    }

    for (let i = 0; i < itemsCount; i++) {
      let nextItem = items[i];
      let currentItem = dataList[i];

      currentItem.merge(nextItem);
    }
  };
}

/** @type {import('./typedef.js').TplProcessor<import('../BaseComponent.js').BaseComponent>} */
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

    let reconcile;
    if (keyStr) {
      let keyFn = fnCtx.$[keyStr];
      reconcile = createKeyedDomReconciler(el, templateFr, fnCtx, keyFn);
    } else {
      reconcile = createNonKeyedDomReconciler(el, templateFr, fnCtx);
    }

    fnCtx.sub(itemsStr, (items) => {
      reconcile(items);
    });
  });

  return;
}
