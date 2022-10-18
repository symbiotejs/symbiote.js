/** @typedef {Object<string, string | number | boolean>} StyleMap */

/** @typedef {Object<string, string | number | boolean>} AttrMap */

/** @typedef {Object<string, any>} PropMap */

/**
 * @template {SVGElement | HTMLElement} T
 * @param {T} el HTMLElement
 * @param {StyleMap} styleMap
 */
export function applyStyles(el, styleMap) {
  for (let prop in styleMap) {
    if (prop.includes('-')) {
      // @ts-ignore
      el.style.setProperty(prop, styleMap[prop]);
    } else {
      el.style[prop] = styleMap[prop];
    }
  }
}

/**
 * @template {SVGElement | HTMLElement} T
 * @param {T} el HTMLElement
 * @param {AttrMap} attrMap
 */
export function applyAttributes(el, attrMap) {
  for (let attrName in attrMap) {
    if (attrMap[attrName].constructor === Boolean) {
      if (attrMap[attrName]) {
        el.setAttribute(attrName, '');
      } else {
        el.removeAttribute(attrName);
      }
    } else {
      // @ts-ignore
      el.setAttribute(attrName, attrMap[attrName]);
    }
  }
}

/**
 * @typedef {{
 *   tag?: String;
 *   attributes?: AttrMap;
 *   styles?: StyleMap;
 *   properties?: PropMap;
 *   processors?: Function[];
 *   children?: ElementDescriptor[];
 * }} ElementDescriptor
 */

/**
 * @param {ElementDescriptor} [desc]
 * @returns {any}
 */
export function create(desc = { tag: 'div' }) {
  let el = document.createElement(desc.tag);
  if (desc.attributes) {
    applyAttributes(el, desc.attributes);
  }
  if (desc.styles) {
    applyStyles(el, desc.styles);
  }
  if (desc.properties) {
    for (let prop in desc.properties) {
      el[prop] = desc.properties[prop];
    }
  }
  if (desc.processors) {
    desc.processors.forEach((fn) => {
      fn(el);
    });
  }
  if (desc.children) {
    desc.children.forEach((desc) => {
      let child = create(desc);
      el.appendChild(child);
    });
  }
  return el;
}
