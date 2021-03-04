import { extend } from '../../../core/extend.js';
import { ruleTokensExt } from '../../../extensions/ruleTokensExt.js';
import { tagManageExt } from '../../../extensions/tagManageExt.js';

export class AppComponent extends extend(tagManageExt, ruleTokensExt) {}
