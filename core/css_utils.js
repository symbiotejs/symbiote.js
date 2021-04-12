const vElement = document.createElement('span');
const styleAttr = 'style';

/**
 * Converts string `foo: bar; back: url(data:image/svg+xml;base64,)`
 * to an array `['foo: bar, back: url(data:image/svg+xml;base64,)']`
 *
 * @param  {string} style
 * @return {string[]}
 */
const splitStyleByDeclaration = style => {
  if(style.lastIndexOf(';') === style.length - 1) {
    style = style.substring(0, style.length - 1)
  }
  return style.split('; ')
}

/**
 * Converts string `back: url(data:image/svg+xml;base64,)`
 * to an array `['back', 'url(data:image/svg+xml;base64,)']`
 *
 * @param  {string} declaration
 * @return {[string, string]}
 */
const splitDeclaration = declaration => {
  let splitterIdx = declaration.indexOf(':')
  let property = declaration.substring(0, splitterIdx).trim();
  let value = declaration.substring(splitterIdx + 1, declaration.length).trim();

  return [property, value]
}

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
  let newStyleMap = Object.create(null);
  let newStyleStr = vElement.getAttribute(styleAttr);
  let oldStylesSet = new Set();
  let oldStyleStr = element.getAttribute(styleAttr);
  if (oldStyleStr) {
    splitStyleByDeclaration(oldStyleStr).forEach((declaration) => {
      let cssProp = splitDeclaration(declaration)[0]
      if (cssProp) {
        oldStylesSet.add(cssProp);
      }
    });
  }
  if (newStyleStr) {
    splitStyleByDeclaration(newStyleStr).forEach((declaration) => {
      let [property, value] = splitDeclaration(declaration);
      newStyleMap[property] = value;
    });
  }
  oldStylesSet.forEach((prop) => {
    if (!newStyleMap[prop]) {
      element.style.removeProperty(prop);
    }
  });
  for (let prop in newStyleMap) {
    element.style.setProperty(prop, newStyleMap[prop]);
  }
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
