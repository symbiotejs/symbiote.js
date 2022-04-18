import { DICT } from '../dictionary.js';
import { domRepeatSetProcessor } from './dom-repeat-set-processor.js';
import { domSetProcessor } from './dom-set-processor.js';
import { txtNodesProcessor } from './txt-nodes-processor.js';

/** @typedef {import('../Data.js').Data} Data */
/** @typedef {import('./typedef.js').Subscribable} Subscribable */
/** @typedef {import('./typedef.js').TplProcessor} TplProcessor */
/** @typedef {import('../BaseComponent.js').BaseComponent} BaseComponent */

const DEFAULT_PROCESSORS = {
  contextRepeat: [domRepeatSetProcessor, txtNodesProcessor],
  contextComponent: [domSetProcessor],
};

/**
 * @param {DocumentFragment} templateFr
 * @param {Subscribable} fnCtx
 * @param {{ contextRepeat: TplProcessor[]; contextComponent: TplProcessor[] }} [processors=DEFAULT_PROCESSORS] Default is `DEFAULT_PROCESSORS`
 * @returns
 */
function createElementFactory(templateFr, fnCtx, processors = DEFAULT_PROCESSORS) {
  let unsubscribers = new Map();
  let { contextRepeat, contextComponent } = processors;

  return {
    /** @param {Subscribable} data */
    create(data) {
      let fr = /** @type {DocumentFragment} */ (templateFr.cloneNode(true));
      let unsubs = new Set();

      for (let processor of contextRepeat) {
        let unsub = processor(fr, data);
        unsub && unsubs.add(unsub);
      }

      for (let processor of contextComponent) {
        let unsub = processor(fr, fnCtx);
        unsub && unsubs.add(unsub);
      }

      let unsubElement = () => {
        for (let unsub of unsubs) {
          unsub();
        }
      };

      let element = fr.firstElementChild;

      unsubscribers.set(element, unsubElement);
      return element;
    },
    /** @param {Element} element */
    recycle(element) {
      if (unsubscribers.has(element)) {
        unsubscribers.get(element)();
        unsubscribers.delete(element);
      }
    },
    recycleAll() {
      for (let [, unsub] of unsubscribers) {
        unsub();
      }
      unsubscribers.clear();
    },
  };
}

/**
 * @template {BaseComponent} [T=BaseComponent] Default is `BaseComponent`
 * @template {Subscribable} [D=Data] Default is `Data`
 * @param {Element} container
 * @param {DocumentFragment} templateFr
 * @param {T} fnCtx
 * @param {(item: D) => string} keyFn
 * @returns {{ reconcile: (items: D[]) => void; destroy: () => void }}
 */
function createKeyedDomReconciler(container, templateFr, fnCtx, keyFn) {
  let elements = new Map();
  let elementFactory = createElementFactory(templateFr, fnCtx);

  function destroy() {
    elementFactory.recycleAll();
    elements.clear();
    elementFactory = undefined;
    elements = undefined;
    container.innerHTML = '';
  }

  function reconcile(items) {
    if (items.length === 0) {
      elementFactory.recycleAll();
      elements.clear();
      container.innerHTML = '';
      return;
    }

    // remove unneeded elements from dom
    // TODO: find more performant way to do this
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
        let el = elements.get(elementKey);
        elementFactory.recycle(el);
        elements.delete(elementKey);
        el.remove();
      }
    }

    // create new elements and generate replace mapping
    let insertMapping = new Map();
    let maxInsertIdx = 0;
    // TODO: probably this is not the fastest way to access children by index
    let virtualChildren = container.children;
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let itemKey = keyFn(item);
      let element = elements.get(itemKey);

      if (!element) {
        element = elementFactory.create(item);
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
        container.insertBefore(fr, virtualChildren[i] || null);
        break;
      }
      fr.appendChild(element);
      prevIdx = i;
    }
  }

  return { reconcile, destroy };
}

/**
 * Subscribe on d2 and publish changes to d1
 *
 * @param {Data} d1
 * @param {Data} d2
 * @returns
 */
function oneWaySyncData(d1, d2) {
  let subs = [];
  for (let prop in d2.store) {
    let sub = d2.sub(prop, (val) => {
      d1.pub(prop, val);
    });
    subs.push(sub);
  }
  return () => {
    for (let sub of subs) {
      sub.remove();
    }
  };
}

