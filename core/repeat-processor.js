import { DICT } from './dictionary.js';
import {createDomSetProcessor} from './create-dom-set-processor.js';
import {domSetProcessor} from './tpl-processors.js'
import { createTxtNodesProcessor } from './create-txt-nodes-processor.js';

/**
 * @param {Element} el
 */
function parseRepeatContainer(el) {
  let keyStr = el.getAttribute(DICT.REPEAT_KEY_ATTR);
  let itemsStr = el.getAttribute(DICT.REPEAT_ITEMS_ATTR);

  el.removeAttribute(DICT.REPEAT_KEY_ATTR);
  el.removeAttribute(DICT.REPEAT_ITEMS_ATTR);

  let templateFr = document.createDocumentFragment();
  templateFr.appendChild(el.firstElementChild)
  el.innerHTML = '';

  return {keyStr, itemsStr, templateFr}
}

function onUpdate({processors, container, templateFr, items, elements, keyFn, fnCtx}) {
  if (items.length === 0) {
    container.innerHTML = "";
    return;
  }

  for (let elementKey of elements.keys()) {
    let isRemoved = true;
    for (let item of items) {
      let itemKey = keyFn(item)
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

  let insertMapping = new Map();
  let maxInsertIdx = 0
  let virtualChildren = [...container.children];
  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    let itemKey = keyFn(item)
    let element = elements.get(itemKey);

    if (!elements.has(itemKey)) {
      let fr = templateFr.cloneNode(true)
      processors.forEach(p => p(fr, item));
      domSetProcessor(fr, fnCtx)
      element = fr.firstElementChild
      elements.set(itemKey, element);
    }

    let renderedElement = virtualChildren[i];
    if (element !== renderedElement) {
      insertMapping.set(element, i)
      maxInsertIdx = i
    }
  }

  let fr = document.createDocumentFragment();
  let prevIdx = 0;
  for (let [element, i] of insertMapping) {
    if(i - prevIdx > 1) {
      container.insertBefore(fr, virtualChildren[prevIdx + 1] || null);
    }
    if(i === maxInsertIdx) {
      fr.appendChild(element);
      container.insertBefore(fr, virtualChildren[i + 1] || null);
      break
    }
    fr.appendChild(element);
    prevIdx = i
  }
}

function setupRepeat({container, templateFr, keyStr, itemsStr, fnCtx}) {
  let keyFn = fnCtx.$[keyStr];
  let elements = new Map()

  let repeatDomSetProcessor = createDomSetProcessor(DICT.REPEAT_BIND_ATTR, (key, fnCtx, callback) => {
    fnCtx.sub(key, callback)
  })

  let txtNodesProcessor = createTxtNodesProcessor((key, fnCtx, callback) => {
    fnCtx.sub(key, callback)
  })

  let processors = [repeatDomSetProcessor, txtNodesProcessor]

  fnCtx.sub(itemsStr, items => {
    onUpdate({processors, container, templateFr, items, elements, keyFn, fnCtx})
  })
}

/**
 * @template {import('./BaseComponent.js').BaseComponent} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
export function repeatProcessor(fr, fnCtx) {
  [...fr.querySelectorAll(`[${DICT.REPEAT_ITEMS_ATTR}]`)].forEach(el => {
    let {keyStr, itemsStr, templateFr} = parseRepeatContainer(el)
    setupRepeat({container: el, templateFr, keyStr, itemsStr, fnCtx})
  });
}
