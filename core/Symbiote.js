import PubSub from './PubSub.js';
import { DICT } from './dictionary.js';
import { animateOut } from './animateOut.js';
import { UID } from '../utils/UID.js';
import { setNestedProp } from '../utils/setNestedProp.js';
import { prepareStyleSheet } from '../utils/prepareStyleSheet.js';

import PROCESSORS from './tpl-processors.js';
import { parseCssPropertyValue } from '../utils/parseCssPropertyValue.js';

export { html } from './html.js';
export { css } from './css.js';
export { UID, PubSub, DICT }

let autoTagsCount = 0;

// @ts-ignore - Trusted Types is a browser API, not in standard TS defs
const trustedHTML = globalThis.trustedTypes ? trustedTypes.createPolicy('symbiote', { createHTML: (s) => s }) : { createHTML: (s) => s };

/** @template S */
export class Symbiote extends HTMLElement {
  /** @type {Boolean} */
  #initialized;
  /** @type {String} */
  #cachedCtxName;
  /** @type {PubSub} */
  #localCtx;
  #stateProxy;
  /** @type {Boolean} */
  #dataCtxInitialized;
  #destroyTimeout;
  #cssDataCache;
  #computedStyle;
  #boundCssProps;
  /** @type {Map<string, {ctx: PubSub, name: string}>} */
  #parsedPropCache;

  /** @type {typeof Symbiote} */
  // @ts-expect-error
  #super = this.constructor;

  /** @type {HTMLTemplateElement} */
  static __tpl;

  /** @type {Boolean} */
  static #devMode = false;

  static set devMode(val) {
    Symbiote.#devMode = val;
    PubSub.devMode = val;
  }

