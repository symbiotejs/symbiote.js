import Symbiote, { html, css } from '../../core/index.js';

class DsdDemo extends Symbiote {
  ssrMode = true;
  renderShadow = true;

  init$ = {
    greeting: 'Hello from DSD!',
    count: 0,
    onIncrement: () => {
      this.$.count++;
    },
  };
}

DsdDemo.template = html`
  <span class="greeting">{{greeting}}</span>
  <span class="count">Count: <b>{{count}}</b></span>
  <button ${{onclick: 'onIncrement'}}>+1</button>
`;

DsdDemo.shadowStyles = css`
  :host {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--card-bg, #1e1e2e);
    border-radius: 8px;
    color: #cdd6f4;
    font-family: inherit;
  }
  .greeting {
    color: #a6e3a1;
    font-weight: 600;
  }
  .count b {
    color: #89b4fa;
  }
  button {
    padding: 4px 12px;
    border: 1px solid #45475a;
    border-radius: 6px;
    background: #313244;
    color: #cdd6f4;
    cursor: pointer;
  }
  button:hover {
    background: #45475a;
  }
`;

DsdDemo.reg('dsd-demo');
