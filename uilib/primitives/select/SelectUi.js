import { UilibComponent } from '../../component/UilibComponent.js';
import { ButtonUi } from '../button/ButtonUi.js';

const DROP_ICON = 'M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z';

export class SelectUi extends UilibComponent {
  constructor() {
    super();
    this.state = {
      text: '',
      'html.select': '',
      'on.click': (e) => {
        this._sel.dispatchEvent(new Event('click'));
      },
      'on.change': (e) => {
        this.state.text = this._sel.value;
        this.value = this._sel.value;
        this.dispatchEvent(new Event(e));
      },
    };
  }

  readyCallback() {
    super.readyCallback();
    this.defineAccessor('options', (optStr) => {
      let html = '';
      if (optStr) {
        let optArr = optStr.split(',');
        optArr.forEach((option) => {
          html += /*html*/ `<option>${option.trim()}</option>`;
        });
      }
      this.state['html.select'] = html;
    });
    /** @type {HTMLSelectElement} */
    // @ts-ignore
    this._sel = this.ref('select-el');
    this.state.text = this._sel.value;
  }
}
SelectUi.attrs = ['options'];
SelectUi.styles = {
  ':host': {
    position: 'relative',
    display: 'inline-flex',
  },
  select: {
    position: 'absolute',
    display: 'block',
    height: '100%',
    width: '100%',
    opacity: '0',
    cursor: 'pointer',
  },
};
SelectUi.template = /*html*/ `
<${ButtonUi.is} reversed outline icon="${DROP_ICON}" set="@text: text; ariaClick: on.click"></${ButtonUi.is}>
<select ref="select-el" css="select" set="onchange: on.change; innerHTML: html.select"></select>
`;
