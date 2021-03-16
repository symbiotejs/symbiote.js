// @ts-nocheck

import { create } from '../../shortcuts/create.js';

const state = {
  text: 'SOME TEXT',
  clicked: () => {
    console.log('CLICK');
  },
};

const css = {
  el: {
    color: '#f00',
  },
};

const template = /*html*/ `
  <span css="el" set="textContent: text; onclick: clicked"></span>
`;

create()
  .tag('my-component')
  .shadow(true)
  .template(template)
  .css(css)
  .state(state)
  .created(() => {
    // constructor()
  })
  .ready(() => {
    // readyCallback
  })
  .connected(() => {
    // connectedCAllback
  })
  .disconnected(() => {
    // disconnectedCallback
  });
