import { BaseComponent } from '../../core/BaseComponent.js';

class MyApp extends BaseComponent {

  init$ = {
    first: 'FIRST',
    attr: '',
    '*second': 'SECOND',
    'myctx/third': 'THIRD',
    onClick: () => {
      this.$.first = Date.now();
    },
  };

}

MyApp.template = /*html*/ `
<div set="textContent: first; onclick: onClick"></div>
<div set="textContent: attr;"></div>
<div set="textContent: *second"></div>
<div set="textContent: myctx/third"></div>
`;

MyApp.bindAttributes({
  'attr-test': 'attr',
});

MyApp.reg('my-app');