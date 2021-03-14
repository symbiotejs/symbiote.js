// @ts-nocheck

import { create } from '../../shortcuts/create.js';

const template = /*html*/ `
  <span css="el" set="textContent: text; onclick: clicked"></span>
`;

const css = {
  el: {
    color: '#f00',
  },
};

const state = {
  text: 'SOME TEXT',
  clicked: () => {
    console.log('CLICK');
  },
};

create()
  .tag('my-component')
  .shadow(false) // default
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
