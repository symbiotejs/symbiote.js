import { extend } from '../../core/extend.js';
import { tagManageExt } from '../../extensions/tagManageExt.js';
import { ruleTokensExt } from '../../extensions/ruleTokensExt.js';
import { Tpl } from '../../core/Tpl.js';
import { applyElementStyles } from '../../core/css_utils.js';

import { SelectUi } from '../../uilib/primitives/select/SelectUi.js';

const Component = extend(tagManageExt, ruleTokensExt);

const STYLES = {
  ':host': {
    display: 'block',
    padding: '20px',
    backgroundColor: '#eee',
    color: '#212121',
    userSelect: 'none',
  },

  item: {
    display: 'block',
    padding: '20px',
    transition: '0.2s',
    marginTop: '10px',
    border: '1px solid currentColor',
  },

  'item-remove-btn': {
    display: 'inline-flex',
    padding: '10px',
    backgroundColor: '#f00',
    color: '#fff',
    margin: '20px',
    cursor: 'pointer',
  },

  title: {
    padding: '20px',
    border: '1px solid currentColor',
  },
};

class ListItem extends Component {
  constructor() {
    super();
    this.state = {
      removeItem: () => {
        console.log('REMOVE');
      },
    };
    applyElementStyles(this, STYLES.item);
  }
}
ListItem.dslAttribute = 'bind';
ListItem.template = /*html*/ `<div bind="onclick: *removeItem; @title: *title; textContent: *removeBtnTxt"></div>
<slot></slot>`;
// @ts-ignore
ListItem.defineTag('list-item');

/** @param {Object<string, any>[]} data */
function getListTpl(data) {
  let tpl = '';
  data.forEach((item, idx) => {
    tpl += /*html*/ `
      <list-item set="dataCtxProvider: ctxProvider" idx="${idx}">(${idx + 1}) ${item.title}</list-item>
    `;
  });
  return new Tpl(tpl).clone();
}

class MyApp extends Component {
  constructor() {
    super();

    this._data = [
      {
        title: 'First list item',
      },
      {
        title: 'Second list item',
      },
    ];

    this.state = {
      ctxProvider: this,
      title: 'Todo List [+]',
      removeBtnTxt: '[-]',
      list: getListTpl(this._data),

      addItem: () => {
        this._data.push({
          title: 'List item ' + Date.now(),
        });
        this.state.list = getListTpl(this._data);
      },

      removeItem: (e) => {
        let idx = e.target.getAttribute('idx');
        this._data.splice(idx, 1);
        this.state.list = getListTpl(this._data);
      },
    };
  }
}
MyApp.renderShadow = true;
MyApp.styles = STYLES;
MyApp.template = /*html*/ `
<${SelectUi.is} options="RU, ENG"></${SelectUi.is}>
<div set="textContent: title; onclick: addItem;"></div>
<div set="innerFragment: list"></div>
`;
MyApp.is = 'my-app';
