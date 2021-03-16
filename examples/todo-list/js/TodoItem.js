import { AppComponent } from './AppComponent.js';
import { ITEM_STYLES } from './styles.js';

export class TodoItem extends AppComponent {
  constructor(itemData) {
    super();
    this.state = {
      id: 0,
      name: itemData?.name || '',
      focused: false,
    };
  }
  connectedCallback() {
    super.connectedCallback();
    TodoItem.instances.add(this);
    this.state.name = `[ ${TodoItem.instances.size} ] ${this.state.name || 'New Task...'}`;
    this.onclick = () => {
      this.state.focused = true;
      TodoItem.instances.forEach((inst) => {
        if (inst !== this) {
          inst.state.focused = false;
        }
      });
    };
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    TodoItem.instances.delete(this);
  }
}

TodoItem.styles = ITEM_STYLES;

TodoItem.template = /*html*/ `
<div css="heading" contenteditable="true" set="textContent: name"></div>
<div css="task_description" contenteditable="true">Task description...</div>
`;

TodoItem.instances = new Set();
