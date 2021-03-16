import { extend } from '../core/extend.js';
import { ruleTokensExt } from '../extensions/ruleTokensExt.js';
import { tagManageExt } from '../extensions/tagManageExt.js';

/**
 * @param {String} [template]
 * @param {String} [tag]
 * @param {Object<string, any>} [state]
 */
export function create(tag, template, state) {
  class Created extends extend(ruleTokensExt, tagManageExt) {
    constructor() {
      super();
      state && (this.state = state);
    }
  }
  template && (Created.template = template);
  state && Created.reflectToState(Object.keys(state));
  tag && Created.defineTag(tag);
  return Created;
}
