import { BaseComponent } from '../../core/BaseComponent.js';

class TestApp extends BaseComponent {}

TestApp.template = /*html*/ `
<span set="textContent: first-name"></span>
<span set="textContent: second-name"></span>
`;

TestApp.reflectToState(['first-name', 'second-name']);

window.customElements.define('test-app', TestApp);

// Based on LitElement landing page exmample (https://lit-element.polymer-project.org/):

// import { LitElement, html, property, customElement } from 'lit-element';
// @customElement('simple-greeting')
// export class SimpleGreeting extends LitElement {
//   @property() name = 'World';
//   render() {
//     return html`<p>Hello, ${this.name}!</p>`;
//   }
// }

class SimpleGreeting extends BaseComponent {}
SimpleGreeting.reflectToState(['name']);
SimpleGreeting.template = /*html*/ `<p>Hello, <span set="textContent: name"></span>!</p>`;
window.customElements.define('simple-greeting', SimpleGreeting);

// Extended example:

class ExtendedRef extends BaseComponent {
  constructor() {
    super();
    this.state = {
      myProp: 'STATE PROP VALUE',

      // Warning! You need to make explicit definition for reflected attribute if state is described:
      'reflected-attribute': '',
    };
  }

  set 'observed-attribute'(val) {
    console.log(val);
  }
}

ExtendedRef.template = /*html*/ `
<div set="textContent: myProp"></div>
<div set="textContent: reflected-attribute"></div>
`;

ExtendedRef.observeAttributes(['observed-attribute']);

ExtendedRef.reflectToState(['reflected-attribute']);

window.customElements.define('extended-ref', ExtendedRef);
