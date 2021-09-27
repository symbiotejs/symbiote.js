import { State } from '../../symbiote/core/State.js';
import { DICT } from './dictionary.js';
import { UID } from '../../symbiote/utils/UID.js';

import PROCESSORS from './tpl-processors.js';

let autoTagsCount = 0;

export class BaseComponent extends HTMLElement {

  /** 
   * @param {String | DocumentFragment} [template] 
   * @param {Boolean} [shadow]
   */
  render(template, shadow = this.renderShadow) {
    /** @type {DocumentFragment} */
    let fr;
    if (template || this.constructor['template']) {
      if (this.constructor['template'] && !this.constructor['__tpl']) {
        this.constructor['__tpl'] = document.createElement('template');
        this.constructor['__tpl'].innerHTML = this.constructor['template'];
      }
      while (this.firstChild) {
        this.firstChild.remove();
      }
      if (template?.constructor === DocumentFragment) {
        fr = template;
      } else if (template?.constructor === String) {
        let tpl = document.createElement('template');
        // @ts-ignore
        fr = tpl.content.cloneNode(true);
      } else if (this.constructor['__tpl']) {
        fr = this.constructor['__tpl'].content.cloneNode(true);
      }
      for (let fn of this.tplProcessors) {
        fn(fr, this);
      }
    }
    if (shadow) {
      if (!this.shadowRoot) {
        this.attachShadow({
          mode: 'open',
        });
      }
      fr && this.shadowRoot.appendChild(fr);
    } else {
      fr && this.appendChild(fr);
    }
  }

  /** 
   * @param {(fr: DocumentFragment, fnCtx: *) => any} processorFn 
   */
  addTemplateProcessor(processorFn) {
    this.tplProcessors.add(processorFn);
  }

  /** @param {Object<string, any>} init */
  initLocalState(init) {
    this.__localStateInitObj = init;
  }

  constructor() {
    super();
    /** @type {Set<(fr: DocumentFragment, fnCtx: *) => any>} */
    this.tplProcessors = new Set();
    /** @type {Object<string, HTMLElement>} */
    this.ref = Object.create(null);
    this.allSubs = new Set();
    this.pauseRender = false;
    this.renderShadow = false;
    this.readyToDestroy = true;
  }

  get autoCtxName() {
    if (!this.__autoCtxName) {
      this.__autoCtxName = UID.generate();
      this.style.setProperty(DICT.CSS_CTX_PROP, this.__autoCtxName);
    }
    return this.__autoCtxName;
  }

  get cssCtxName() {
    let style = window.getComputedStyle(this);
    return style.getPropertyValue(DICT.CSS_CTX_PROP);
  }

  get ctxName() {
    return this.getAttribute(DICT.CTX_NAME_ATTR)?.trim() || this.cssCtxName || this.autoCtxName;
  }

  /** @param {Object<string, any>} stateInit */
  addToExternalState(stateInit) {
    if (!this.externalState) {
      this.__extStateInit = stateInit;
      return;
    }
    for (let prop in stateInit) {
      if (!this.externalState.has(prop)) {
        this.externalState.add(prop, stateInit[prop]);
      }
    }
  }

  get externalState() {
    return this.ctxName ? State.getNamedCtx(this.ctxName) || State.registerNamedCtx(this.ctxName, this.__extStateInit || {}) : null;
  }

  __initState() {
    if (!this.localState) {
      this.localState = State.registerLocalCtx(this.__localStateInitObj || {});
    }
  }

  get ctxMap() {
    if (!this.__ctxMap) {
      this.__ctxMap = {
        local: this.localState,
        external: this.externalState,
      };
    }
    return this.__ctxMap;
  }

  /**
   * 
   * @param {'local' | 'external'} ctxType 
   * @param {String} prop 
   * @param {(value:*) => void} handler 
   */
  sub(ctxType, prop, handler) {
    this.allSubs.add(this.ctxMap[ctxType].sub(prop, handler));
  }

  /**
   * 
   * @param {'local' | 'external'} ctxType 
   * @param {String} prop 
   * @param {*} value
   */
  pub(ctxType, prop, value) {
    this.ctxMap[ctxType].pub(prop, value);
  }

