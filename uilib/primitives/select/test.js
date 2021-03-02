import { UilibComponent } from '../../component/UilibComponent.js';
import { SelectUi } from './SelectUi.js';

SelectUi.defineTag('select-ui');

class TestApp extends UilibComponent {
  constructor() {
    super();
    let options = {
      'First option': 0,
      'Second option': 1,
      'Third option': 2,
    };
    this.state = {
      options: Object.keys(options).join(),
      'on.change': (e) => {
        console.log(e);
      },
    };
  }
}
TestApp.styles = {
  outer: {
    padding: '20px',
    display: 'inline-block',
    minWidth: '31vw',
    boxSizing: 'border-box',
    border: '1px solid #ccc',
  },
  styled_outer: {
    '--rgb-1': '100, 0, 100',
    '--border-radius': '0',
  },
  styled_outer_1: {
    '--rgb-2': '40, 40, 40',
    '--rgb-1': '255, 255, 255',
    '--border-radius': '6px',
    backgroundColor: 'rgb(var(--rgb-2))',
  },
  styled_outer_2: {
    '--rgb-2': '40, 40, 60',
    '--rgb-1': '40, 250, 250',
    '--tap-size': '3em',
    '--font-size': '20px',
    '--border-radius': '20px',
    display: 'block',
    backgroundColor: 'rgb(var(--rgb-2))',
    color: 'rgb(var(--rgb-1))',
  },
};
let selectRefs = /*html*/ `
<select-ui set="options: options; onchange: on.change"></select-ui>
<div>&nbsp;</div>
<select-ui options="1st, 2nd, 3rd" set="onchange: on.change"></select-ui>
`;
TestApp.template = /*html*/ `
<div css="outer">
  ${selectRefs}
</div>
<div css="outer styled_outer">
  ${selectRefs}
</div>
<div css="outer styled_outer_1">
  ${selectRefs}
</div>
<div css="outer styled_outer_2">
  ${selectRefs}
</div>
`;
window.customElements.define('test-app', TestApp);
