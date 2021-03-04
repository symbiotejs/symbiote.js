import { extend } from '../../core/extend.js';
import { cssTokensExt } from '../../extensions/cssTokensExt.js';
import { ruleTokensExt } from '../../extensions/ruleTokensExt.js';
import { tagManageExt } from '../../extensions/tagManageExt.js';

/** @param {typeof import('../../core/BaseComponent').BaseComponent} classObj */
function customExtension(classObj) {
  return class extends classObj {
    static processExtendedFragment(fnCtx, /** @type {DocumentFragment} */ fr) {
      super.processExtendedFragment(fnCtx, fr);
      let elements = [...fr.querySelectorAll('div')];
      elements.forEach((el) => {
        console.log(el);
      });
    }
  };
}

const Component = extend(cssTokensExt, ruleTokensExt, tagManageExt, customExtension);

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
