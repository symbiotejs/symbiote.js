import { BaseComponent } from '../../core/BaseComponent.js';
import { applyElementStyles, addExternalStyles } from '../../core/css_utils.js';

class MyApp extends BaseComponent {
  constructor() {
    super();

    applyElementStyles(this, {
      color: 'var(--color)',
    });

    addExternalStyles(this, 'example.css');
  }
}

window.customElements.define('my-app', MyApp);
