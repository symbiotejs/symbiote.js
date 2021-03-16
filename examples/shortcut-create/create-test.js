import { create } from '../../shortcuts/create.js';

create(
  'create-test',
  /*html*/ `
<div set="textContent: text"></div>
<div set="textContent: number"></div>
`,
  {
    text: 'HELLO WORLD',
    number: 49,
  }
);

window.setInterval(() => {
  document.querySelector('create-test')['state'].number = Date.now();
}, 1000);
