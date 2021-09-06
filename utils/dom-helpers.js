/**
 * 
 * @typedef StyleMap
 * @type {Object<string, string | number>}
 */

/**
 * 
 * @typedef AttrMap
 * @type {Object<string, string | number | boolean>} 
 */

/**
 * 
 * @typedef PropMap
 * @type {Object<string, *>} 
 */

/**
 * 
 * @param {*} el HTMLElement
 * @param {StyleMap} styleMap 
 */
export function applyStyles(el, styleMap) {
  for (let prop in styleMap) {
    if (prop.includes('-')) {
      el.style.setProperty(prop, styleMap[prop]);
    } else {
      el.style[prop] = styleMap[prop];
    }
  }
};

/**
 * 
 * @param {*} el HTMLElement
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
      el.setAttribute(attrName, attrMap[attrName]);
    }
  }
};

/**
 * 
 * @typedef ElementDescriptor
 * @type {{
 *  tag?: String,
 *  attributes?: AttrMap, 
 *  styles?: StyleMap, 
 *  properties?: PropMap,
 *  processors?: Function[],
 *  children?: ElementDescriptor[],
 * }}
 */

/**
 * 
 * @param {ElementDescriptor} [desc] 
 * @returns {HTMLElement}
 */
export function create(desc = {tag: 'div'}) {
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