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
    if (typeof this.init$ === 'function') {
      this.init$ = this.init$();
    }

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

const MSG_NAME = '[Typed State] Wrong property name: ';
const MSG_TYPE = '[Typed State] Wrong property type: ';

class TypedData {
  /**
   * @param {Object<string, { type: any; value: any }>} typedSchema
   * @param {String} [ctxName]
   */
  constructor(typedSchema, ctxName) {
    this.__typedSchema = typedSchema;
    this.__ctxId = ctxName || UID.generate();
    this.__schema = Object.keys(typedSchema).reduce((acc, key) => {
      acc[key] = typedSchema[key].value;
      return acc;
    }, {});
    this.__state = Data.registerNamedCtx(this.__ctxId, this.__schema);
  }

  /**
   * @param {String} prop
   * @param {any} value
   */
  setValue(prop, value) {
    if (!this.__typedSchema.hasOwnProperty(prop)) {
      console.warn(MSG_NAME + prop);
      return;
    }
    if (value?.constructor !== this.__typedSchema[prop].type) {
      console.warn(MSG_TYPE + prop);
      return;
    }
    this.__state.pub(prop, value);
  }

  /** @param {Object<string, any>} updObj */
  setMultipleValues(updObj) {
    for (let prop in updObj) {
      this.setValue(prop, updObj[prop]);
    }
  }

  /** @param {String} prop */
  getValue(prop) {
    if (!this.__typedSchema.hasOwnProperty(prop)) {
      console.warn(MSG_NAME + prop);
      return undefined;
    }
    return this.__state.read(prop);
  }

  /**
   * @param {String} prop
   * @param {(newVal: any) => void} handler
   */
  subscribe(prop, handler) {
    return this.__state.sub(prop, handler);
  }

  remove() {
    this.__state.remove();
  }
}

class TypedCollection {
  /**
   * @param {Object} options
   * @param {Object<string, { type: any; value: any }>} options.typedSchema
   * @param {String[]} [options.watchList]
   * @param {(list: string[]) => void} [options.handler]
   * @param {String} [options.ctxName]
   */
  constructor(options) {
    /** @type {Object<string, { type: any; value: any }>} */
    this.__typedSchema = options.typedSchema;
    /** @type {String} */
    this.__ctxId = options.ctxName || UID.generate();
    /** @type {Data} */
    this.__state = Data.registerNamedCtx(this.__ctxId, {});
    /** @type {string[]} */
    this.__watchList = options.watchList || [];
    /** @type {(list: string[]) => void} */
    this.__handler = options.handler || null;
    this.__subsMap = Object.create(null);
    /** @type {Set} */
    this.__observers = new Set();
    /** @type {Set<string>} */
    this.__items = new Set();

    let changeMap = Object.create(null);

    this.__notifyObservers = (propName, ctxId) => {
      if (this.__observeTimeout) {
        window.clearTimeout(this.__observeTimeout);
      }
      if (!changeMap[propName]) {
        changeMap[propName] = new Set();
      }
      changeMap[propName].add(ctxId);
      this.__observeTimeout = window.setTimeout(() => {
        this.__observers.forEach((handler) => {
          handler({ ...changeMap });
        });
        changeMap = Object.create(null);
      });
    };
  }

  notify() {
    if (this.__notifyTimeout) {
      window.clearTimeout(this.__notifyTimeout);
    }
    this.__notifyTimeout = window.setTimeout(() => {
      this.__handler?.([...this.__items]);
    });
  }

  add(init) {
    let item = new TypedData(this.__typedSchema);
    for (let prop in init) {
      item.setValue(prop, init[prop]);
    }
    this.__state.add(item.__ctxId, item);
    this.__watchList.forEach((propName) => {
      if (!this.__subsMap[item.__ctxId]) {
        this.__subsMap[item.__ctxId] = [];
      }
      this.__subsMap[item.__ctxId].push(
        item.subscribe(propName, () => {
          this.__notifyObservers(propName, item.__ctxId);
        })
      );
    });
    this.__items.add(item.__ctxId);
    this.notify();
    return item;
  }

  /**
   * @param {String} id
   * @returns {TypedData}
   */
  read(id) {
    return this.__state.read(id);
  }

