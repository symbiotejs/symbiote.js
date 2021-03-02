import { DICT } from '../dictionary.js';
import { Tpl } from '../Tpl.js';
import { CssList } from '../CssList.js';
import { applyElementStyles } from '../css_utils.js';
import { extractByAttr, clearElement } from '../render_utils.js';
import { FN } from '../fn_map.js';

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

/** @param {typeof import('../BaseComponent').BaseComponent} classObj */
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
