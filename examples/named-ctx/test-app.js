import { BaseComponent } from '../../core/BaseComponent.js';

import { State } from '../../core/State.js';

State.registerNamedCtx('ctx', {
  text: 'MY TEXT',
});

class TestApp extends BaseComponent {}

TestApp.template = /*html*/ `
<div set="textContent: [ctx]text"></div>
`;

window.customElements.define('test-app', TestApp);

const state = State.getNamedCtx('ctx');
window.setInterval(() => {
  state.pub('text', 'MY TEXT :: ' + Date.now());
}, 1000);
