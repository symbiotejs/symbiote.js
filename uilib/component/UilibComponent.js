import { BaseComponent } from '../../core/BaseComponent.js';
import { tagManageExt } from '../../core/extensions/tagManageExt.js';
import { ruleTokensExt } from '../../core/extensions/ruleTokensExt.js';

export const UilibComponent = tagManageExt(ruleTokensExt(BaseComponent));
