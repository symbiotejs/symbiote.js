import { extend } from '../../core/extend.js';
import { cssTokensExt } from '../../core/extensions/cssTokensExt.js';
import { ruleTokensExt } from '../../core/extensions/ruleTokensExt.js';
import { tagManageExt } from '../../core/extensions/tagManageExt.js';

const C1 = extend(cssTokensExt);
const C2 = extend(ruleTokensExt, cssTokensExt);
console.dir(C1);
console.dir(C2);
window.customElements.define('c-1', C1);
window.customElements.define('c-2', C2);
const c1 = new C1();
const c2 = new C2();
console.dir(c1.constructor);
console.dir(c2.constructor);
console.log(typeof c1);
console.log(typeof c2);

const Component = extend(cssTokensExt, ruleTokensExt, tagManageExt);

class TestApp extends Component {}

TestApp.styles = {
  block: {
    display: 'inline-block',
    padding: '20px',
    color: '#f00',
    border: '1px solid currentColor',
  },
  over: {
    color: '#fff',
    backgroundColor: '#f00',
  },
};
(TestApp.dynamicStylingRules = {
  block_rule: {
    mouseover: {
      add: 'over',
    },
    mouseout: {
      remove: 'over',
    },
  },
}),
  (TestApp.template = /*html*/ `
<div css="block" rule="block_rule">EXTEND REF</div> 
`);
// @ts-ignore
TestApp.defineTag('test-app');
