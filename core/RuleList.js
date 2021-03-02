import { TokenList } from './TokenList.js';
import { DICT } from './dictionary.js';

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
