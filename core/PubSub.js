import { DICT } from './dictionary.js';

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

/** @template {Record<string, unknown>} T */
export class PubSub {

  #proxy;
  #storeIsProxy;

  /** @param {T} schema */
  constructor(schema) {
    if (schema.constructor === Object) {
      this.store = cloneObj(schema);
    } else {
      // For Proxy support:
      this.#storeIsProxy = true;
      this.store = schema;
    }
    /** @type {Record<keyof T, Set<(val:unknown) => void>>} */
    this.callbackMap = Object.create(null);
  }

  /**
   * @param {String} actionName
   * @param {*} prop
   */
  static #warn(actionName, prop) {
    console.warn(`Symbiote PubSub: cannot ${actionName}. Prop name: ` + prop);
  }

  /** @param {keyof T} prop */
  read(prop) {
    if (!this.#storeIsProxy && !this.store.hasOwnProperty(prop)) {
      PubSub.#warn('read', prop);
      return null;
    }
    if (typeof prop === 'string' && prop.includes(DICT.COMPUTED_PX)) {
      /** @type {Function} */
      let compFn = this.store[prop];
      if (!this.__computedSet) {
        this.__computedSet = new Set();
      }
      this.__computedSet.add(prop);
      if (compFn?.constructor !== Function) {
        PubSub.#warn('compute', prop);
      } else {
        return compFn();
      }
    } else {
      return this.store[prop];
    }
  }

  /** @param {String} prop */
  has(prop) {
    return this.#storeIsProxy ? this.store[prop] !== undefined : this.store.hasOwnProperty(prop);
  }

  /**
   * @param {String} prop
   * @param {unknown} val
   * @param {Boolean} [rewrite]
   */
  add(prop, val, rewrite = false) {
    if (!rewrite && Object.keys(this.store).includes(prop)) {
      return;
    }
    this.store[prop] = val;
    this.notify(prop);
  }

  /**
   * @param {keyof T} prop
   * @param {unknown} val
   */
  pub(prop, val) {
    if (!this.#storeIsProxy && !this.store.hasOwnProperty(prop)) {
      PubSub.#warn('publish', prop);
      return;
    }
    // @ts-expect-error
    if (prop?.startsWith(DICT.COMPUTED_PX) && val.constructor !== Function) {
      PubSub.#warn('publish computed', prop);
      return;
    }
    if (typeof this.store[prop] !== typeof val) {
      // @ts-expect-error
      console.warn(`Symbiote PubSub: type warning for "${prop}" [${typeof this.store[prop]} -> ${typeof val}]`);
    }
    this.store[prop] = val;
    this.notify(prop);
  }

  /** @returns {T} */
  get proxy() {
    if (!this.#proxy) {
      let o = Object.create(null);
      this.#proxy = new Proxy(o, {
        set: (obj, /** @type {String} */ prop, val) => {
          this.pub(prop, val);
          return true;
        },
        get: (obj, /** @type {String} */ prop) => {
          this.read(prop);
        },
      });
    }
    return this.#proxy;
  }

  /** @param {T} updObj */
  multiPub(updObj) {
    for (let prop in updObj) {
      this.pub(prop, updObj[prop]);
    }
  }

  #processComputed() {
    if (this.__computedSet) {
      this.__computedSet.forEach((prop) => {
        if (this[`__${prop}_timeout`]) {
          window.clearTimeout(this[`__${prop}_timeout`]);
        }
        this[`__${prop}_timeout`] = window.setTimeout(() => {
          this.notify(prop);
        });
      });
    }
  }

  /** @param {keyof T} prop */
  notify(prop) {
    if (this.callbackMap[prop]) {
      this.callbackMap[prop].forEach((callback) => {
        callback(this.read(prop));
      });
      // @ts-expect-error
      !prop?.startsWith(DICT.COMPUTED_PX) && this.#processComputed();
    }
  }

  /**
   * @param {keyof T} prop
   * @param {(val: unknown) => void} callback
   * @param {Boolean} [init]
   */
  sub(prop, callback, init = true) {
    if (!this.#storeIsProxy && !this.store.hasOwnProperty(prop)) {
      PubSub.#warn('subscribe', prop);
      return null;
    }
    if (!this.callbackMap[prop]) {
      this.callbackMap[prop] = new Set();
    }
    this.callbackMap[prop].add(callback);
    if (init) {
      callback(this.read(prop));
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

  /**
   * @template {Record<string, unknown>} S
   * @param {S} schema
   * @param {String | Symbol} [uid]
   * @returns {PubSub<S>}
   */
  static registerCtx(schema, uid = Symbol()) {
    /** @type {PubSub} */
    let data = PubSub.globalStore.get(uid);
    if (data) {
      console.warn('PubSub: context UID "' + uid + '" is already in use');
    } else {
      data = new PubSub(schema);
      PubSub.globalStore.set(uid, data);
    }
    return data;
  }

  /** @param {String | Symbol} uid */
  static deleteCtx(uid) {
    PubSub.globalStore.delete(uid);
  }

  /**
   * @param {String | Symbol} uid
   * @param {Boolean} [notify]
   * @returns {PubSub}
   */
  static getCtx(uid, notify = true) {
    return PubSub.globalStore.get(uid) || (notify && console.warn('PubSub: wrong context UID - "' + uid + '"'), null);
  }
}

/** @type {Map<String | Symbol, PubSub>} */
PubSub.globalStore = new Map();

export default PubSub;
