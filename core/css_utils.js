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
  let styleStr = vElement.getAttribute(styleAttr);
  styleStr.split(';').forEach((keyVal) => {
    let kvArr = keyVal.split(':').map((str) => str.trim());
    if (kvArr.length === 2) {
      element.style.setProperty(kvArr[0], kvArr[1]);
    }
  });
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
