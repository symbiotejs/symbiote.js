import { Data } from './Data.js';
import { DICT } from './dictionary.js';
import { UID } from '../utils/UID.js';
import { setNestedProp } from '../utils/setNestedProp.js';

import PROCESSORS from './tpl-processors.js';
import { parseCssPropertyValue } from '../utils/parseCssPropertyValue.js';

let autoTagsCount = 0;

/** @type {MutationObserver} */
let styleMutationObserver = null;

/** @type {Set<() => void>} */
let styleMutationObserverCbList = null;

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
    if (this.allowCustomTemplate) {
      let customTplSelector = this.getAttribute(DICT.USE_TPL);
      if (customTplSelector) {
        let root = this.getRootNode();
        /** @type {HTMLTemplateElement} */
        // @ts-ignore
        let customTpl = root?.querySelector(customTplSelector) || document.querySelector(customTplSelector);
        if (customTpl) {
          // @ts-ignore
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
    /** @type {Object<string, any>} */
    this.cssInit$ = Object.create(null);
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
    /** @type {Boolean} */
    this.allowCustomTemplate = false;
    /** @type {Boolean} */
    this.ctxOwner = false;
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
    let ctxName = this.getAttribute(DICT.CTX_NAME_ATTR)?.trim() || this.cssCtxName || this.__cachedCtxName || this.autoCtxName;
    /**
     * Cache last ctx name to be able to access context when element becames disconnected
     *
     * @type {String}
     */
    this.__cachedCtxName = ctxName;
    return ctxName;
  }

  /** @returns {Data} */
  get localCtx() {
    if (!this.__localCtx) {
      /** @private */
      this.__localCtx = Data.registerCtx({}, this);
    }
    return this.__localCtx;
  }

  /** @returns {Data} */
  get nodeCtx() {
    return Data.getCtx(this.ctxName, false) || Data.registerCtx({}, this.ctxName);
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
      ctx = Data.getCtx(pArr[0]);
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
   * @param {Boolean} [init]
   */
  sub(prop, handler, init = true) {
    let subCb = (val) => {
      if (!this.isConnected) {
        return;
      }
      handler(val);
    };
    let parsed = BaseComponent.__parseProp(/** @type {string} */ (prop), this);
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
   * @param {String} prop
   * @param {S[T]} val
   * @param {Boolean} [rewrite]
   */
  add(prop, val, rewrite = false) {
    let parsed = BaseComponent.__parseProp(/** @type {String} */ (prop), this);
    parsed.ctx.add(parsed.name, val, rewrite);
  }

  /**
   * @param {Partial<S>} obj
   * @param {Boolean} [rewrite]
   */
  add$(obj, rewrite = false) {
    for (let prop in obj) {
      this.add(prop, obj[/** @type {String} */ (prop)], rewrite);
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
      if (forcePrimitives || !primArr.includes(val?.constructor)) {
        this.$[key] = val;
      } else {
        this.$[key] !== val && (this.$[key] = val);
      }
    }
  }

  /** @private */
  get __ctxOwner() {
    return this.ctxOwner || (this.hasAttribute(DICT.CTX_OWNER_ATTR) && this.getAttribute(DICT.CTX_OWNER_ATTR) !== 'false');
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
        this.nodeCtx.add(prop.replace(DICT.EXT_DATA_CTX_PRFX, ''), this.init$[prop], this.__ctxOwner);
      } else if (prop.includes(DICT.NAMED_DATA_CTX_SPLTR)) {
        let propArr = prop.split(DICT.NAMED_DATA_CTX_SPLTR);
        let ctxName = propArr[0].trim();
        let propName = propArr[1].trim();
        if (ctxName && propName) {
          let namedCtx = Data.getCtx(ctxName, false);
          if (!namedCtx) {
            namedCtx = Data.registerCtx({}, ctxName);
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
    /** @private */
    this.__dataCtxInitialized = true;
  }

  connectedCallback() {
    // As `connectedCallback` calls are queued, it could be called after element being detached from DOM
    // See example at https://html.spec.whatwg.org/multipage/custom-elements.html#custom-element-conformance
    if (!this.isConnected) {
      return;
    }
    if (this.__disconnectTimeout) {
      window.clearTimeout(this.__disconnectTimeout);
    }
    if (!this.connectedOnce) {
      let ctxNameAttrVal = this.getAttribute(DICT.CTX_NAME_ATTR)?.trim();
      if (ctxNameAttrVal) {
        this.style.setProperty(DICT.CSS_CTX_PROP, `'${ctxNameAttrVal}'`);
      }
      this.__initDataCtx();
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
        this.__initCallback();
      } else {
        if (this.constructor['__rootStylesLink']) {
          let root = this.getRootNode();
          if (!root) {
            return;
          }
          // @ts-ignore
          let hasLink = root?.querySelector(`link[${DICT.ROOT_STYLE_ATTR_NAME}="${this.constructor.is}"]`);
          if (hasLink) {
            this.render();
            return;
          }
          /** @type {HTMLLinkElement} */
          let rootLink = this.constructor['__rootStylesLink'].cloneNode(true);
          rootLink.setAttribute(DICT.ROOT_STYLE_ATTR_NAME, this.constructor['is']);
          rootLink.onload = () => {
            this.render();
          };
          // @ts-ignore
          root.nodeType === Node.DOCUMENT_NODE ? root.head.appendChild(rootLink) : root.prepend(rootLink);
        } else {
          this.render();
        }
      }
    }
    this.connectedOnce = true;
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
      styleMutationObserverCbList?.delete(this.updateCssData);
      if (!styleMutationObserverCbList?.size) {
        styleMutationObserver?.disconnect();
        styleMutationObserver = null;
        styleMutationObserverCbList = null;
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
    let $prop = this.constructor['__attrDesc']?.[name];
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
      try {
        this.__cssDataCache[propName] = parseCssPropertyValue(val);
      } catch (e) {
        !silentCheck && console.warn(`CSS Data error: ${propName}`);
        this.__cssDataCache[propName] = null;
      }
    }
    return this.__cssDataCache[propName];
  }

  /**
   * @private
   * @param {String} ctxPropName
   */
  __extractCssName(ctxPropName) {
    return ctxPropName
      .split('--')
      .map((part, idx) => {
        return idx === 0 ? '' : part;
      })
      .join('--');
  }

  updateCssData = () => {
    this.dropCssDataCache();
    this.__boundCssProps?.forEach((ctxProp) => {
      let val = this.getCssData(this.__extractCssName(ctxProp), true);
      val !== null && this.$[ctxProp] !== val && (this.$[ctxProp] = val);
    });
  };

  /** @private */
  __initStyleAttrObserver() {
    if (!styleMutationObserverCbList) {
      styleMutationObserverCbList = new Set();
    }
    styleMutationObserverCbList.add(this.updateCssData);
    if (!styleMutationObserver) {
      styleMutationObserver = new MutationObserver((/** @type {MutationRecord[]} */ records) => {
        records[0].type === 'attributes' &&
          styleMutationObserverCbList.forEach((cb) => {
            cb();
          });
      });
      styleMutationObserver.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style'],
      });
    }
  }

  /**
   * @param {String} propName
   * @param {any} [initValue] Uses empty string by default to make value useful in template
   */
  bindCssData(propName, initValue = '') {
    if (!this.__boundCssProps) {
      /** @private */
      this.__boundCssProps = new Set();
    }
    this.__boundCssProps.add(propName);
    let val = this.getCssData(this.__extractCssName(propName), true);
    val === null && (val = initValue);
    this.add(propName, val);
    this.__initStyleAttrObserver();
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

  /** @param {String} cssTxt */
  static set rootStyles(cssTxt) {
    if (!this.__rootStylesLink) {
      let styleBlob = new Blob([cssTxt], {
        type: 'text/css',
      });
      /** @private */
      let url = URL.createObjectURL(styleBlob);
      let link = document.createElement('link');
      link.href = url;
      link.rel = 'stylesheet';
      this.__rootStylesLink = link;
    }
  }
}
