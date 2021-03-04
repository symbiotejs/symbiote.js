import { extend } from '../../core/extend.js';
import { ruleTokensExt } from '../../extensions/ruleTokensExt.js';
import { DICT } from '../../core/dictionary.js';

let startTime = Date.now();
let Component = extend(ruleTokensExt);

class InnerEl extends Component {}

InnerEl.styles = {
  ':host': {
    display: 'inline-flex',
  },
};

InnerEl.template = /*html*/ `
<li>INNER ELEMENT</li>
`;
window.customElements.define('inner-el', InnerEl);

class TestApp extends Component {}

TestApp.styles = {
  ':host': {
    display: 'block',
  },
  a: {
    border: '1px solid currentColor',
    transition: '0.2s',
    margin: '10px',
  },
  b: {
    fontSize: '24px',
  },
  c: {
    padding: '20px',
  },
  d: {
    color: '#eee',
  },
  e: {
    cursor: 'pointer',
    backgroundColor: '#f00',
    color: '#fff',
  },
  za: {
    color: '#00f',
    backgroundColor: '#eee',
  },
  we: {
    filter: 'blur(2px)',
  },
};

const dStyle = {
  a: {
    focus: {
      add: 'we za',
    },
    blur: {
      remove: 'za we',
    },
  },
  b: {
    mouseover: {
      add: 'e',
    },
    mouseout: {
      remove: 'e',
    },
  },
};

TestApp.dynamicStylingRules = dStyle;
let eltpl = /*html*/ `
<inner-el tabindex="0" ${DICT.CSS_ATTR}="a b c d" ${DICT.RULE_ATTR}="a b">CSS TOKEN TEST</inner-el>
`;
let tpl = '';
for (let i = 0; i < 1000; i++) {
  tpl += eltpl;
}
TestApp.template = tpl;
window.customElements.define('test-app', TestApp);

window.requestAnimationFrame(() => {
  window.setTimeout(() => {
    console.log(Date.now() - startTime);
  });
});
