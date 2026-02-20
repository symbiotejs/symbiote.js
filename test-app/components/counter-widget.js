import Symbiote, { html, css } from '../../core/index.js';

class CounterWidget extends Symbiote {
  init$ = {
    count: 0,
    '+doubled': () => {
      console.log('doubled');
      return this.$.count * 2;
    },
    '+triple': () => {
      console.log('triple');
      return this.$.count * 3;
    },
    '+label': () => {
      console.log('label');
      let c = this.$.count;
      return c === 1 ? '1 click' : `${c} clicks`;
    },
    onIncrement: () => { this.$.count++; },
    onDecrement: () => { this.$.count--; },
    onReset: () => { this.$.count = 0; },
  };
}

CounterWidget.template = html`
  <button ${{onclick: 'onDecrement'}}>−</button>
  <span class="value-display">{{count}}</span>
  <button ${{onclick: 'onIncrement'}}>+</button>
  <button ${{onclick: 'onReset'}}>Reset</button>
  <span class="computed-label">{{+label}}</span>
  <span class="computed-label">Doubled: <span class="value-display small">{{+doubled}}</span></span>
  <span class="computed-label">Triple: <span class="value-display small">{{+triple}}</span></span>
`;

CounterWidget.rootStyles = css`
  counter-widget {
    display: flex;
    align-items: center;
    gap: 12px;

    & .computed-label {
      margin-left: 8px;
      font-size: 12px;
      color: var(--text-muted);
    }

    & .value-display.small {
      font-size: 13px;
    }
  }
`;

CounterWidget.reg('counter-widget');
