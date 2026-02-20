import Symbiote, { html, css, PubSub } from '../core/index.js';
import { slotProcessor } from '../core/slotProcessor.js';

// ═══════════════════════════════════════════════════════════
// 1. Shared named context (for cross-context computed test)
// ═══════════════════════════════════════════════════════════

PubSub.registerCtx({
  score: 0,
  multiplier: 2,
}, 'GAME');

// ═══════════════════════════════════════════════════════════
// 2. Counter widget — basic state + local computed
// ═══════════════════════════════════════════════════════════

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

CounterWidget.reg('counter-widget');

// ═══════════════════════════════════════════════════════════
// 3. Shared context producer — writes to GAME context
// ═══════════════════════════════════════════════════════════

class SharedProducer extends Symbiote {
  init$ = {
    'GAME/score': 0,
    'GAME/multiplier': 2,
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
  <div class="section-label producer">⬆ Producer (writes to GAME context)</div>
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

SharedProducer.reg('shared-producer');

// ═══════════════════════════════════════════════════════════
// 4. Shared context consumer — cross-context computed (3.x!)
// ═══════════════════════════════════════════════════════════

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
  <div class="section-label consumer">⬇ Consumer (reads GAME via cross-context computed)</div>
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

SharedConsumer.reg('shared-consumer');

// ═══════════════════════════════════════════════════════════
// 5. Todo item — for itemize API testing
// ═══════════════════════════════════════════════════════════

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

TodoItem.reg('todo-item');

// ═══════════════════════════════════════════════════════════
// 6. Todo list — itemize + local computed
// ═══════════════════════════════════════════════════════════

class TodoList extends Symbiote {
  init$ = {
    newText: '',
    todos: [],
    '+total': () => this.$.todos.length,
    '+doneCount': () => this.$.todos.filter((t) => t.done).length,
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

TodoList.reg('todo-list');

// ═══════════════════════════════════════════════════════════
// 7. Test section wrapper
// ═══════════════════════════════════════════════════════════

class TestSection extends Symbiote {
  init$ = {
    title: '',
    statusText: '',
    statusType: 'pass',
  };

  constructor() {
    super();
    this.addTemplateProcessor(slotProcessor);
  }
}

TestSection.template = html`
  <h2>
    <span>{{title}}</span>
    <span ${{textContent: 'statusText', '@status': 'statusType'}}></span>
  </h2>
  <slot></slot>
`;

TestSection.reg('test-section');

// ═══════════════════════════════════════════════════════════
// 8. Root app
// ═══════════════════════════════════════════════════════════

class TestApp extends Symbiote {
  init$ = {};

  renderCallback() {
    // Auto-verify: check computed props work after microtask
    queueMicrotask(() => {
      let consumer = this.querySelector('shared-consumer');
      if (consumer) {
        let total = consumer.$['+totalScore'];
        // Expected: 0 * 2 + 100 = 100
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
`;

TestApp.reg('test-app');

// ═══════════════════════════════════════════════════════════
// 9. Styling demo — rootStyles + shadowStyles
// ═══════════════════════════════════════════════════════════

class StyledDemo extends Symbiote {
  init$ = {
    hue: 220,
    onChangeHue: () => {
      this.$.hue = (this.$.hue + 30) % 360;
    },
  };

  renderCallback() {
    this.sub('hue', (h) => {
      this.style.setProperty('--demo-hue', h);
    });
  }
}

StyledDemo.template = html`
  <div class="demo-box">
    <div class="demo-gradient"></div>
    <div class="demo-text">Hue: {{hue}}°</div>
    <button ${{onclick: 'onChangeHue'}}>Rotate Hue</button>
  </div>
`;

StyledDemo.rootStyles = css`
  styled-demo {
    display: block;

    & .demo-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    & .demo-gradient {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(
        135deg,
        hsl(var(--demo-hue, 220) 80% 60%),
        hsl(calc(var(--demo-hue, 220) + 60) 80% 50%)
      );
      transition: background 0.3s;
    }

    & .demo-text {
      font-family: var(--font-mono);
      font-size: 14px;
      color: var(--accent);
    }
  }
`;

StyledDemo.reg('styled-demo');
