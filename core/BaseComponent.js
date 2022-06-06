import { Data } from './Data.js';
import { DICT } from './dictionary.js';
import { UID } from '../utils/UID.js';

import PROCESSORS from './tpl-processors.js';

let autoTagsCount = 0;

/** @template S */
export class BaseComponent extends HTMLElement {
  get BaseComponent() {
    return BaseComponent;
  }

  initCallback() {}

  /** @private */
  __initCallback() {
    if (this.__initialized) {
      return;
    }
    /** @private */
    this.__initialized = true;
    this.initCallback?.();
  }

  /** @type {String} */
  static template;

  /**
   * @param {String | DocumentFragment} [template]
   * @param {Boolean} [shadow]
   */
  render(template, shadow = this.renderShadow) {
    /** @type {DocumentFragment} */
    let fr;
    if ((shadow || this.constructor['__shadowStylesUrl']) && !this.shadowRoot) {
      this.attachShadow({
        mode: 'open',
      });
    }
    if (this.processInnerHtml) {
      for (let fn of this.tplProcessors) {
        fn(this, this);
      }
    }
    if (template || this.constructor['template']) {
      if (this.constructor['template'] && !this.constructor['__tpl']) {
        this.constructor['__tpl'] = document.createElement('template');
        this.constructor['__tpl'].innerHTML = this.constructor['template'];
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

    // for the possible asynchronous call:
    let addFr = () => {
      fr && ((shadow && this.shadowRoot.appendChild(fr)) || this.appendChild(fr));
      this.__initCallback();
    };

    if (this.constructor['__shadowStylesUrl']) {
      shadow = true; // is needed for cases when Shadow DOM was created manually for some other purposes
      let styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.href = this.constructor['__shadowStylesUrl'];
      styleLink.onload = addFr;
      this.shadowRoot.prepend(styleLink); // the link should be added before the other template elements
    } else {
      addFr();
    }
  }

  /**
   * @template {BaseComponent} T
   * @param {(fr: DocumentFragment | T, fnCtx: T) => void} processorFn
   */
  addTemplateProcessor(processorFn) {
    this.tplProcessors.add(processorFn);
  }

  constructor() {
    super();
    /** @type {S} */
    this.init$ = Object.create(null);
    /** @type {Set<(fr: DocumentFragment | BaseComponent, fnCtx: unknown) => void>} */
    this.tplProcessors = new Set();
    /** @type {Object<string, any>} */
    this.ref = Object.create(null);
    this.allSubs = new Set();
    /** @type {Boolean} */
    this.pauseRender = false;
    /** @type {Boolean} */
    this.renderShadow = false;
    /** @type {Boolean} */
    this.readyToDestroy = true;
    /** @type {Boolean} */
    this.processInnerHtml = false;
  }

  /** @returns {String} */
  get autoCtxName() {
    if (!this.__autoCtxName) {
      /** @private */
      this.__autoCtxName = UID.generate();
      this.style.setProperty(DICT.CSS_CTX_PROP, `'${this.__autoCtxName}'`);
    }
    return this.__autoCtxName;
  }

  /** @returns {String} */
  get cssCtxName() {
    return this.getCssData(DICT.CSS_CTX_PROP, true);
  }

  /** @returns {String} */
  get ctxName() {
    return this.getAttribute(DICT.CTX_NAME_ATTR)?.trim() || this.cssCtxName || this.autoCtxName;
  }

  /** @returns {Data} */
  get localCtx() {
    if (!this.__localCtx) {
      /** @private */
      this.__localCtx = Data.registerLocalCtx({});
    }
    return this.__localCtx;
  }

  /** @returns {Data} */
  get nodeCtx() {
    return Data.getNamedCtx(this.ctxName, false) || Data.registerNamedCtx(this.ctxName, {});
  }

  /**
   * @private
   * @template {BaseComponent} T
   * @param {String} prop
   * @param {T} fnCtx
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
   * @template {keyof S} T
   * @param {T} prop
   * @param {(value: S[T]) => void} handler
   */
  sub(prop, handler) {
    let parsed = BaseComponent.__parseProp(/** @type {string} */ (prop), this);
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
   * @template {keyof S} T
   * @param {T} prop
   * @param {S[T]} val
   */
  add(prop, val) {
    let parsed = BaseComponent.__parseProp(/** @type {String} */ (prop), this);
    parsed.ctx.add(parsed.name, val, false);
  }

  /** @param {Partial<S>} obj */
  add$(obj) {
    for (let prop in obj) {
      this.add(prop, obj[/** @type {String} */ (prop)]);
    }
  }

  /** @returns {S} */
  get $() {
    if (!this.__stateProxy) {
      let o = Object.create(null);
      /** @private */
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

  /**
   * @param {Partial<S>} kvObj
   * @param {Boolean} [forcePrimitives] Force update callbacks for primitive types
   */
  set$(kvObj, forcePrimitives = false) {
    for (let key in kvObj) {
      let val = kvObj[key];
      /** @type {unknown[]} */
      let primArr = [String, Number, Boolean];
      if (forcePrimitives || !primArr.includes(val.constructor)) {
        this.$[key] = val;
      } else {
        this.$[key] !== val && (this.$[key] = val);
      }
    }
  }

  /** @private */
  __initDataCtx() {
    /** @type {{ [key: string]: string }} */
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
    /** @private */
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
      this.initChildren = [...this.childNodes];
      for (let proc of PROCESSORS) {
        this.addTemplateProcessor(proc);
      }
      if (this.pauseRender) {
        this.__initCallback();
      } else {
        this.render();
      }
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
    /** @private */
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
    /** @private */
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
    /** @private */
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
      /** @private */
      this.__cssDataCache = Object.create(null);
    }
    if (!Object.keys(this.__cssDataCache).includes(propName)) {
      if (!this.__computedStyle) {
        /** @private */
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

  /**
   * @param {String} propName
   * @param {Boolean} [external]
   * @returns {keyof S}
   */
  bindCssData(propName, external = true) {
    let stateName = /** @type {keyof S} */ ((external ? DICT.EXT_DATA_CTX_PRFX : '') + propName);
    this.add(stateName, this.getCssData(propName, true));
    return stateName;
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

  /** @param {String} cssTxt */
  static set shadowStyles(cssTxt) {
    let styleBlob = new Blob([cssTxt], {
      type: 'text/css',
    });
    /** @private */
    this.__shadowStylesUrl = URL.createObjectURL(styleBlob);
  }
}
