import { BaseComponent } from '../../core/BaseComponent.js';
import { Data } from '../../core/Data.js';
import { AppRouter } from '../../core/AppRouter.js';

AppRouter.setRoutingMap({
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

const routeData = Data.registerNamedCtx('router', {
  currentRoute: null,
});

window.addEventListener(AppRouter.routingEventName, (/** @type {CustomEvent} */ e) => {
  routeData.pub('currentRoute', e.detail);
});

AppRouter.notify();

class MyApp extends BaseComponent {
  init$ = {
    routeName: 'DEFAULT',
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
    this.sub('router/currentRoute', (val) => {
      console.log(val);
      this.$.routeName = val.route;
      this.$.options = JSON.stringify(val.options, null, 2);
    });
  }
}

MyApp.template = /*html*/ `
<div>
  <button set="onclick: onHome">Home</button>
  <button set="onclick: onContacts">Contacts</button>
  <a href="?wrong"><button>WRONG ROUTE</button></a>
</div>
<div>Current route: <span set="textContent: routeName"></span></div>
<div set="textContent: options" style="white-space: pre"></div>
`;

MyApp.reg('my-app');