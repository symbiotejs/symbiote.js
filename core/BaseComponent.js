import { State } from '../../symbiote/core/State.js';
import { DICT } from './dictionary.js';
import { UID } from '../../symbiote/utils/UID.js';

let autoTagsCount = 0;

export class BaseComponent extends HTMLElement {
  static set template(html) {
    this.__tpl = document.createElement('template');
    this.__tpl.innerHTML = html;
  }

  /** 
   * @param {String | DocumentFragment} [template] 
   * @param {Boolean} [shadow]
   */
  render(template, shadow = this.renderShadow) {
    /** @type {DocumentFragment} */
    let fr;
    if (template || this.constructor['__tpl']) {
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
      this.tplProcessors.forEach((fn) => {
        fn(fr);
      });
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

  /** @param {(fr: DocumentFragment) => any} processorFn */
  addTemplateProcessor(processorFn) {
    this.tplProcessors.add(processorFn);
  }

  /** @param {Object<string, any>} init */
  initLocalState(init) {
    this.__localStateInitObj = init;
  }

  constructor() {
    super();
    /** @type {Set<(fr: DocumentFragment) => any>} */
    this.tplProcessors = new Set();
    /** @type {Object<string, HTMLElement>} */
    this.ref = Object.create(null);
    this.allSubs = new Set();
    this.pauseRender = false;
    this.renderShadow = false;
    this.readyToDestroy = true;
  }

  /**
   * @param {DocumentFragment} fr
   * @param {String} attr
   * @param {State} state
   * @param {Set} subs
   */
  static connectToState(fr, attr, state, subs) {
    [...fr.querySelectorAll(`[${attr}]`)].forEach((el) => {
      let subSr = el.getAttribute(attr);
      let keyValsArr = subSr.split(';');
      keyValsArr.forEach((keyValStr) => {
        if (!keyValStr) {
          return;
        }
        let kv = keyValStr.split(':').map((str) => str.trim());
        let prop = kv[0];
        let isAttr;
        if (prop.indexOf(DICT.ATTR_BIND_PRFX) === 0) {
          isAttr = true;
          prop = prop.replace(DICT.ATTR_BIND_PRFX, '');
        }
        if (state && !state.has(kv[1])) {
          state.add(kv[1], undefined);
        }
        subs.add(
          state.sub(kv[1], (val) => {
            if (isAttr) {
              if (val?.constructor === Boolean) {
                val ? el.setAttribute(prop, '') : el.removeAttribute(prop);
              } else {
                el.setAttribute(prop, val);
              }
            } else {
              el[prop] = val;
            }
          })
        );
      });
      el.removeAttribute(attr);
    });
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
      this.__extSateInit = stateInit;
      return;
    }
    for (let prop in stateInit) {
      if (!this.externalState.has(prop)) {
        this.externalState.add(prop, stateInit[prop]);
      }
    }
  }

  get externalState() {
    return this.ctxName ? State.getNamedCtx(this.ctxName) || State.registerNamedCtx(this.ctxName, this.__extSateInit || {}) : null;
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
      if (!this.renderShadow) {
        this.addTemplateProcessor((fr) => {
          let slots = [...fr.querySelectorAll('slot')];
          if (this.__initChildren.length && slots.length) {
            let slotMap = {};
            slots.forEach((slot) => {
              let slotName = slot.getAttribute('name');
              if (slotName) {
                slotMap[slotName] = {
                  slot,
                  fr: document.createDocumentFragment(),
                };
              } else {
                slotMap.__default__ = {
                  slot,
                  fr: document.createDocumentFragment(),
                };
              }
            });
            this.__initChildren.forEach((/** @type {Element} */ child) => {
              let slotName = child.getAttribute?.('slot');
              if (slotName) {
                slotMap[slotName].fr.appendChild(child);
              } else if (slotMap.__default__) {
                slotMap.__default__.fr.appendChild(child);
              }
            });
            Object.values(slotMap).forEach((mapObj) => {
              mapObj.slot.parentNode.insertBefore(mapObj.fr, mapObj.slot);
              mapObj.slot.remove();
            });
          } else {
            this.innerHTML = '';
          }
        });
      }
      this.addTemplateProcessor((fr) => {
        [...fr.querySelectorAll(`[${DICT.EL_REF_ATTR}]`)].forEach((/** @type {HTMLElement} */ el) => {
          let refName = el.getAttribute(DICT.EL_REF_ATTR);
          this.ref[refName] = el;
          el.removeAttribute(DICT.EL_REF_ATTR);
        });
      });
      this.addTemplateProcessor((fr) => {
        BaseComponent.connectToState(fr, DICT.LOCAL_CTX_ATTR, this.localState, this.allSubs);
      });
      this.addTemplateProcessor((fr) => {
        BaseComponent.connectToState(fr, DICT.EXT_CTX_ATTR, this.externalState, this.allSubs);
      });
      if (!this.pauseRender) {
        this.render();
      }
      this.initCallback?.();
    }
    this.connectedOnce = true;
  }

  disconnectedCallback() {
    if (!this.readyToDestroy) {
      return;
    }
    if (this.__disconnectTimeout) {
      window.clearTimeout(this.__disconnectTimeout);
    }
    this.__disconnectTimeout = window.setTimeout(() => {
      this.allSubs.forEach((sub) => {
        sub.remove();
        this.allSubs.delete(sub);
      });
      this.tplProcessors.forEach((fn) => {
        this.tplProcessors.delete(fn);
      });
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
    if (window.customElements.get(tagName)) {
      console.warn(`${tagName} - is already in "customElements" registry`);
      return;
    }
    window.customElements.define(tagName, isAlias ? class extends this {} : this);
    this.__tag = tagName;
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
    try {
      return JSON.parse(style.getPropertyValue(propName).trim());
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
