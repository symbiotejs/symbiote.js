import { extend } from '../../core/extend.js';
import { BaseComponent } from '../../core/BaseComponent.js';
import { tagManageExt } from '../../extensions/tagManageExt.js';
import { ruleTokensExt } from '../../extensions/ruleTokensExt.js';

export const UilibComponent = extend(tagManageExt, ruleTokensExt);
// export const UilibComponent = tagManageExt(ruleTokensExt(BaseComponent));
