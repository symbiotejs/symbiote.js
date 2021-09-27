import { BaseComponent } from '../../core/BaseComponent.js';

class MyApp extends BaseComponent {

  static stateMap = {
    firstName: 'John',
  };

  static template = /*html*/ `
    <div 
      set="textContent: firstName, [EXT]firstName, [named]firstName;">
    </div>
  `;

}

MyApp.reg('my-app');

console.log(MyApp.template);