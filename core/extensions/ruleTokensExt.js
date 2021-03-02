import { CssList } from '../CssList.js';
import { DICT } from '../dictionary.js';
import { CssExtTpl, cssTokensExt } from './cssTokensExt.js';
import { RuleList } from '../RuleList.js';
import { extractByAttr, clearElement } from '../render_utils.js';
import { FN } from '../fn_map.js';

class RuleExtTpl extends CssExtTpl {
  setRuleMap(ruleMap) {
    this.ruleMap = ruleMap;
  }

  clone() {
    let fr = super.clone();
    if (this.ruleMap) {
      extractByAttr(fr, DICT.RULE_ATTR).forEach((/** @type {HTMLElement} */ element) => {
        new RuleList({
          element,
          ruleMap: this.ruleMap,
        });
      });
    }
    return fr;
  }
}

/** @param {typeof import('../BaseComponent').BaseComponent} classObj */
export function ruleTokensExt(classObj) {
  return class extends cssTokensExt(classObj) {
    static set dynamicStylingRules(ruleMap) {
      this.__dynamicCssRulesMap = ruleMap;
      if (this.__tpl) {
        this.__tpl.setRuleMap(ruleMap);
      }
    }

    static get dynamicStylingRules() {
      return this.__dynamicCssRulesMap || {};
    }

    /** @param {String} tpl */
    static set template(tpl) {
      this.__tpl = new RuleExtTpl(tpl);
      if (this.styles) {
        this.__tpl.initCssTokens(this.styles);
      }
      if (this.dynamicStylingRules) {
        this.__tpl.setRuleMap(this.dynamicStylingRules);
      }
    }

    /**
     * @param {String} refName
     * @returns {CssList}
     */
    ruleListFor(refName) {
      let refEl = this.ref(refName);
      if (!refEl) {
        return null;
      }
      if (!refEl[DICT.RULE_LIST]) {
        new RuleList({
          element: refEl,
          ruleMap: this.constructor['dynamicStylingRules'],
        });
      }
      return refEl[DICT.RULE_LIST];
    }

    /**
     * @param {any} fnCtx
     * @param {HTMLElement} el
     * @param {String | DocumentFragment} val
     */
    static __processSubtreeSubscribtion(fnCtx, el, val) {
      let tpl = new RuleExtTpl(val);
      if (this.styles) {
        tpl.initCssTokens(this.styles);
      }
      if (this.dynamicStylingRules) {
        tpl.setRuleMap(this.dynamicStylingRules);
      }
      let fr = tpl.clone();
      FN.parseFr(fnCtx, fr);
      clearElement(el);
      el.appendChild(fr);
    }
  };
}
