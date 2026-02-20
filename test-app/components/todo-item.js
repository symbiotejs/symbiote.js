import Symbiote, { html, css } from '../../core/index.js';

class TodoItem extends Symbiote {
  init$ = {
    text: '',
    done: false,
  };
}

TodoItem.template = html`
  <span ${{textContent: 'text', '@done': 'done'}}></span>
  <button ${{onclick: '^onToggleItem'}}>✓</button>
  <button ${{onclick: '^onRemoveItem'}}>✕</button>
`;

TodoItem.rootStyles = css`
  todo-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 6px;
    transition: background 0.15s;

    &:hover {
      background: color-mix(in srgb, var(--text) 5%, transparent);
    }

    & [done] {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    & span {
      flex: 1;
      font-size: 14px;
    }

    & button {
      font-size: 11px;
      padding: 3px 8px;
    }
  }
`;

TodoItem.reg('todo-item');
