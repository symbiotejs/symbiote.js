import Symbiote, { html, css } from '../../core/index.js';
import { slotProcessor } from '../../core/slotProcessor.js';

class TestSection extends Symbiote {
  init$ = {
    title: '',
    statusText: '',
    statusType: 'pass',
  };

  constructor() {
    super();
    this.templateProcessors.add(slotProcessor);
  }
}

TestSection.bindAttributes({
  title: 'title',
});

TestSection.template = html`
  <h2>
    <span>{{title}}</span>
    <span ${{textContent: 'statusText', '@status': 'statusType'}}></span>
  </h2>
  <slot></slot>
`;

TestSection.rootStyles = css`
  test-section {
    display: block;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 16px;

    & h2 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    & [status] {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;

      &[status="pass"] {
        background: color-mix(in srgb, var(--accent-green) 15%, transparent);
        color: var(--accent-green);
      }
      &[status="fail"] {
        background: color-mix(in srgb, var(--accent-red) 15%, transparent);
        color: var(--accent-red);
      }
    }
  }
`;

TestSection.reg('test-section');
