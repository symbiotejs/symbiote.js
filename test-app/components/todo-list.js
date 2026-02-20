import Symbiote, { html, css } from '../../core/index.js';
import './todo-item.js';

class TodoList extends Symbiote {
  init$ = {
    newText: '',
    todos: [],
    '+summary': () => {
      let total = this.$.todos.length;
      let done = this.$.todos.filter((t) => t.done).length;
      return total === 0 ? 'No items yet' : `${done}/${total} completed`;
    },
    onInput: (e) => {
      this.$.newText = e.target.value;
    },
    onAddTodo: () => {
      let text = this.$.newText.trim();
      if (!text) return;
      this.$.todos = [...this.$.todos, { text, done: false }];
      this.$.newText = '';
    },
    onKeydown: (e) => {
      if (e.key === 'Enter') this.$.onAddTodo();
    },
    onToggleItem: (e) => {
      let item = e.target.closest('todo-item');
      if (!item) return;
      let idx = [...this.ref.list.children].indexOf(item);
      let updated = [...this.$.todos];
      updated[idx] = { ...updated[idx], done: !updated[idx].done };
      this.$.todos = updated;
    },
    onRemoveItem: (e) => {
      let item = e.target.closest('todo-item');
      if (!item) return;
      let idx = [...this.ref.list.children].indexOf(item);
      let updated = [...this.$.todos];
      updated.splice(idx, 1);
      this.$.todos = updated;
    },
  };
}

TodoList.template = html`
  <div class="todo-input">
    <input type="text" placeholder="Add a task..." ${{value: 'newText', oninput: 'onInput', onkeydown: 'onKeydown'}}>
    <button primary ${{onclick: 'onAddTodo'}}>Add</button>
  </div>
  <div ${{itemize: 'todos', 'item-tag': 'todo-item', ref: 'list'}}></div>
  <div class="hint summary">{{+summary}}</div>
`;

TodoList.rootStyles = css`
  todo-list {
    display: block;

    & .todo-input {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    & input[type="text"] {
      flex: 1;
    }

    & .hint.summary {
      margin-top: 8px;
      font-size: 12px;
      color: var(--text-muted);
    }
  }
`;

TodoList.reg('todo-list');
