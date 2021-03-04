/*
 * This code contains temporary workaround for this TS inheritance chain issue:
 * https://github.com/microsoft/TypeScript/issues/41256
 * ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 * Hope that will be fixed in upcoming versions...
 *
 * !!! You should not import anything from here !!!
 */

import { BaseComponent } from './BaseComponent.js';
import { extend } from './extend.js';
import { channelsExt } from '../extensions/channelsExt.js';
import { ruleTokensExt } from '../extensions/ruleTokensExt.js';
import { tagManageExt } from '../extensions/tagManageExt.js';

const _Channels = channelsExt(BaseComponent);
const _Rule = ruleTokensExt(BaseComponent);
const _Tag = tagManageExt(BaseComponent);

/** @type {typeof _Channels & typeof _Rule & typeof _Tag} */
// @ts-ignore
const Component = extend(channelsExt, ruleTokensExt, tagManageExt);

// @ts-ignore
export class ExtendedBaseType extends Component {}
