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

const COLOR = {
  regular: '#0f0',
  error: '#f00',
};

class MyApp extends BaseComponent {
  init$ = {
    options: JSON.stringify({}),
    routeColor: COLOR.regular,
    onHome: () => {
      AppRouter.applyRoute('home');
    },
    onContacts: () => {
      AppRouter.applyRoute('contacts', {
        option1: true,
        option2: 'my value',
      });
    },
  };

  initCallback() {
    this.sub('router/options', (opt) => {
      this.$.options = JSON.stringify(opt, null, 2);
      this.$.routeColor = opt.error ? COLOR.error : COLOR.regular;
    });
  }
}

MyApp.template = /*html*/ `
<nav>
  <button set="onclick: onHome">Home</button>
  <button set="onclick: onContacts">Contacts</button>
  <a href="?wrong"><button>WRONG ROUTE</button></a>
</nav>
<h1>Current route: 
  <span 
    set="textContent: router/route; style.color: routeColor">
  </span>
</h1>
<code set="textContent: options" style="white-space: pre"></code>
`;

MyApp.reg('my-app');
