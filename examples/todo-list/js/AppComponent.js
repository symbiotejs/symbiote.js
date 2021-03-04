import { BaseComponent } from '../../../core/BaseComponent.js';
import { extend } from '../../../core/extend.js';
import { ruleTokensExt } from '../../../extensions/ruleTokensExt.js';
import { tagManageExt } from '../../../extensions/tagManageExt.js';

/*
 * This code contains temporary workaround for this TS inheritance chain issue:
 * https://github.com/microsoft/TypeScript/issues/41256
 * ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 * Hope that will be fixed in upcoming versions...
 */

const C1 = ruleTokensExt(BaseComponent);
const C2 = tagManageExt(BaseComponent);

/** @type {typeof C1 & typeof C2} */
// @ts-ignore
const Component = extend(tagManageExt, ruleTokensExt);

// @ts-ignore
export class AppComponent extends Component {}
