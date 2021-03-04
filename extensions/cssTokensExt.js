import { DICT } from '../core/dictionary.js';
import { Tpl } from '../core/Tpl.js';
import { TokenList } from '../core/TokenList.js';
import { mergeCss, applyElementStyles, replaceElementStyles } from '../core/css_utils.js';
import { extractByAttr, clearElement } from '../core/render_utils.js';
import { FN } from '../core/fn_map.js';
import { getConstructorFor } from '../core/render_utils.js';

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

export class CssExtTpl extends Tpl {
  initCssTokens(cssMap) {
    this.cssMap = cssMap;
    extractByAttr(this.tplEl.content, DICT.CSS_ATTR).forEach((/** @type {HTMLElement} */ el) => {
      CssList.initTemplateElement(el, this.cssMap);
    });
  }

  clone() {
    let fr = super.clone();
    extractByAttr(fr, DICT.CSS_ATTR).forEach((/** @type {HTMLElement} */ element) => {
      if (this.cssMap) {
        new CssList({
          element,
          cssMap: this.cssMap,
        });
      }
    });
    return fr;
  }
}

/** @param {typeof import('../core/BaseComponent').BaseComponent} classObj */
export function cssTokensExt(classObj) {
  return class extends classObj {
    constructor() {
      super();

      if (this.constructor[DICT.STYLES_FLD] && this.constructor[DICT.STYLES_FLD][DICT.HOST_CSS_TOKEN]) {
        applyElementStyles(this, this.constructor[DICT.STYLES_FLD][DICT.HOST_CSS_TOKEN]);
      }
    }

    /** @param {Object<string, Object<string, any>>} stylesObj */
    static set styles(stylesObj) {
      this.__styles = stylesObj;
      if (this.__tpl) {
        this.__tpl.initCssTokens(this.styles);
      }
    }

    static get styles() {
      return this.__styles;
    }

    /** @param {String} tpl */
    static set template(tpl) {
      this.__tpl = new CssExtTpl(tpl);
      if (this.styles) {
        this.__tpl.initCssTokens(this.styles);
      }
    }

    /**
     * @param {String} refName
     * @returns {CssList}
     */
    cssTokenListFor(refName) {
      let refEl = this.ref(refName);
      if (!refEl) {
        return null;
      }
      if (!refEl[DICT.CSS_LIST]) {
        new CssList({
          element: refEl,
          cssMap: this.constructor[DICT.STYLES_FLD],
        });
      }
      return refEl[DICT.CSS_LIST];
    }

    /**
     * @param {any} fnCtx
     * @param {HTMLElement} el
     * @param {String | DocumentFragment} val
     */
    static __processSubtreeSubscribtion(fnCtx, el, val) {
      let tpl = new CssExtTpl(val);
      if (this.styles) {
        tpl.initCssTokens(this.styles);
      }
      let fr = tpl.clone();
      FN.parseFr(fnCtx, fr);
      clearElement(el);
      el.appendChild(fr);
    }
  };
}
