import { extend } from '../../core/extend.js';
import { cssTokensExt } from '../../extensions/cssTokensExt.js';
import { ruleTokensExt } from '../../extensions/ruleTokensExt.js';
import { tagManageExt } from '../../extensions/tagManageExt.js';

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
