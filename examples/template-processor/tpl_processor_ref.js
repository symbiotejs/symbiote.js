import { BaseComponent } from '../../core/BaseComponent.js';

const STYLES = {
  firstName: {
    color: '#f00',
  },
  secondName: {
    color: '#00f',
  },
};

/**
 * 
 * @param {HTMLElement} el 
 * @param {Object<string, string>} rules 
 */
function applyCss(el, rules) {
  for (let prop in rules) {
    el.style.setProperty(prop, rules[prop]);
  }
}

class MyApp extends BaseComponent {
  constructor() {
    super(); 
    this.addTemplateProcessor((fr) => {
      let cssElArr = [...fr.querySelectorAll('[css]')];
      cssElArr.forEach((/** @type {HTMLElement} */ el) => {
        let cssName = el.getAttribute('css');
        applyCss(el, STYLES[cssName]);
      });
    });
  }
}

MyApp.template = /*html*/ `
<div css="firstName" loc="textContent:first-name"></div>
<div css="secondName" loc="textContent:second-name"></div>
`;
MyApp.bindAttributes({
  'first-name': ['local'],
  'second-name': ['local'],
});
MyApp.reg('my-app');