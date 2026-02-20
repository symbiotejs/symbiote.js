import Symbiote, { html, css } from '../../core/index.js';

class SharedConsumer extends Symbiote {
  init$ = {
    bonus: 100,
    '+totalScore': {
      deps: ['GAME/score', 'GAME/multiplier'],
      fn: () => this.$['GAME/score'] * this.$['GAME/multiplier'] + this.$.bonus,
    },
  };
}

SharedConsumer.template = html`
  <div class="section-label">⬇ Consumer (reads GAME via cross-context computed)</div>
  <div class="row">
    <span class="label">Local bonus:</span>
    <span class="value-display">{{bonus}}</span>
  </div>
  <div class="row">
    <span class="label">Total score:</span>
    <span class="value-display purple">{{+totalScore}}</span>
    <span class="hint">(score × multiplier + bonus)</span>
  </div>
`;

SharedConsumer.rootStyles = css`
  shared-consumer {
    display: block;
    padding: 12px;
    border-radius: var(--radius);
    border: 1px solid color-mix(in srgb, var(--accent-purple) 40%, var(--border));

    & .section-label {
      font-size: 12px;
      margin-bottom: 8px;
      font-weight: 600;
      color: var(--accent-purple);
    }

    & .value-display.purple {
      color: var(--accent-purple);
    }

    & .hint {
      font-size: 11px;
      color: var(--text-muted);
    }
  }
`;

SharedConsumer.reg('shared-consumer');

