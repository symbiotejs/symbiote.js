/** @returns {Object<string, any>} */
function cloneObj(obj) {
  let clone = (o) => {
    for (let prop in o) {
      if (o[prop]?.constructor === Object) {
        o[prop] = clone(o[prop]);
      }
    }
    return { ...o };
  };
  return clone(obj);
}

class Data {
  /**
   * @param {Object} src
   * @param {String} [src.name]
   * @param {Object<string, any>} src.schema
   */
  constructor(src) {
    this.uid = Symbol();
    this.name = src.name || null;
    if (src.schema.constructor === Object) {
      this.store = cloneObj(src.schema);
    } else {
      // For Proxy support:
      this._storeIsProxy = true;
      this.store = src.schema;
    }
    /** @type {Object<String, Set<Function>>} */
    this.callbackMap = Object.create(null);
  }

  /**
   * @param {String} actionName
   * @param {String} prop
   */
  static warn(actionName, prop) {
    console.warn(`State: cannot ${actionName}. Prop name: ` + prop);
  }

  /** @param {String} prop */
  read(prop) {
    if (!this._storeIsProxy && !this.store.hasOwnProperty(prop)) {
      Data.warn('read', prop);
      return null;
    }
    return this.store[prop];
  }

  /** @param {String} prop */
  has(prop) {
    return this._storeIsProxy ? this.store[prop] !== undefined : this.store.hasOwnProperty(prop);
  }

  /**
   * @param {String} prop
   * @param {any} val
   * @param {Boolean} [rewrite]
   */
  add(prop, val, rewrite = true) {
    if (!rewrite && Object.keys(this.store).includes(prop)) {
      return;
    }
    this.store[prop] = val;
    if (this.callbackMap[prop]) {
      this.callbackMap[prop].forEach((callback) => {
        callback(this.store[prop]);
      });
    }
  }

  /**
   * @param {String} prop
   * @param {any} val
   */
  pub(prop, val) {
    if (!this._storeIsProxy && !this.store.hasOwnProperty(prop)) {
      Data.warn('publish', prop);
      return;
    }
    this.add(prop, val);
  }

  /** @param {Object<string, any>} updObj */
  multiPub(updObj) {
    for (let prop in updObj) {
      this.pub(prop, updObj[prop]);
    }
  }

  /** @param {String} prop */
  notify(prop) {
    if (this.callbackMap[prop]) {
      this.callbackMap[prop].forEach((callback) => {
        callback(this.store[prop]);
      });
    }
  }

  /**
   * @param {String} prop
   * @param {Function} callback
   * @param {Boolean} [init]
   */
  sub(prop, callback, init = true) {
    if (!this._storeIsProxy && !this.store.hasOwnProperty(prop)) {
      Data.warn('subscribe', prop);
      return null;
    }
    if (!this.callbackMap[prop]) {
      this.callbackMap[prop] = new Set();
    }
    this.callbackMap[prop].add(callback);
    if (init) {
      callback(this.store[prop]);
    }
    return {
      remove: () => {
        this.callbackMap[prop].delete(callback);
        if (!this.callbackMap[prop].size) {
          delete this.callbackMap[prop];
        }
      },
      callback,
    };
  }

  remove() {
    delete Data.globalStore[this.uid];
  }

  /** @param {Object<string, any>} schema */
  static registerLocalCtx(schema) {
    let state = new Data({
      schema,
    });
    Data.globalStore[state.uid] = state;
    return state;
  }

  /**
   * @param {String} ctxName
   * @param {Object<string, any>} schema
   * @returns {Data}
   */
  static registerNamedCtx(ctxName, schema) {
    /** @type {Data} */
    let state = Data.globalStore[ctxName];
    if (state) {
      console.warn('State: context name "' + ctxName + '" already in use');
    } else {
      state = new Data({
        name: ctxName,
        schema,
      });
      Data.globalStore[ctxName] = state;
    }
    return state;
  }

  /** @param {String} ctxName */
  static clearNamedCtx(ctxName) {
    delete Data.globalStore[ctxName];
  }

  /**
   * @param {String} ctxName
   * @param {Boolean} [notify]
   * @returns {Data}
   */
  static getNamedCtx(ctxName, notify = true) {
    return Data.globalStore[ctxName] || (notify && console.warn('State: wrong context name - "' + ctxName + '"'), null);
  }
}

Data.globalStore = Object.create(null);

const DICT = Object.freeze({
  //  Template data binding attribute:
  BIND_ATTR: 'set',
  //  Local state binding attribute name:
  ATTR_BIND_PRFX: '@',
  // External prop prefix:
  EXT_DATA_CTX_PRFX: '*',
  // Named data context property splitter:
  NAMED_DATA_CTX_SPLTR: '/',
  // Data context name attribute:
  CTX_NAME_ATTR: 'ctx-name',
  // Data context name in CSS custom property:
  CSS_CTX_PROP: '--ctx-name',
  // Element reference attribute:
  EL_REF_ATTR: 'ref',
  // Prefix for auto generated tag names:
  AUTO_TAG_PRFX: 'sym',
});

