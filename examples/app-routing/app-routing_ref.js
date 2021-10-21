import { BaseComponent } from '../../core/BaseComponent.js';
import { AppRouter } from '../../core/AppRouter.js';

AppRouter.createRouterData('router', {
  home: {
    title: 'Home',
    default: true,
  },
  contacts: {
    title: 'Contacts',
  },
  error: {
    title: 'Error',
    error: true,
  },
});

class MyApp extends BaseComponent {
  init$ = {
    options: JSON.stringify({}),
    onHome: () => {
      AppRouter.applyRoute('home');
    },
    onContacts: () => {
      AppRouter.applyRoute('contacts', {
        option1: true,
        option2: 'my value',
      });
    },
  }

  initCallback() {
    this.sub('router/options', (opt) => {
      console.log(opt);
      this.$.options = JSON.stringify(opt, null, 2);
    });
  }
}

MyApp.template = /*html*/ `
<div>
  <button set="onclick: onHome">Home</button>
  <button set="onclick: onContacts">Contacts</button>
  <a href="?wrong"><button>WRONG ROUTE</button></a>
</div>
<div>Current route: <span set="textContent: router/route"></span></div>
<div set="textContent: options" style="white-space: pre"></div>
`;

MyApp.reg('my-app');