  /**
   * 
   * @param {'local' | 'external'} ctxType 
   * @param {Object<string, *>} updObj 
   */
  multiPub(ctxType, updObj) {
    for (let prop in updObj) {
      this.pub(ctxType, prop, updObj[prop]);
    }
  }

  /**
   * 
   * @param {'local' | 'external'} ctxType 
   * @param {String} prop 
   */
  read(ctxType, prop) {
    return this.ctxMap[ctxType].read(prop);
  }

  /**
   * 
   * @param {'local' | 'external'} ctxType 
   * @param {String} prop 
   */
  has(ctxType, prop) {
    return this.ctxMap[ctxType].has(prop);
  }

  initCallback() {}

  connectedCallback() {
    if (this.__disconnectTimeout) {
      window.clearTimeout(this.__disconnectTimeout);
    }
    if (!this.connectedOnce) {
      let ctxNameAttrVal = this.getAttribute(DICT.CTX_NAME_ATTR)?.trim();
      if (ctxNameAttrVal) {
        this.style.setProperty(DICT.CSS_CTX_PROP, ctxNameAttrVal);
      }
      this.__initChildren = [...this.childNodes];
      this.__initState();
      for (let proc of PROCESSORS) {
        this.addTemplateProcessor(proc);
      }
      if (!this.pauseRender) {
        this.render();
      }
      this.initCallback?.();
    }
    this.connectedOnce = true;
  }

  destroyCallback() {}

  disconnectedCallback() {
    if (!this.readyToDestroy) {
      return;
    }
    if (this.__disconnectTimeout) {
      window.clearTimeout(this.__disconnectTimeout);
    }
    this.__disconnectTimeout = window.setTimeout(() => {
      this.destroyCallback();
      for (let sub of this.allSubs) {
        sub.remove();
        this.allSubs.delete(sub);
      }
      for (let proc of this.tplProcessors) {
        this.tplProcessors.delete(proc);
      }
    }, 100);
  }

  /**
   * 
   * @param {String} [tagName] 
   * @param {Boolean} [isAlias] 
   */
  static reg(tagName, isAlias = false) {
    if (!tagName) {
      autoTagsCount++;
      tagName = `${DICT.AUTO_TAG_PRFX}-${autoTagsCount}`;
    }
    this.__tag = tagName;
    if (window.customElements.get(tagName)) {
      console.warn(`${tagName} - is already in "customElements" registry`);
      return;
    }
    window.customElements.define(tagName, isAlias ? class extends this {} : this);
  }

  static get is() {
    if (!this.__tag) {
      this.reg();
    }
    return this.__tag;
  }

  /**
   * 
   * @param {Object<string, ('local' | 'external' | 'property')[]>} desc 
   */
  static bindAttributes(desc) {
    this.observedAttributes = Object.keys(desc);
    this.__attrDesc = desc;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) {
      return;
    }
    /** @type {('local' | 'external' | 'property')[]} */
    let desc = this.constructor['__attrDesc'][name];
    if (desc.includes('local')) {
      this.__initState();
      this.localState.add(name, newVal);
    }
    if (desc.includes('external')) {
      this.addToExternalState({name: newVal});
    }
    if (desc.includes('property')) {
      this[name] = newVal;
    }
  }

  /**
   * 
   * @param {String} propName 
   */
  getCssData(propName) {
    let style = window.getComputedStyle(this);
    let val = style.getPropertyValue(propName).trim();
    // Firefox doesn't transform string values into JSON format:
    if (val.startsWith(`'`) && val.endsWith(`'`)) {
      val = val.replace(/\'/g, '"');
    }
    try {
      return JSON.parse(val);
    } catch(e) {
      console.warn(`CSS Data error: ${propName}`);
      return null;
    }
  }

  /**
   * @param {String} propName
   * @param {Function} [handler]
   * @param {Boolean} [isAsync]
   */
  defineAccessor(propName, handler, isAsync) {
    let localPropName = '__' + propName;
    this[localPropName] = this[propName];
    Object.defineProperty(this, propName, {
      set: (val) => {
        this[localPropName] = val;
        if (isAsync) {
          window.setTimeout(() => {
            handler?.(val);
          });
        } else {
          handler?.(val);
        }
      },
      get: () => {
        return this[localPropName];
      },
    });
    this[propName] = this[localPropName];
  }

}
