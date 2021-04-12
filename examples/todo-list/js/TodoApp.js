import { AppComponent } from './AppComponent.js';

import { ButtonUi } from '../../../uilib/primitives/button/ButtonUi.js';
import { SelectUi } from '../../../uilib/primitives/select/SelectUi.js';

import { ICONS } from './icons.js';
import { APP_STYLES } from './styles.js';
import { Data } from './Data.js';

import { TodoItem } from './TodoItem.js';

TodoItem.defineTag('todo-item');
// ButtonUi.defineTag('my-btn');

/** @param {Array} data */
function getColumnFragment(data) {
  let fr = new DocumentFragment();
  data.forEach((itemData) => {
    let itm = new TodoItem(itemData);
    fr.appendChild(itm);
  });
  return fr;
}

let todoData = [{ name: 'Go shopping' }, { name: 'Play game' }, { name: 'Kill neighbor' }];

class TodoApp extends AppComponent {
  constructor() {
    super();
    this.state = {
      addClicked: () => {
        console.log('ADD');
        todoData.push({
          name: 'New Task',
        });
        this['todo-col'].innerHTML = '';
        this['todo-col'].appendChild(getColumnFragment(todoData));
        window.requestAnimationFrame(() => {
          this['todo-col'].lastChild.scrollIntoView({
            behavior: 'smooth',
          });
        });
      },
    };
  }

  readyCallback() {
    super.readyCallback();
    this['todo-col'].appendChild(getColumnFragment(todoData));
  }
}
TodoApp.styles = APP_STYLES;
TodoApp.template = /*html*/ `
<div css="toolbar">
  <${ButtonUi.is} icon="${ICONS.plus}" text="Create New Task" set="onclick: addClicked"></${ButtonUi.is}>
  <div></div>
  <${SelectUi.is} options="ENG, RU"></${SelectUi.is}>
  <${SelectUi.is} options="Dark, Light"></${SelectUi.is}>
</div>
<div css="columns">
  <div css="col" caption="TODO" ref="todo-col"></div>
  <div css="col" caption="IN PROGRESS" ref="progress-col"></div>
  <div css="col" caption="DONE" ref="done-col"></div>
</div>
`;
TodoApp.defineTag('todo-app');
