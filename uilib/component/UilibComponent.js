import { extend } from '../../core/extend.js';
import { tagManageExt } from '../../extensions/tagManageExt.js';
import { ruleTokensExt } from '../../extensions/ruleTokensExt.js';

export const UilibComponent = extend(tagManageExt, ruleTokensExt);