  static get devMode() {
    return Symbiote.#devMode;
  }

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
          console.warn(`[Symbiote] <${this.localName}>: custom template "${customTplSelector}" not found.`);
        }
      }
    }
    let clientSSR = this.ssrMode && !globalThis.__SYMBIOTE_SSR;
    if (this.processInnerHtml || clientSSR) {
      for (let fn of this.templateProcessors) {
        fn(this, this);
        // Declarative Shadow DOM: also hydrate existing shadowRoot
        if (clientSSR && this.shadowRoot) {
          fn(this.shadowRoot, this);
        }
      }
    }
    if (!clientSSR && (template || this.#super.template)) {
      if (this.#super.template && !this.#super.__tpl) {
        this.#super.__tpl = document.createElement('template');
        this.#super.__tpl.innerHTML = trustedHTML.createHTML(this.#super.template);
      }
      if (template?.constructor === DocumentFragment) {
        fr = template;
      } else if (template?.constructor === String) {
        let tpl = document.createElement('template');
        tpl.innerHTML = trustedHTML.createHTML(template);
        // @ts-expect-error
        fr = tpl.content.cloneNode(true);
      } else if (this.#super.__tpl) {
        // @ts-expect-error
        fr = this.#super.__tpl.content.cloneNode(true);
      }
      for (let fn of this.templateProcessors) {
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

  constructor() {
    super();
    /** @type {S} */
    this.init$ = Object.create(null);
    /** @type {Object<string, *>} */
    this.cssInit$ = Object.create(null);
    /** @type {Set<(fr: DocumentFragment | Symbiote, fnCtx: Symbiote) => void>} */
    this.templateProcessors = new Set();
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
    this.ssrMode = false;
    /** @type {Boolean} */
    this.allowCustomTemplate = false;
    /** @type {Boolean} */
    this.isVirtual = false;
    /** @type {Boolean} */
    this.allowTemplateInits = true;
  }

  /** @returns {String} */
  get cssCtxName() {
    return this.getCssData(DICT.CSS_CTX_PROP, true);
  }

  /** @returns {String} */
  get ctxName() {
    let ctxName = this.getAttribute(DICT.CTX_NAME_ATTR)?.trim() || this.cssCtxName || this.#cachedCtxName;
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
      this.#localCtx = new PubSub({});
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
    let first = prop.charCodeAt(0);
    // Fast path for common local props (no prefix, no /)
    // Char codes: * = 42, ^ = 94, @ = 64, + = 43, - = 45
    if (first !== 42 && first !== 94 && first !== 64 && first !== 43 && first !== 45 && !prop.includes('/')) {
      return { ctx: fnCtx.localCtx, name: prop };
    }
    if (first === 42) {
      ctx = fnCtx.sharedCtx;
      name = prop.slice(1);
    } else if (first === 94) {
      name = prop.slice(1);
      let found = fnCtx;
      while (found && !found?.has?.(name)) {
        // @ts-expect-error
        found = found.parentElement || found.parentNode || found.host;
      }
      ctx = found?.localCtx || fnCtx.localCtx;
    } else if (prop.includes('/')) {
      let slashIdx = prop.indexOf('/');
      ctx = PubSub.getCtx(prop.slice(0, slashIdx));
      name = prop.slice(slashIdx + 1);
    } else if (first === 45 && prop.charCodeAt(1) === 45) {
      ctx = fnCtx.localCtx;
      name = prop;
      if (!ctx.has(name)) {
        fnCtx.bindCssData(name);
      }
    } else {
      ctx = fnCtx.localCtx;
      name = prop;
    }
    return { ctx, name };
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
      window.queueMicrotask(() => {
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
          // Fast path: local prop (no prefix, no /)
          let first = prop.charCodeAt(0);
          if (first !== 42 && first !== 94 && first !== 64 && first !== 43 && first !== 45 && !prop.includes('/')) {
            this.localCtx.pub(prop, val);
          } else {
            let parsed = Symbiote.#parseProp(prop, this);
            parsed.ctx.pub(parsed.name, val);
          }
          return true;
        },
        get: (obj, /** @type {String} */ prop) => {
          let first = prop.charCodeAt(0);
          if (first !== 42 && first !== 94 && first !== 64 && first !== 43 && first !== 45 && !prop.includes('/')) {
            return this.localCtx.read(prop);
          }
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
        this.localCtx.pub(key, val);
      } else {
        this.localCtx.read(key) !== val && this.localCtx.pub(key, val);
      }
    }
  }

  initAttributeObserver() {
    if (!this.attributeMutationObserver) {
      this.attributeMutationObserver = new MutationObserver((mutations) => {
        for (let mr of mutations) {
          if (mr.type === 'attributes') {
            let propName = DICT.ATTR_BIND_PX + mr.attributeName;
            if (this.has(propName)) {
              this.localCtx.pub(propName, this.getAttribute(mr.attributeName));
            }
          }
        }
      });
      this.attributeMutationObserver.observe(this, {
        attributes: true,
      });
    }
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
        let sharedName = prop.replace(DICT.SHARED_CTX_PX, '');
        let sharedVal = this.init$[prop];
        if (!this.ctxName) {
          if (Symbiote.devMode) {
            console.warn(
              `[Symbiote] "${this.localName}" uses *${sharedName} without ctx attribute or --ctx CSS variable. `
              + 'Set ctx="name" or --ctx to share state.'
            );
          }
        } else {
          if (Symbiote.devMode && this.sharedCtx.has(sharedName)) {
            let existing = this.sharedCtx.read(sharedName);
            if (existing !== sharedVal && typeof sharedVal !== 'function') {
              console.warn(
                `[Symbiote] Shared prop "${sharedName}" already has value. Keeping existing.`
              );
            }
          }
          this.sharedCtx.add(sharedName, sharedVal);
        }
      } else if (prop.startsWith(DICT.ATTR_BIND_PX)) {
        this.localCtx.add(prop, (this.getAttribute(prop.replace(DICT.ATTR_BIND_PX, '')) || this.init$[prop]));
        this.initAttributeObserver();
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
    if (this.#destroyTimeout) {
      window.clearTimeout(this.#destroyTimeout);
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
        this.templateProcessors.add(proc);
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

  /**
   * Animate an element out, then remove it.
   * Sets `[leaving]` attribute, waits for CSS `transitionend`, then calls `.remove()`.
   * @param {HTMLElement} el
   * @returns {Promise<void>}
   */
  static animateOut = animateOut;

  destructionDelay = 100;
  disconnectedCallback() {
    // if element wasn't connected, there is no need to disconnect it
    if (!this.connectedOnce) {
      return;
    }
    this.dropCssDataCache();
    if (!this.readyToDestroy) {
      return;
    }
    if (this.#destroyTimeout) {
      window.clearTimeout(this.#destroyTimeout);
    }
    this.#destroyTimeout = window.setTimeout(() => {
      this.destroyCallback();
      if (this.attributeMutationObserver) {
        this.attributeMutationObserver.disconnect();
      }
      for (let sub of this.allSubs) {
        sub.remove();
        this.allSubs.delete(sub);
      }
      this.#localCtx = null;
      for (let proc of this.templateProcessors) {
        this.templateProcessors.delete(proc);
      }
    }, this.destructionDelay);
  }

  /**
   * @param {String} [tagName]
   * @param {Boolean} [isAlias]
   * @returns {typeof Symbiote}
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
          `[Symbiote] <${tagName}> is already registered (class: ${registeredClass.name}).\n`
          + `Attempted re-registration with class "${this.name}" — skipped.`
        );
      }
      return this;
    }
    window.customElements.define(tagName, isAlias ? class extends this {} : this);
    return this;
  }

  static get is() {
    if (!this.__tag) {
      this.reg();
    }
    return this.__tag;
  }

  /** @param {Object<string, string>} desc */
  static bindAttributes(desc) {
    /** @type {String[]} */
    this.observedAttributes = [ 
      ...new Set((this.observedAttributes || []).concat(Object.keys(desc)))
    ];
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
        this.localCtx.pub($prop, newVal);
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
        !silentCheck && console.warn(`[Symbiote] <${this.localName}>: CSS data parse error for "${propName}". Check that the CSS custom property is defined.`);
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
      val !== null && this.localCtx.read(ctxProp) !== val && (this.localCtx.pub(ctxProp, val));
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
          window.queueMicrotask(() => {
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
    this.rootStyleSheets = [];
    this.addRootStyles(styles);
  }

  /** @param {String | CSSStyleSheet} styles */
  static set shadowStyles(styles) {
    this.shadowStyleSheets = [];
    this.addShadowStyles(styles);
  }
}

export default Symbiote;
