import Symbiote, { html, css } from '../../core/index.js';

class SharedProducer extends Symbiote {
  init$ = {
    onAddScore: () => {
      this.$['GAME/score'] = this.$['GAME/score'] + 10;
    },
    onResetScore: () => {
      this.$['GAME/score'] = 0;
    },
    onToggleMultiplier: () => {
      this.$['GAME/multiplier'] = this.$['GAME/multiplier'] === 2 ? 5 : 2;
    },
  };
}

SharedProducer.template = html`
  <div class="section-label">⬆ Producer (writes to GAME context)</div>
  <div class="row">
    <span class="label">Score:</span>
    <span class="value-display">{{GAME/score}}</span>
    <button ${{onclick: 'onAddScore'}}>+10</button>
    <button ${{onclick: 'onResetScore'}}>Reset</button>
  </div>
  <div class="row">
    <span class="label">Multiplier:</span>
    <span class="value-display">{{GAME/multiplier}}</span>
    <button ${{onclick: 'onToggleMultiplier'}}>Toggle (2/5)</button>
  </div>
`;

SharedProducer.rootStyles = css`
  shared-producer {
    display: block;
    padding: 12px;
    border-radius: var(--radius);
    border: 1px solid color-mix(in srgb, var(--accent-orange) 40%, var(--border));

    & .section-label {
      font-size: 12px;
      margin-bottom: 8px;
      font-weight: 600;
      color: var(--accent-orange);
    }
  }
`;

SharedProducer.reg('shared-producer');
