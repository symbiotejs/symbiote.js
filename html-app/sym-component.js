import BaseClass from './BaseClass.js';
import { registerDeclaration } from './declarations.js';

export class SymComponent extends BaseClass {
  connectedCallback() {
    if (this.hasAttribute('reg')) {
      registerDeclaration(this, this.Symbiote);
      return;
    }
    super.connectedCallback();
  }

  connectFoundation() {
    if (!this.hasAttribute('reg')) {
      super.connectFoundation();
    }
  }
}

export default SymComponent;