  readProp(id, propName) {
    let item = this.read(id);
    return item.getValue(propName);
  }

  publishProp(id, propName, value) {
    let item = this.read(id);
    item.setValue(propName, value);
  }

  remove(id) {
    this.__items.delete(id);
    this.notify();
    this.__state.pub(id, null);
    delete this.__subsMap[id];
  }

  clearAll() {
    this.__items.forEach((id) => {
      this.remove(id);
    });
  }

  /** @param {Function} handler */
  observe(handler) {
    this.__observers.add(handler);
  }

  /** @param {Function} handler */
  unobserve(handler) {
    this.__observers.delete(handler);
  }

  /**
   * @param {(item: TypedData) => Boolean} checkFn
   * @returns {String[]}
   */
  findItems(checkFn) {
    let result = [];
    this.__items.forEach((id) => {
      let item = this.read(id);
      if (checkFn(item)) {
        result.push(id);
      }
    });
    return result;
  }

  items() {
    return [...this.__items];
  }

  destroy() {
    this.__state.remove();
    this.__observers = null;
    for (let id in this.__subsMap) {
      this.__subsMap[id].forEach((sub) => {
        sub.remove();
      });
      delete this.__subsMap[id];
    }
  }
}

class AppRouter {
  static _print(msg) {
    console.warn(msg);
  }

  /** @param {String} title */
  static setDefaultTitle(title) {
    this.defaultTitle = title;
  }

  /** @param {Object<string, {}>} map */
  static setRoutingMap(map) {
    Object.assign(this.appMap, map);
    for (let route in this.appMap) {
      if (!this.defaultRoute && this.appMap[route].default === true) {
        this.defaultRoute = route;
      } else if (!this.errorRoute && this.appMap[route].error === true) {
        this.errorRoute = route;
      }
    }
  }

  static set routingEventName(name) {
    this.__routingEventName = name;
  }

  static get routingEventName() {
    return this.__routingEventName || 'sym-on-route';
  }

  static readAddressBar() {
    let result = {
      route: null,
      options: {},
    };
    let paramsArr = window.location.search.split(this.separator);
    paramsArr.forEach((part) => {
      if (part.includes('?')) {
        result.route = part.replace('?', '');
      } else if (part.includes('=')) {
        let pair = part.split('=');
        result.options[pair[0]] = decodeURI(pair[1]);
      } else {
        result.options[part] = true;
      }
    });
    return result;
  }

  static notify() {
    let routeBase = this.readAddressBar();
    let routeScheme = this.appMap[routeBase.route];
    if (routeScheme && routeScheme.title) {
      document.title = routeScheme.title;
    }
    if (routeBase.route === null && this.defaultRoute) {
      this.applyRoute(this.defaultRoute);
      return;
    } else if (!routeScheme && this.errorRoute) {
      this.applyRoute(this.errorRoute);
      return;
    } else if (!routeScheme && this.defaultRoute) {
      this.applyRoute(this.defaultRoute);
      return;
    } else if (!routeScheme) {
      this._print(`Route "${routeBase.route}" not found...`);
      return;
    }
    let event = new CustomEvent(AppRouter.routingEventName, {
      detail: {
        route: routeBase.route,
        options: Object.assign(routeScheme || {}, routeBase.options),
      },
    });
    window.dispatchEvent(event);
  }

  /**
   * @param {String} route
   * @param {Object<string, any>} [options]
   */
  static reflect(route, options = {}) {
    let routeScheme = this.appMap[route];
    if (!routeScheme) {
      this._print('Wrong route: ' + route);
      return;
    }
    let routeStr = '?' + route;
    for (let prop in options) {
      if (options[prop] === true) {
        routeStr += this.separator + prop;
      } else {
        routeStr += this.separator + prop + '=' + `${options[prop]}`;
      }
    }
    let title = routeScheme.title || this.defaultTitle || '';
    window.history.pushState(null, title, routeStr);
    document.title = title;
  }

  /**
   * @param {String} route
   * @param {Object<string, any>} [options]
   */
  static applyRoute(route, options = {}) {
    this.reflect(route, options);
    this.notify();
  }

  /** @param {String} char */
  static setSeparator(char) {
    this._separator = char;
  }

