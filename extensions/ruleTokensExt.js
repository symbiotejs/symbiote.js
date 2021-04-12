import { TokenList } from '../core/TokenList.js';
import { CssList, CssExtTpl, cssTokensExt } from './cssTokensExt.js';
import { DICT } from '../core/dictionary.js';

import { extractByAttr, clearElement } from '../core/render_utils.js';
import { FN } from '../core/fn_map.js';

export class RuleList extends TokenList {
  /** @param {RuleList} fnCtx */
  static clearHandlers(fnCtx) {
    for (let rule in fnCtx.handlerMap) {
      fnCtx.element.removeEventListener(rule, fnCtx.handlerMap[rule]);
      delete fnCtx.handlerMap[rule];
    }
  }

  /** @param {RuleList} fnCtx */
  static applyRules(fnCtx) {
    this.clearHandlers(fnCtx);
    fnCtx._set.forEach((ruleToken) => {
      let ruleSet = fnCtx.ruleMap[ruleToken];
      for (let rule in ruleSet) {
        let ruleDesc = ruleSet[rule];
        let handler = () => {
          for (let act in ruleDesc) {
            fnCtx.cssList[act](ruleDesc[act]);
          }
        };
        fnCtx.element.addEventListener(rule, handler);
        fnCtx.handlerMap[rule] = handler;
      }
    });
  }

  /**
   * @param {Object} init
   * @param {HTMLElement} init.element
   * @param {Object<string, any>} init.ruleMap
   * @param {String} [init.ruleVal]
   */
  constructor(init) {
    super();
    this.element = init.element;
    this.element[DICT.RULE_LIST] = this;
    this.ruleMap = init.ruleMap;
    this.cssList = this.element[DICT.CSS_LIST];
    this.handlerMap = {};
    this.updateCallback = () => {
      RuleList.applyRules(this);
    };
    this.value = init.ruleVal || this.element.getAttribute(DICT.RULE_ATTR) || '';
    this.element.removeAttribute(DICT.RULE_ATTR);
  }
}

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

/** @param {typeof import('../core/BaseComponent').BaseComponent} classObj */
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
