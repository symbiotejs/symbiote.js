import { BaseComponent } from '../../core/BaseComponent.js';
import { applyElementStyles } from '../../core/css_utils.js';

class MyApp extends BaseComponent {
  constructor() {
    super();
    // @ts-ignore
    applyElementStyles(this, {
      position: 'fixed',
      top: '0',
      bottom: '0',
      left: '0',
      right: '0',
      display: 'grid',
      gridTemplateRows: 'min-content 1fr min-content',
    });
  }
}

MyApp.template = /*html*/ `
<div>
  <slot name="header"></slot>
</div>
<div>
  <slot></slot>
</div>
<div>
  <slot name="footer"></slot>
</div>
`;
window.customElements.define('my-app', MyApp);

class MyBlock extends BaseComponent {
  constructor() {
    super();

    // @ts-ignore
    applyElementStyles(this, {
      display: 'block',
      padding: '20px',
      height: '100%',
      border: '1px solid currentColor',
      boxSizing: 'border-box',
    });
  }
}
MyBlock.template = /*html*/ `<slot></slot>`;
window.customElements.define('my-block', MyBlock);
