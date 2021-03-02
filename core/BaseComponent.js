import { Tpl } from './Tpl.js';
import { State } from './State.js';
import { FN } from './fn_map.js';
import { DICT } from './dictionary.js';
import { clearElement } from './render_utils.js';

/**
 * Base class for any component
 *
 * @property {Function} post
 */
export class BaseComponent extends HTMLElement {
  /**
   * @param {String} propName
   * @param {Function} [handler]
   */
  defineAccessor(propName, handler) {
    let localPropName = '__' + propName;
    this[localPropName] = this[propName];
    Object.defineProperty(this, propName, {
      set: (val) => {
        this[localPropName] = val;
        handler && handler.bind(this)(val);
      },
      get: () => {
        return this[localPropName];
      },
    });
    this[propName] = this[localPropName];
  }

  /** @param {Object<string, any>} scheme */
  set state(scheme) {
    this.__localState = State.registerLocalCtx(this, scheme);
    this.__stateProxy = new Proxy(Object.create(null), {
      set: (target, prop, value) => {
        // @ts-ignore
        this.pub(prop, value);
        return true;
      },
      get: (target, prop) => {
        // @ts-ignore
        return this.localState.read(prop);
      },
    });
  }

  get state() {
    return this.__stateProxy;
  }

  get localState() {
    return this.__localState;
  }

  get providerState() {
    return this.dataCtxProvider && this.dataCtxProvider.localState;
  }

  /**
   * @param {String} propName
   * @param {Function} callback
   * @param {String} [ctxName]
   * @param {Boolean} [init]
   */
  sub(propName, callback, ctxName, init = true) {
    let ctx = FN.getCtx(this, propName, ctxName);
    let sub = null;
    if (ctx) {
      sub = FN.getCtx(this, propName, ctxName).sub(FN.cleanupPropName(propName), callback, init);
      if (sub) {
        if (!this.__subscriptions) {
          this.__subscriptions = new Set();
        }
        this.__subscriptions.add(sub);
      }
    } else {
      console.warn(`${this.constructor.name}: unable to subscribe (${propName})`);
    }
    return sub;
  }

  /**
   * @param {String} propName
   * @param {any} value
   * @param {String} [ctxName]
   */
  pub(propName, value, ctxName) {
    let ctx = FN.getCtx(this, propName, ctxName);
    if (ctx) {
      ctx.pub(FN.cleanupPropName(propName), value);
    } else {
      console.warn(`${this.constructor.name}: unable to publish property update (${propName}: ${value})`);
    }
  }

  /**
   * @param {String} propName
   * @param {String} [ctxName]
   */
  read(propName, ctxName) {
    let ctx = FN.getCtx(this, propName, ctxName);
    return ctx ? FN.getCtx(this, propName, ctxName).read(FN.cleanupPropName(propName)) : null;
  }

  constructor() {
    super();
    /** Data context provider component */
    this.defineAccessor('dataCtxProvider');
    if (!this.dataCtxProvider) {
      this.dataCtxProvider = null; // JsDoc fix
    }

    if (this.constructor['renderShadow']) {
      this.attachShadow({
        mode: 'open',
      });
    }

    this.__refsMap = null;
    this.__slots = null;
  }

  /** @param {String} name */
  ref(name) {
    return (this.__refsMap && this.__refsMap[name]) || null;
  }

  /** @returns {Object<string, HTMLElement>} */
  get refsMap() {
    return { ...(this.__refsMap || null) };
  }

  readyCallback() {
    this.__readyOnce = true;
    if (this.constructor['__tpl']) {
      /** @type {DocumentFragment} */
      let fr = this.constructor['__tpl'].clone();
      FN.parseFr(this, fr);
      if (this.constructor['renderShadow'] && this.shadowRoot) {
        this.shadowRoot.appendChild(fr);
      } else {
        FN.processSlots(this, fr);
        this.appendChild(fr);
      }
    }
  }

  connectedCallback() {
    if (!this.__readyOnce) {
      this.readyCallback();
    }
  }

  detach() {
    this.__keepSubscriptions = true;
    this.remove();
    return this;
  }

  disconnectedCallback() {
    if (this.__keepSubscriptions) {
      this.__keepSubscriptions = false;
      return;
    }
    FN.removeSubscriptions(this);
    if (this.localState) {
      this.localState.remove();
    }
  }

  /** @param {String[]} arr */
  static set attrs(arr) {
    if (arr.length) {
      Object.defineProperty(this, 'observedAttributes', {
        get: () => {
          return [...arr];
        },
      });
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (newVal === oldVal) {
      return;
    }
    this[name] = newVal;
  }

  /** @param {String} tpl */
  static set template(tpl) {
    this.__tpl = new Tpl(tpl);
  }

  /** @param {Boolean} val */
  static set renderShadow(val) {
    this.__renderShadow = val;
  }

  static get renderShadow() {
    return this.__renderShadow;
  }

  /** @param {String} val */
  static set [DICT.DSL_ATTR_PROP](val) {
    this.__dslAttribute = val;
  }

  static get [DICT.DSL_ATTR_PROP]() {
    return this.__dslAttribute || DICT.DSL_ATTR;
  }

  /**
   * Placed here because need to be redefined in extensions
   *
   * @param {any} fnCtx
   * @param {HTMLElement} el
   * @param {any} val
   */
  static __processSubtreeSubscribtion(fnCtx, el, val) {
    let tpl = new Tpl(val);
    let fr = tpl.clone();
    FN.parseFr(fnCtx, fr);
    clearElement(el);
    el.appendChild(fr);
  }
}