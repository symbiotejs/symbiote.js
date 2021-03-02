/**
 * @param {DocumentFragment | HTMLElement} fr
 * @param {String} attr
 * @returns {HTMLElement[]}
 */
export function extractByAttr(fr, attr) {
  // @ts-ignore
  return [...fr.querySelectorAll(`[${attr}]`)];
}

export function getConstructorFor(component) {
  let constr = component.constructor;
  if (component.tagName.includes('-')) {
    constr = window.customElements.get(component.tagName.toLowerCase());
  }
  return constr;
}

/** @param {Object<string, string>} setObj */
export function toDslString(setObj) {
  let setsStr = '';
  for (let param in setObj) {
    setsStr += `${param}:${setObj[param]};`;
  }
  return setsStr;
}

/** @param {Object<string, string>} attrsObj */
export function attrsToString(attrsObj) {
  let attrsStr = '';
  for (let param in attrsObj) {
    attrsStr += ` ${param}="${attrsObj[param]}"`;
  }
  return attrsStr.trim();
}

/**
 * @param {any} element HTML element
 * @param {(this: GlobalEventHandlers, ev: MouseEvent) => any} handler
 * @param {String} [name]
 */
export function setAriaClick(element, handler, name) {
  name = name || element.textContent.trim();
  name && element.setAttribute('name', name);
  element.onclick = handler;
  element.onkeydown = (/** @type {KeyboardEvent} */ e) => {
    if (element.onclick === handler && (e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      if (handler && handler.constructor === Function) {
        // @ts-ignore
        handler(e);
      }
    }
  };
}

/** @param {HTMLElement} el */
export function clearElement(el) {
  while (el.firstChild) {
    el.firstChild.remove();
  }
}
