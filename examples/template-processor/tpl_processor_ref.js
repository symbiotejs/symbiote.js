import { BaseComponent } from '../../core/BaseComponent.js';

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

class StyledComponent extends BaseComponent {
  /**
   * 
   * @param {Object<string, Object<string, string>>} stylesObj 
   */
  static addStyles(stylesObj) {
    this.__stylesObj = stylesObj;
  }

  constructor() {
    super(); 
    this.styles = this.constructor['__stylesObj'];
    this.addTemplateProcessor((fr) => {
      let cssElArr = [...fr.querySelectorAll('[css]')];
      cssElArr.forEach((/** @type {HTMLElement} */ el) => {
        let cssName = el.getAttribute('css');
        applyCss(el, this.styles[cssName]);
      });
    });
    applyCss(this, this.styles.host);
  }
}

// Usage:

class MyApp extends StyledComponent {}

MyApp.template = /*html*/ `
<div css="first_name" loc="textContent:first-name"></div>
<div css="second_name" loc="textContent:second-name"></div>
`;

MyApp.addStyles({
  host: {
    'display': 'inline-block',
    'padding': '20px',
    'border': '1px solid currentColor',
  },
  first_name: {
    'color': '#f00',
    'font-size': '20px',
  },
  second_name: {
    'color': '#00f',
    'font-size': '18px',
  },
});

MyApp.bindAttributes({
  'first-name': ['local'],
  'second-name': ['local'],
});

MyApp.reg('my-app');