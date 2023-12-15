import PubSub from './PubSub.js';
import { DICT } from './dictionary.js';
import { UID } from '../utils/UID.js';
import { setNestedProp } from '../utils/setNestedProp.js';
import { prepareStyleSheet } from '../utils/prepareStyleSheet.js';

import PROCESSORS from './tpl-processors.js';
import { parseCssPropertyValue } from '../utils/parseCssPropertyValue.js';

export { html } from './html.js';
export { css } from './css.js';
export { UID, PubSub }

let autoTagsCount = 0;

/** @template S */
export class Symbiote extends HTMLElement {
  /** @type {Boolean} */
  #initialized;
  /** @type {String} */
  #autoCtxName;
  /** @type {String} */
  #cachedCtxName;
  /** @type {PubSub} */
  #localCtx;
  #stateProxy;
  /** @type {Boolean} */
  #dataCtxInitialized;
  #disconnectTimeout;
  #cssDataCache;
  #computedStyle;
  #boundCssProps;

  /** @type {typeof Symbiote} */
  // @ts-expect-error
  #super = this.constructor;

  /** @type {HTMLTemplateElement} */
  static __tpl;

  get Symbiote() {
    return Symbiote;
  }

  initCallback() {}
  renderCallback() {}

  #initCallback() {
    if (this.#initialized) {
      return;
    }
    this.#initialized = true;
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
    if ((shadow || this.#super.shadowStyleSheets) && !this.shadowRoot) {
      this.attachShadow({
        mode: 'open',
      });
    }
    if (this.allowCustomTemplate) {
      let customTplSelector = this.getAttribute(DICT.USE_TPL_ATTR);
      if (customTplSelector) {
        let root = this.getRootNode();
        /** @type {HTMLTemplateElement} */
        // @ts-expect-error
        let customTpl = root?.querySelector(customTplSelector) || document.querySelector(customTplSelector);
        if (customTpl) {
          // @ts-expect-error
          template = customTpl.content.cloneNode(true);
        } else {
          console.warn(`Symbiote template "${customTplSelector}" is not found...`);
        }
      }
    }
    if (this.processInnerHtml) {
      for (let fn of this.tplProcessors) {
        fn(this, this);
      }
    }
    if (template || this.#super.template) {
      if (this.#super.template && !this.#super.__tpl) {
        this.#super.__tpl = document.createElement('template');
        this.#super.__tpl.innerHTML = this.#super.template;
      }
      if (template?.constructor === DocumentFragment) {
        fr = template;
      } else if (template?.constructor === String) {
        let tpl = document.createElement('template');
        tpl.innerHTML = template;
        // @ts-expect-error
        fr = tpl.content.cloneNode(true);
      } else if (this.#super.__tpl) {
        // @ts-expect-error
        fr = this.#super.__tpl.content.cloneNode(true);
      }
      for (let fn of this.tplProcessors) {
        fn(fr, this);
      }
    }

    // for the possible asynchronous call:
    let addFr = () => {
      if (fr && this.isVirtual) {
        this.replaceWith(fr);
      } else {
        fr && ((shadow && this.shadowRoot.appendChild(fr)) || this.appendChild(fr));
      }
      this.#initCallback();
      this.renderCallback?.();
    };

    if (this.#super.shadowStyleSheets) {
      shadow = true; // is needed for cases when Shadow DOM was created manually for some other purposes
      this.shadowRoot.adoptedStyleSheets = [...this.#super.shadowStyleSheets];
    }
    addFr();
  }

  /**
   * @template {Symbiote} T
   * @param {(fr: DocumentFragment | T, fnCtx: T) => void} processorFn
   */
  addTemplateProcessor(processorFn) {
    this.tplProcessors.add(processorFn);
  }

  constructor() {
    super();
    /** @type {S} */
    this.init$ = Object.create(null);
    /** @type {Object<string, *>} */
    this.cssInit$ = Object.create(null);
    /** @type {Set<(fr: DocumentFragment | Symbiote, fnCtx: unknown) => void>} */
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
    /** @type {Boolean} */
    this.allowCustomTemplate = false;
    /** @type {Boolean} */
    this.ctxOwner = false;
    /** @type {Boolean} */
    this.isVirtual = false;
  }

  /** @returns {String} */
  get autoCtxName() {
    if (!this.#autoCtxName) {
      this.#autoCtxName = UID.generate();
      this.style.setProperty(DICT.CSS_CTX_PROP, `'${this.#autoCtxName}'`);
    }
    return this.#autoCtxName;
  }

  /** @returns {String} */
  get cssCtxName() {
    return this.getCssData(DICT.CSS_CTX_PROP, true);
  }

  /** @returns {String} */
  get ctxName() {
    let ctxName = this.getAttribute(DICT.CTX_NAME_ATTR)?.trim() || this.cssCtxName || this.#cachedCtxName || this.autoCtxName;
    /**
     * Cache last ctx name to be able to access context when element becomes disconnected
     *
     * @type {String}
     */
    this.#cachedCtxName = ctxName;
    return ctxName;
  }

  /** @returns {PubSub} */
  get localCtx() {
    if (!this.#localCtx) {
      this.#localCtx = PubSub.registerCtx({});
    }
    return this.#localCtx;
  }

  /** @returns {PubSub} */
  get sharedCtx() {
    return PubSub.getCtx(this.ctxName, false) || PubSub.registerCtx({}, this.ctxName);
  }

  /**
   * @template {Symbiote} T
   * @param {String} prop
   * @param {T} fnCtx
   */
  static #parseProp(prop, fnCtx) {
    /** @type {PubSub} */
    let ctx;
    /** @type {String} */
    let name;
    if (prop.startsWith(DICT.SHARED_CTX_PX)) {
      ctx = fnCtx.sharedCtx;
      name = prop.replace(DICT.SHARED_CTX_PX, '');
    } else if (prop.startsWith(DICT.PARENT_CTX_PX)) {
      name = prop.replace(DICT.PARENT_CTX_PX, '');
      let found = fnCtx;
      while (found && !found?.has?.(name)) {
        // @ts-expect-error
        found = found.parentElement || found.parentNode || found.host;
      }
      ctx = found?.localCtx || fnCtx.localCtx;
    } else if (prop.includes(DICT.NAMED_CTX_SPLTR)) {
      let pArr = prop.split(DICT.NAMED_CTX_SPLTR);
      ctx = PubSub.getCtx(pArr[0]);
      name = pArr[1];
    } else if (prop.startsWith(DICT.CSS_DATA_PX)) {
      ctx = fnCtx.localCtx;
      name = prop;
      if (!ctx.has(name)) {
        fnCtx.bindCssData(name);
      }
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
   * @param {Boolean} [init]
   */
  sub(prop, handler, init = true) {
    let subCb = (val) => {
      if (this.#noInit) {
        return;
      }
      handler(val);
    };
    let parsed = Symbiote.#parseProp(/** @type {string} */ (prop), this);
    if (!parsed.ctx.has(parsed.name)) {
      // Avoid *prop binding race:
      window.setTimeout(() => {
        this.allSubs.add(parsed.ctx.sub(parsed.name, subCb, init));
      });
    } else {
      this.allSubs.add(parsed.ctx.sub(parsed.name, subCb, init));
    }
  }

  /** @param {String} prop */
  notify(prop) {
    let parsed = Symbiote.#parseProp(prop, this);
    parsed.ctx.notify(parsed.name);
  }

  /** @param {String} prop */
  has(prop) {
    let parsed = Symbiote.#parseProp(prop, this);
    return parsed.ctx.has(parsed.name);
  }

  /**
   * @template {keyof S} T
   * @param {String} prop
   * @param {S[T]} val
   * @param {Boolean} [rewrite]
   */
  add(prop, val, rewrite = false) {
    let parsed = Symbiote.#parseProp(prop, this);
    parsed.ctx.add(parsed.name, val, rewrite);
  }

  /**
   * @param {Partial<S>} obj
   * @param {Boolean} [rewrite]
   */
  add$(obj, rewrite = false) {
    for (let prop in obj) {
      this.add(prop, obj[prop], rewrite);
    }
  }

  /** @returns {S} */
  get $() {
    if (!this.#stateProxy) {
      let o = Object.create(null);
      this.#stateProxy = new Proxy(o, {
        set: (obj, /** @type {String} */ prop, val) => {
          let parsed = Symbiote.#parseProp(prop, this);
          parsed.ctx.pub(parsed.name, val);
          return true;
        },
        get: (obj, /** @type {String} */ prop) => {
          let parsed = Symbiote.#parseProp(prop, this);
          return parsed.ctx.read(parsed.name);
        },
      });
    }
    return this.#stateProxy;
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
      if (forcePrimitives || !primArr.includes(val?.constructor)) {
        this.$[key] = val;
      } else {
        this.$[key] !== val && (this.$[key] = val);
      }
    }
  }

  get #ctxOwner() {
    return this.ctxOwner || (this.hasAttribute(DICT.CTX_OWNER_ATTR) && this.getAttribute(DICT.CTX_OWNER_ATTR) !== 'false');
  }

  #initDataCtx() {
    /** @type {{ [key: string]: string }} */
    let attrDesc = this.#super.__attrDesc;
    if (attrDesc) {
      for (let prop of Object.values(attrDesc)) {
        if (!Object.keys(this.init$).includes(prop)) {
          this.init$[prop] = '';
        }
      }
    }
    for (let prop in this.init$) {
      if (prop.startsWith(DICT.SHARED_CTX_PX)) {
        this.sharedCtx.add(prop.replace(DICT.SHARED_CTX_PX, ''), this.init$[prop], this.#ctxOwner);
      } else if (prop.includes(DICT.NAMED_CTX_SPLTR)) {
        let propArr = prop.split(DICT.NAMED_CTX_SPLTR);
        let ctxName = propArr[0].trim();
        let propName = propArr[1].trim();
        if (ctxName && propName) {
          let namedCtx = PubSub.getCtx(ctxName, false);
          if (!namedCtx) {
            namedCtx = PubSub.registerCtx({}, ctxName);
          }
          namedCtx.add(propName, this.init$[prop]);
        }
      } else {
        this.localCtx.add(prop, this.init$[prop]);
      }
    }
    for (let cssProp in this.cssInit$) {
      this.bindCssData(cssProp, this.cssInit$[cssProp]);
    }
    this.#dataCtxInitialized = true;
  }

  get #noInit() {
    return !this.isVirtual && !this.isConnected;
  }

  #initComponent() {
    // As `connectedCallback` calls are queued, it could be called after element being detached from DOM
    // See example at https://html.spec.whatwg.org/multipage/custom-elements.html#custom-element-conformance
    if (this.#noInit) {
      return;
    }
    if (this.#disconnectTimeout) {
      window.clearTimeout(this.#disconnectTimeout);
    }
    if (!this.connectedOnce) {
      let ctxNameAttrVal = this.getAttribute(DICT.CTX_NAME_ATTR)?.trim();
      if (ctxNameAttrVal) {
        this.style.setProperty(DICT.CSS_CTX_PROP, `'${ctxNameAttrVal}'`);
      }
      this.#initDataCtx();
      if (this[DICT.SET_LATER_KEY]) {
        for (let prop in this[DICT.SET_LATER_KEY]) {
          setNestedProp(this, prop, this[DICT.SET_LATER_KEY][prop]);
        }
        delete this[DICT.SET_LATER_KEY];
      }
      this.initChildren = [...this.childNodes];
      for (let proc of PROCESSORS) {
        this.addTemplateProcessor(proc);
      }
      if (this.pauseRender) {
        this.#initCallback();
      } else {
        if (this.#super.rootStyleSheets) {
          /** @type {Document | ShadowRoot} */
          // @ts-expect-error
          let root = this.getRootNode();
          if (!root) {
            return;
          }
          let styleSet = new Set([...root.adoptedStyleSheets, ...this.#super.rootStyleSheets]);
          root.adoptedStyleSheets = [...styleSet];
        }
        this.render();
      }
    }
    this.connectedOnce = true;
  }

  connectedCallback() {
    this.#initComponent();
  }

  destroyCallback() {}

  disconnectedCallback() {
    // if element wasn't connected, there is no need to disconnect it
    if (!this.connectedOnce) {
      return;
    }
    this.dropCssDataCache();
    if (!this.readyToDestroy) {
      return;
    }
    if (this.#disconnectTimeout) {
      window.clearTimeout(this.#disconnectTimeout);
    }
    this.#disconnectTimeout = window.setTimeout(() => {
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
      tagName = `${DICT.AUTO_TAG_PX}-${autoTagsCount}`;
    }
    /** @private */
    this.__tag = tagName;
    let registeredClass = window.customElements.get(tagName);
    if (registeredClass) {
      if (!isAlias && registeredClass !== this) {
        console.warn(
          [
            `Element with tag name "${tagName}" already registered.`,
            `You're trying to override it with another class "${this.name}".`,
            `This is most likely a mistake.`,
            `New element will not be registered.`,
          ].join('\n')
        );
      }
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
    let $prop = this.#super.__attrDesc?.[name];
    if ($prop) {
      if (this.#dataCtxInitialized) {
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
    if (!this.#cssDataCache) {
      this.#cssDataCache = Object.create(null);
    }
    if (!Object.keys(this.#cssDataCache).includes(propName)) {
      if (!this.#computedStyle) {
        this.#computedStyle = window.getComputedStyle(this);
      }
      let val = this.#computedStyle.getPropertyValue(propName).trim();
      try {
        this.#cssDataCache[propName] = parseCssPropertyValue(val);
      } catch (e) {
        !silentCheck && console.warn(`CSS Data error: ${propName}`);
        this.#cssDataCache[propName] = null;
      }
    }
    return this.#cssDataCache[propName];
  }

  /** @param {String} ctxPropName */
  #extractCssName(ctxPropName) {
    return ctxPropName
      .split('--')
      .map((part, idx) => {
        return idx === 0 ? '' : part;
      })
      .join('--');
  }

  updateCssData = () => {
    this.dropCssDataCache();
    this.#boundCssProps?.forEach((ctxProp) => {
      let val = this.getCssData(this.#extractCssName(ctxProp), true);
      val !== null && this.$[ctxProp] !== val && (this.$[ctxProp] = val);
    });
  };

  /**
   * @param {String} propName
   * @param {any} [initValue] Uses empty string by default to make value useful in template
   */
  bindCssData(propName, initValue = '') {
    if (!this.#boundCssProps) {
      this.#boundCssProps = new Set();
    }
    this.#boundCssProps.add(propName);
    let val = this.getCssData(this.#extractCssName(propName), true);
    val === null && (val = initValue);
    propName.startsWith(DICT.CSS_DATA_PX) 
      // To prevent prop name parsing in cycle:
      ? this.localCtx.add(propName, val) 
      : this.add(propName, val);
  }

  dropCssDataCache() {
    this.#cssDataCache = null;
    this.#computedStyle = null;
  }

  /**
   * @param {String} propName
   * @param {Function} [handler]
   * @param {Boolean} [isAsync]
   */
  defineAccessor(propName, handler, isAsync) {
    let localPropName = '#' + propName;
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

  /** @param {String | CSSStyleSheet} styles */
  static addRootStyles(styles) {
    if (!this.rootStyleSheets) {
      /** @type {CSSStyleSheet[]} */
      this.rootStyleSheets = [];
    }
    this.rootStyleSheets.push(prepareStyleSheet(styles));
  }

  /** @param {String | CSSStyleSheet} styles */
  static addShadowStyles(styles) {
    if (!this.shadowStyleSheets) {
      /** @type {CSSStyleSheet[]} */
      this.shadowStyleSheets = [];
    }
    this.shadowStyleSheets.push(prepareStyleSheet(styles));
  }

  /** @param {String | CSSStyleSheet} styles */
  static set rootStyles(styles) {
    this.addRootStyles(styles);
  }

  /** @param {String | CSSStyleSheet} styles */
  static set shadowStyles(styles) {
    this.addShadowStyles(styles);
  }
}

export default Symbiote;