  static get separator() {
    return this._separator || '&';
  }

  /**
   * @param {String} ctxName
   * @param {Object<string, {}>} routingMap
   * @returns {Data}
   */
  static createRouterData(ctxName, routingMap) {
    this.setRoutingMap(routingMap);
    let routeData = Data.registerNamedCtx(ctxName, {
      route: null,
      options: null,
      title: null,
    });
    window.addEventListener(this.routingEventName, (/** @type {CustomEvent} */ e) => {
      routeData.multiPub({
        route: e.detail.route,
        options: e.detail.options,
        title: e.detail.options?.title || this.defaultTitle || '',
      });
    });
    AppRouter.notify();
    return routeData;
  }
}

AppRouter.appMap = Object.create(null);

window.onpopstate = () => {
  AppRouter.notify();
};

/**
 * @typedef {any} StyleMap
 * @type {Object<string, string | number>}
 */

/**
 * @typedef {any} AttrMap
 * @type {Object<string, string | number | boolean>}
 */

/**
 * @typedef {any} PropMap
 * @type {Object<string, any>}
 */

/**
 * @param {any} el HTMLElement
 * @param {StyleMap} styleMap
 */
function applyStyles(el, styleMap) {
  for (let prop in styleMap) {
    if (prop.includes('-')) {
      el.style.setProperty(prop, styleMap[prop]);
    } else {
      el.style[prop] = styleMap[prop];
    }
  }
}
/**
 * @param {any} el HTMLElement
 * @param {AttrMap} attrMap
 */
function applyAttributes(el, attrMap) {
  for (let attrName in attrMap) {
    if (attrMap[attrName].constructor === Boolean) {
      if (attrMap[attrName]) {
        el.setAttribute(attrName, '');
      } else {
        el.removeAttribute(attrName);
      }
    } else {
      el.setAttribute(attrName, attrMap[attrName]);
    }
  }
}
/**
 * @typedef {any} ElementDescriptor
 * @type {{
 *   tag?: String;
 *   attributes?: AttrMap;
 *   styles?: StyleMap;
 *   properties?: PropMap;
 *   processors?: Function[];
 *   children?: ElementDescriptor[];
 * }}
 */

/**
 * @param {ElementDescriptor} [desc]
 * @returns {HTMLElement}
 */
function create(desc = { tag: 'div' }) {
  let el = document.createElement(desc.tag);
  if (desc.attributes) {
    applyAttributes(el, desc.attributes);
  }
  if (desc.styles) {
    applyStyles(el, desc.styles);
  }
  if (desc.properties) {
    for (let prop in desc.properties) {
      el[prop] = desc.properties[prop];
    }
  }
  if (desc.processors) {
    desc.processors.forEach((fn) => {
      fn(el);
    });
  }
  if (desc.children) {
    desc.children.forEach((desc) => {
      let child = create(desc);
      el.appendChild(child);
    });
  }
  return el;
}

const READY_EVENT_NAME = 'idb-store-ready';

const DEFAULT_DB_NAME = `symbiote-db`;
const UPD_EVENT_PREFIX = `symbiote-idb-update_`;

class DbInstance {
  _notifyWhenReady(event = null) {
    window.dispatchEvent(
      new CustomEvent(READY_EVENT_NAME, {
        detail: {
          dbName: this.name,
          storeName: this.storeName,
          event,
        },
      })
    );
  }

  get _updEventName() {
    return UPD_EVENT_PREFIX + this.name;
  }

  /** @param {any} key */
  _getUpdateEvent(key) {
    return new CustomEvent(this._updEventName, {
      detail: {
        key: this.name,
        newValue: key,
      },
    });
  }

  _notifySubscribers(key) {
    window.localStorage.removeItem(this.name);
    window.localStorage.setItem(this.name, key);
    window.dispatchEvent(this._getUpdateEvent(key));
  }