const CHARS = '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm';
const CHLENGTH = CHARS.length - 1;

class UID {
  /**
   * @param {String} [pattern] Any symbols sequence with dashes. Default dash is used for human readability
   * @returns {String} Output example: v6xYaSk7C-kzZ
   */
  static generate(pattern = 'XXXXXXXXX-XXX') {
    let uid = '';
    for (let i = 0; i < pattern.length; i++) {
      uid += pattern[i] === '-' ? pattern[i] : CHARS.charAt(Math.random() * CHLENGTH);
    }
    return uid;
  }
}

function slotProcessor(fr, fnCtx) {
  if (fnCtx.renderShadow) {
    return;
  }
  let slots = [...fr.querySelectorAll('slot')];
  if (fnCtx.__initChildren.length && slots.length) {
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
    fnCtx.__initChildren.forEach((/** @type {Element} */ child) => {
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
    fnCtx.innerHTML = '';
  }
}
function refProcessor(fr, fnCtx) {
  [...fr.querySelectorAll(`[${DICT.EL_REF_ATTR}]`)].forEach((/** @type {HTMLElement} */ el) => {
    let refName = el.getAttribute(DICT.EL_REF_ATTR);
    fnCtx.ref[refName] = el;
    el.removeAttribute(DICT.EL_REF_ATTR);
  });
}
/**
 * @param {DocumentFragment} fr
 * @param {any} fnCtx
 */
function domSetProcessor(fr, fnCtx) {
  [...fr.querySelectorAll(`[${DICT.BIND_ATTR}]`)].forEach((el) => {
    let subStr = el.getAttribute(DICT.BIND_ATTR);
    let keyValsArr = subStr.split(';');
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
      /** @type {String[]} */
      let valKeysArr = kv[1].split(',').map((valKey) => {
        return valKey.trim();
      });
      // Deep property:
      let isDeep, parent, lastStep, dive;
      if (prop.includes('.')) {
        isDeep = true;
        let propPath = prop.split('.');
        dive = () => {
          parent = el;
          propPath.forEach((step, idx) => {
            if (idx < propPath.length - 1) {
              parent = parent[step];
            } else {
              lastStep = step;
            }
          });
        };
        dive();
      }
      for (let valKey of valKeysArr) {
        fnCtx.sub(valKey, (val) => {
          if (isAttr) {
            if (val?.constructor === Boolean) {
              val ? el.setAttribute(prop, '') : el.removeAttribute(prop);
            } else {
              el.setAttribute(prop, val);
            }
          } else if (isDeep) {
            if (parent) {
              parent[lastStep] = val;
            } else {
              // Custom element instances are not constructed properly at this time, so:
              window.setTimeout(() => {
                dive();
                parent[lastStep] = val;
              });
              // TODO: investigate how to do it better ^^^
            }
          } else {
            el[prop] = val;
          }
        });
      }
    });
    el.removeAttribute(DICT.BIND_ATTR);
  });
}
var PROCESSORS = [slotProcessor, refProcessor, domSetProcessor];

let autoTagsCount = 0;

class BaseComponent extends HTMLElement {
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
        tpl.innerHTML = template;
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

  /** @param {(fr: DocumentFragment, fnCtx: any) => any} processorFn */
  addTemplateProcessor(processorFn) {
    this.tplProcessors.add(processorFn);
  }

