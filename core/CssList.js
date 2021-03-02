import { TokenList } from './TokenList.js';
import { mergeCss, applyElementStyles, replaceElementStyles } from './css_utils.js';
import { getConstructorFor } from './render_utils.js';
import { DICT } from './dictionary.js';

export class CssList extends TokenList {
  /** @param {CssList} fnCtx */
  static update(fnCtx) {
    let cssObj = mergeCss(fnCtx.cssMap, fnCtx._set, fnCtx.defaultsMap);
    replaceElementStyles(fnCtx.element, cssObj);
  }

  /**
   * @param {Object} init
   * @param {HTMLElement} init.element
   * @param {Object<string, any>} init.cssMap
   * @param {String} [init.cssVal]
   */
  constructor(init) {
    super();
    this.cssMap = init.cssMap;
    this.value = init.element.getAttribute(DICT.CSS_ATTR);
    this.element = init.element;
    this.element[DICT.CSS_LIST] = this;
    this.element.removeAttribute(DICT.CSS_ATTR);
    this.defaultsMap = {};
    if (this.element.tagName.includes('-')) {
      // The following code extracts ":host" styles if they are.
      // this.element.constructor is HTMLElement at this stage. So:
      let constr = getConstructorFor(this.element);
      if (constr && constr !== HTMLElement) {
        this.defaultsMap = (constr[DICT.STYLES_FLD] && constr[DICT.STYLES_FLD][DICT.HOST_CSS_TOKEN]) || {};
      }
    }
    this.updateCallback = () => {
      CssList.update(this);
    };
  }

  /**
   * Template initial template styles rendering:
   *
   * @param {HTMLElement} tplEl
   * @param {Object<string, any>} cssTokenMap
   */
  static initTemplateElement(tplEl, cssTokenMap) {
    let tokenList = new Set((tplEl.getAttribute(DICT.CSS_ATTR) || '').split(' '));
    let cssMap = mergeCss(cssTokenMap, tokenList);
    applyElementStyles(tplEl, cssMap);
  }
}
