import { BaseComponent } from '../../core/BaseComponent.js';

class Com1 extends BaseComponent {}
Com1.template = /*html*/ `<button>Component 1</button>`;

class Com2 extends BaseComponent {}
Com2.template = /*html*/ `<button>Component 2</button>`;

class MyApp extends BaseComponent {}
MyApp.template = /*html*/ `
  <${Com1.is}></${Com1.is}>
  <${Com2.is}></${Com2.is}>
`;
MyApp.reg('my-app');