  constructor() {
    super();
    /** @type {Object<string, any>} */
    this.init$ = Object.create(null);
    /** @type {Set<(fr: DocumentFragment, fnCtx: any) => any>} */
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
      this.style.setProperty(DICT.CSS_CTX_PROP, `'${this.__autoCtxName}'`);
    }
    return this.__autoCtxName;
  }

  get cssCtxName() {
    return this.getCssData(DICT.CSS_CTX_PROP, true);
  }

  get ctxName() {
    return this.getAttribute(DICT.CTX_NAME_ATTR)?.trim() || this.cssCtxName || this.autoCtxName;
  }

  get localCtx() {
    if (!this.__localCtx) {
      this.__localCtx = Data.registerLocalCtx({});
    }
    return this.__localCtx;
  }

  get nodeCtx() {
    return Data.getNamedCtx(this.ctxName, false) || Data.registerNamedCtx(this.ctxName, {});
  }

  /**
   * @param {String} prop
   * @param {any} fnCtx
   */
  static __parseProp(prop, fnCtx) {
    /** @type {Data} */
    let ctx;
    /** @type {String} */
    let name;
    if (prop.startsWith(DICT.EXT_DATA_CTX_PRFX)) {
      ctx = fnCtx.nodeCtx;
      name = prop.replace(DICT.EXT_DATA_CTX_PRFX, '');
    } else if (prop.includes(DICT.NAMED_DATA_CTX_SPLTR)) {
      let pArr = prop.split(DICT.NAMED_DATA_CTX_SPLTR);
      ctx = Data.getNamedCtx(pArr[0]);
      name = pArr[1];
    } else {
      ctx = fnCtx.localCtx;
      name = prop;
    }
    return {
      ctx,
      name,
    };
  }

  /**
   * @param {String} prop
   * @param {(value: any) => void} handler
   */
  sub(prop, handler) {
    let parsed = BaseComponent.__parseProp(prop, this);
    this.allSubs.add(parsed.ctx.sub(parsed.name, handler));
  }

  /** @param {String} prop */
  notify(prop) {
    let parsed = BaseComponent.__parseProp(prop, this);
    parsed.ctx.notify(parsed.name);
  }

  /** @param {String} prop */
  has(prop) {
    let parsed = BaseComponent.__parseProp(prop, this);
    return parsed.ctx.has(parsed.name);
  }

  /**
   * @param {String} prop
   * @param {any} val
   */
  add(prop, val) {
    let parsed = BaseComponent.__parseProp(prop, this);
    parsed.ctx.add(parsed.name, val, false);
  }

  /** @param {Object<string, any>} obj */
  add$(obj) {
    for (let prop in obj) {
      this.add(prop, obj[prop]);
    }
  }

  get $() {
    if (!this.__stateProxy) {
      /** @type {Object<string, any>} */
      let o = Object.create(null);
      this.__stateProxy = new Proxy(o, {
        set: (obj, /** @type {String} */ prop, val) => {
          let parsed = BaseComponent.__parseProp(prop, this);
          parsed.ctx.pub(parsed.name, val);
          return true;
        },
        get: (obj, /** @type {String} */ prop) => {
          let parsed = BaseComponent.__parseProp(prop, this);
          return parsed.ctx.read(parsed.name);
        },
      });
    }
    return this.__stateProxy;
  }

  /** @param {Object<string, any>} kvObj */
  set$(kvObj) {
    for (let key in kvObj) {
      this.$[key] = kvObj[key];
    }
  }

  initCallback() {}

  __initDataCtx() {
    let attrDesc = this.constructor['__attrDesc'];
    if (attrDesc) {
      for (let prop of Object.values(attrDesc)) {
        if (!Object.keys(this.init$).includes(prop)) {
          this.init$[prop] = '';
        }
      }
    }
    for (let prop in this.init$) {
      if (prop.startsWith(DICT.EXT_DATA_CTX_PRFX)) {
        this.nodeCtx.add(prop.replace(DICT.EXT_DATA_CTX_PRFX, ''), this.init$[prop]);
      } else if (prop.includes(DICT.NAMED_DATA_CTX_SPLTR)) {
        let propArr = prop.split(DICT.NAMED_DATA_CTX_SPLTR);
        let ctxName = propArr[0].trim();
        let propName = propArr[1].trim();
        if (ctxName && propName) {
          let namedCtx = Data.getNamedCtx(ctxName, false);
          if (!namedCtx) {
            namedCtx = Data.registerNamedCtx(ctxName, {});
          }
          namedCtx.add(propName, this.init$[prop]);
        }
      } else {
        this.localCtx.add(prop, this.init$[prop]);
      }
    }
    this.__dataCtxInitialized = true;
  }

  connectedCallback() {
    if (this.__disconnectTimeout) {
      window.clearTimeout(this.__disconnectTimeout);
    }
    if (!this.connectedOnce) {
      let ctxNameAttrVal = this.getAttribute(DICT.CTX_NAME_ATTR)?.trim();
      if (ctxNameAttrVal) {
        this.style.setProperty(DICT.CSS_CTX_PROP, `'${ctxNameAttrVal}'`);
      }
      this.__initDataCtx();
      this.__initChildren = [...this.childNodes];
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
    this.dropCssDataCache();
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

  /** @param {Object<string, string>} desc */
  static bindAttributes(desc) {
    this.observedAttributes = Object.keys(desc);
    this.__attrDesc = desc;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) {
      return;
    }
    /** @type {String} */
    let $prop = this.constructor['__attrDesc'][name];
    if ($prop) {
      if (this.__dataCtxInitialized) {
        this.$[$prop] = newVal;
      } else {
        this.init$[$prop] = newVal;
      }
    } else {
      this[name] = newVal;
    }
  }

  /**
   * @param {String} propName
   * @param {Boolean} [silentCheck]
   */
  getCssData(propName, silentCheck = false) {
    if (!this.__cssDataCache) {
      this.__cssDataCache = Object.create(null);
    }
    if (!Object.keys(this.__cssDataCache).includes(propName)) {
      if (!this.__computedStyle) {
        this.__computedStyle = window.getComputedStyle(this);
      }
      let val = this.__computedStyle.getPropertyValue(propName).trim();
      // Firefox doesn't transform string values into JSON format:
      if (val.startsWith(`'`) && val.endsWith(`'`)) {
        val = val.replace(/\'/g, '"');
      }
      try {
        this.__cssDataCache[propName] = JSON.parse(val);
      } catch (e) {
        !silentCheck && console.warn(`CSS Data error: ${propName}`);
        this.__cssDataCache[propName] = null;
      }
    }
    return this.__cssDataCache[propName];
  }

  dropCssDataCache() {
    this.__cssDataCache = null;
    this.__computedStyle = null;
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

export { BaseComponent };