  /**
   * @param {String} dbName
   * @param {String} storeName
   */
  constructor(dbName, storeName) {
    this.name = dbName;
    this.storeName = storeName;
    this.version = 1;
    this.request = window.indexedDB.open(this.name, this.version);
    this.request.onupgradeneeded = (e) => {
      this.db = e.target['result'];
      this.objStore = this.db.createObjectStore(storeName, {
        keyPath: '_key',
      });
      this.objStore.transaction.oncomplete = (ev) => {
        this._notifyWhenReady(ev);
      };
    };
    this.request.onsuccess = (e) => {
      // @ts-ignore
      this.db = e.target.result;
      this._notifyWhenReady(e);
    };
    this.request.onerror = (e) => {
      console.error(e);
    };
    this._subscribtionsMap = {};
    this._updateHandler = (/** @type {StorageEvent} */ e) => {
      if (e.key === this.name && this._subscribtionsMap[e.newValue]) {
        /** @type {Set<Function>} */
        let set = this._subscribtionsMap[e.newValue];
        set.forEach(async (callback) => {
          callback(await this.read(e.newValue));
        });
      }
    };
    this._localUpdateHanler = (e) => {
      this._updateHandler(e.detail);
    };
    window.addEventListener('storage', this._updateHandler);
    window.addEventListener(this._updEventName, this._localUpdateHanler);
  }

  /** @param {String} key */
  read(key) {
    let tx = this.db.transaction(this.storeName, 'readwrite');
    let request = tx.objectStore(this.storeName).get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = (e) => {
        if (e.target.result?._value) {
          resolve(e.target.result._value);
        } else {
          resolve(null);
          console.warn(`IDB: cannot read "${key}"`);
        }
      };
      request.onerror = (e) => {
        reject(e);
      };
    });
  }

  /**
   * @param {String} key
   * @param {any} value
   * @param {Boolean} [silent]
   */
  write(key, value, silent = false) {
    let data = {
      _key: key,
      _value: value,
    };
    let tx = this.db.transaction(this.storeName, 'readwrite');
    let request = tx.objectStore(this.storeName).put(data);
    return new Promise((resolve, reject) => {
      request.onsuccess = (e) => {
        if (!silent) {
          this._notifySubscribers(key);
        }
        resolve(e.target.result);
      };
      request.onerror = (e) => {
        reject(e);
      };
    });
  }

  /**
   * @param {String} key
   * @param {Boolean} [silent]
   */
  delete(key, silent = false) {
    let tx = this.db.transaction(this.storeName, 'readwrite');
    let request = tx.objectStore(this.storeName).delete(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = (e) => {
        if (!silent) {
          this._notifySubscribers(key);
        }
        resolve(e);
      };
      request.onerror = (e) => {
        reject(e);
      };
    });
  }

  getAll() {
    let tx = this.db.transaction(this.storeName, 'readwrite');
    let request = tx.objectStore(this.storeName).getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = (e) => {
        let all = e.target.result;
        resolve(
          all.map((obj) => {
            return obj._value;
          })
        );
      };
      request.onerror = (e) => {
        reject(e);
      };
    });
  }

  /**
   * @param {String} key
   * @param {Function} callback
   */
  subscribe(key, callback) {
    if (!this._subscribtionsMap[key]) {
      this._subscribtionsMap[key] = new Set();
    }
    /** @type {Set} */
    let set = this._subscribtionsMap[key];
    set.add(callback);
    return {
      remove: () => {
        set.delete(callback);
        if (!set.size) {
          delete this._subscribtionsMap[key];
        }
      },
    };
  }

  stop() {
    window.removeEventListener('storage', this._updateHandler);
    this.__subscribtionsMap = null;
    IDB.clear(this.name);
  }
}

class IDB {
  static get readyEventName() {
    return READY_EVENT_NAME;
  }

  /**
   * @param {String} dbName
   * @param {String} storeName
   * @returns {DbInstance}
   */
  static open(dbName = DEFAULT_DB_NAME, storeName = 'store') {
    let key = `${dbName}/${storeName}`;
    if (!this._reg[key]) {
      this._reg[key] = new DbInstance(dbName, storeName);
    }
    return this._reg[key];
  }

  /** @param {String} dbName */
  static clear(dbName) {
    window.indexedDB.deleteDatabase(dbName);
    for (let key in this._reg) {
      if (key.split('/')[0] === dbName) {
        delete this._reg[key];
      }
    }
  }
}

IDB._reg = Object.create(null);

export { AppRouter, BaseComponent, Data, IDB, TypedCollection, TypedData, UID, applyAttributes, applyStyles, create };
