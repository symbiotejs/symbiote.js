import Symbiote, { html, css, PubSub } from '../core/index.js';

Symbiote.devMode = true;

import './components/counter-widget.js';
import './components/shared-producer.js';
import './components/shared-consumer.js';
import './components/todo-list.js';
import './components/test-section.js';
import './components/styled-demo.js';
import './components/router-demo.js';

PubSub.registerCtx({
  score: 0,
  multiplier: 2,
}, 'GAME');

class TestApp extends Symbiote {
  init$ = {};

  renderCallback() {
    queueMicrotask(() => {
      let consumer = this.querySelector('shared-consumer');
      if (consumer) {
        let total = consumer.$['+totalScore'];
        let section4 = this.querySelectorAll('test-section')[3];
        if (section4 && total === 100) {
          section4.$.statusText = 'Auto-verified';
          section4.$.statusType = 'pass';
        }
      }
    });
  }
}

TestApp.template = html`
  <div class="app-header">
    <h1>⚡ Symbiote.js 3.x Test App</h1>
    <p>Interactive verification of all major features</p>
  </div>

  <test-section title="1. Basic State & Local Computed" statusText="Interactive" statusType="pass">
    <div class="row">
      <span class="label">Counter:</span>
      <counter-widget></counter-widget>
    </div>
  </test-section>

  <test-section title="2. Itemize API + Computed" statusText="Interactive" statusType="pass">
    <todo-list></todo-list>
  </test-section>

  <test-section title="3. Named Context (PubSub)" statusText="Interactive" statusType="pass">
    <div class="grid-2">
      <shared-producer></shared-producer>
      <div class="grid-arrow">→</div>
    </div>
  </test-section>

  <test-section title="4. Cross-Context Computed (3.x)" statusText="Checking..." statusType="pass">
    <div class="grid-2">
      <div></div>
      <shared-consumer></shared-consumer>
    </div>
    <div class="hint">
      Uses { deps: ['GAME/score', 'GAME/multiplier'], fn: () => ... } syntax
    </div>
  </test-section>

  <test-section title="5. Styling (rootStyles / shadowStyles)" statusText="Visual" statusType="pass">
    <styled-demo></styled-demo>
  </test-section>

  <test-section title="6. AppRouter (path routing, guards, lazy load)" statusText="Interactive" statusType="pass">
    <router-demo></router-demo>
  </test-section>
`;

TestApp.rootStyles = css`
  test-app {
    display: block;
    max-width: 900px;
    margin: 0 auto;
    padding: 32px 24px;

    & .app-header {
      margin-bottom: 24px;

      & h1 {
        font-size: 24px;
        font-weight: 700;
        background: linear-gradient(135deg, var(--accent), var(--accent-purple));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      & p {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 4px;
      }
    }

    & .row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    & .label {
      font-size: 12px;
      color: var(--text-muted);
      min-width: 100px;
    }

    & .value-display {
      font-family: var(--font-mono);
      font-size: 15px;
      font-weight: 600;
      color: var(--accent);
      padding: 4px 0;
    }

    & .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    & .grid-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 20px;
    }

    & .hint {
      font-size: 11px;
      color: var(--text-muted);
    }
  }
`;

TestApp.reg('test-app');

