import { extractByAttr } from './render_utils.js';
import { CssList } from './CssList.js';
import { DICT } from './dictionary.js';

const vElement = document.createElement('span');
const styleAttr = 'style';

/**
 * @param {HTMLElement} element
 * @param {String} src
 */
export function addExternalStyles(element, src) {
  return new Promise((resolve, reject) => {
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = src;
    link.onload = () => {
      resolve();
    };
    link.onerror = () => {
      link.remove();
      reject();
    };
    if (!element.shadowRoot) {
      element.attachShadow({
        mode: 'open',
      });
    }
    element.shadowRoot.prepend(link);
    if (!element.shadowRoot.querySelector('slot')) {
      let slot = document.createElement('slot');
      element.shadowRoot.appendChild(slot);
    }
  });
}

/**
 * @param {DocumentFragment | HTMLElement} fragment
 * @param {Object<string, Object<string, any>>} stylesObj
 * @param {String} [styleAttrName]
 */
export function applyFragmentStyles(fragment, stylesObj, styleAttrName = DICT.CSS_ATTR) {
  extractByAttr(fragment, styleAttrName).forEach((/** @type {HTMLElement} */ el) => {
    el[DICT.CSS_LIST] = new CssList({
      element: el,
      cssMap: stylesObj,
    });
  });
}

/**
 * @param {HTMLElement | SVGElement} element
 * @param {Object<string, any>} styles
 */
export function applyElementStyles(element, styles) {
  for (let styleProp in styles) {
    let value = styles[styleProp];
    if (styleProp.indexOf('--') === 0) {
      element.style.setProperty(styleProp, value);
    } else {
      element.style[styleProp] = value;
    }
  }
}

/**
 * @param {HTMLElement | SVGElement} element
 * @param {Object<string, any>} styles
 */
export function replaceElementStyles(element, styles) {
  vElement.removeAttribute(styleAttr);
  applyElementStyles(vElement, styles);
  element.setAttribute(styleAttr, vElement.getAttribute(styleAttr));
}

/**
 * @param {HTMLElement} element
 * @param {String} propName
 */
export function getCssValue(element, propName) {
  let style = window.getComputedStyle(element);
  return style.getPropertyValue(propName);
}

/**
 * @param {any} cssObj
 * @param {Set} tokenSet
 * @param {Object<string, any>} [mix]
 */
export function mergeCss(cssObj, tokenSet, mix = {}) {
  let merged = {};
  tokenSet.forEach((name) => {
    merged = { ...merged, ...cssObj[name.trim()], ...mix };
  });
  return merged;
}