function createInternalDataFactory() {
  let unsubscribers = new Map();
  return {
    /** @param {Data} userData */
    create(userData) {
      let internalData = userData.clone();
      let unsubItemSync = oneWaySyncData(internalData, userData);
      unsubscribers.set(internalData, unsubItemSync);
      return internalData;
    },
    reattach(internalData, userData) {
      this.recycle(internalData);

      let unsubItemSync = oneWaySyncData(internalData, userData);
      unsubscribers.set(internalData, unsubItemSync);
    },
    /** @param {Data} internalData */
    recycle(internalData) {
      unsubscribers.get(internalData)();
      unsubscribers.delete(internalData);
    },
    recycleAll() {
      for (let [, unsub] of unsubscribers) {
        unsub();
      }
      unsubscribers.clear();
    },
  };
}

/**
 * @template {BaseComponent} [T=BaseComponent] Default is `BaseComponent`
 * @param {Element} container
 * @param {DocumentFragment} templateFr
 * @param {T} fnCtx
 * @returns {{ reconcile: (items: Data[]) => void; destroy: () => void }}
 */
function createNonKeyedDomReconciler(container, templateFr, fnCtx) {
  /** @type {Data[]} */
  let internalDataList = [];
  let elementFactory = createElementFactory(templateFr, fnCtx);
  let internalDataFactory = createInternalDataFactory();

  function destroy() {
    internalDataFactory.recycleAll();
    elementFactory.recycleAll();
    internalDataFactory = undefined;
    internalDataList = undefined;
    elementFactory = undefined;
    templateFr.replaceChildren();
    container.innerHTML = '';
  }

  function reconcile(userDataList) {
    if (userDataList.length === 0) {
      internalDataFactory.recycleAll();
      elementFactory.recycleAll();
      internalDataList = [];
      container.innerHTML = '';
      return;
    }

    let children = container.children;
    let itemsCount = userDataList.length;
    let renderedCount = children.length;
    let appendFr = document.createDocumentFragment();

    if (itemsCount > renderedCount) {
      for (let i = renderedCount; i < itemsCount; i++) {
        let userData = userDataList[i];
        let internalData = internalDataFactory.create(userData);
        let element = elementFactory.create(internalData);
        appendFr.appendChild(element);
        internalDataList[i] = internalData;
      }
      container.appendChild(appendFr);
    } else if (itemsCount < renderedCount) {
      for (let i = itemsCount; i < renderedCount; i++) {
        let element = children[i];
        elementFactory.recycle(element);
        element.remove();

        let internalData = internalDataList[i];
        internalDataFactory.recycle(internalData);
        internalDataList[i] = undefined;
      }
    }

    for (let i = 0; i < itemsCount; i++) {
      let currentData = internalDataList[i];
      let newData = userDataList[i];

      let bothHasKeys = newData.has('key') && currentData.has('key');
      let sameData = bothHasKeys && newData.read('key') === currentData.read('key');

      if (!sameData) {
        currentData.merge(newData);
        internalDataFactory.reattach(currentData, newData);
      }
    }
  }

  return { reconcile, destroy };
}

/** @type {import('./typedef.js').TplProcessor<import('../BaseComponent.js').BaseComponent>} */
export function repeatProcessor(fr, fnCtx) {
  let destroyers = new Set();
  let subs = new Set();

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

    let reconciler;
    if (keyStr) {
      let keyFn = fnCtx.$[keyStr];
      reconciler = createKeyedDomReconciler(el, templateFr, fnCtx, keyFn);
    } else {
      reconciler = createNonKeyedDomReconciler(el, templateFr, fnCtx);
    }
    let { reconcile, destroy } = reconciler;
    destroyers.add(destroy);

    let sub = fnCtx.sub(itemsStr, (items) => {
      reconcile(items);
    });
    subs.add(sub);
  });

  return () => {
    for (let destroy of destroyers) {
      destroy();
    }
    for (let sub of subs) {
      sub.remove();
    }
    destroyers.clear();
    subs.clear();
    destroyers = undefined;
    subs = undefined;
  };
}
