import { DICT } from './dictionary.js';

// structuredClone() is limited by supported types, so we use custom cloning:
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

  /** @type {String | Symbol} */
  #uid;
  #proxy;
  /** @type {Boolean} */
  #storeIsProxy;

  /**
   * Local dependency map for computed props.
   * Key = computed prop name, Value = Set of local prop names it depends on.
   * @type {Object<string, Set<string>>}
   */
  #localDeps = {};

  /**
   * External dependency subscriptions for cross-context computed props.
   * Key = computed prop name, Value = array of subscription removers.
   * @type {Object<string, Array<{remove: Function}>>}
   */
  #externalSubs = {};

  /**
   * Tracks which computed prop is currently being executed,
   * so read() can record local dependencies.
   * @type {string | null}
   */
  #trackingTarget = null;

  /**
   * Pending microtask flag to batch computed recalculations.
   * @type {boolean}
   */
  #pendingRecalc = false;

  /**
   * Set of local props that changed and need computed recalc.
   * @type {Set<string>}
   */
  #dirtyProps = new Set();

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
  static #warn(actionName, prop, ctx) {
    let uid = String(ctx?.uid || 'local');
    console.warn(`[Symbiote] PubSub (${uid}): cannot ${actionName}. Property: "${prop}"`);
  }

  /**
   * Execute a computed function while tracking local reads.
   * @param {string} compProp - computed property name
   * @returns {unknown} computed result
   */
  #executeTracked(compProp) {
    let compEntry = this.store[compProp];
    let fn = typeof compEntry === 'function' ? compEntry : compEntry?.fn;

    if (fn?.constructor !== Function) {
      PubSub.#warn('compute', compProp);
      return;
    }

    this.#trackingTarget = compProp;
    this.#localDeps[compProp] = new Set();
    let val = fn();
    this.#trackingTarget = null;

    return val;
  }

  /**
   * Set up external dependency subscriptions for a computed prop declared
   * with object syntax: { deps: ['CTX/prop', ...], fn: () => ... }
   * @param {string} compProp
   * @param {string[]} deps
   */
  #setupExternalDeps(compProp, deps) {
    if (this.#externalSubs[compProp]) {
      this.#externalSubs[compProp].forEach((s) => s.remove());
    }
    this.#externalSubs[compProp] = [];

    for (let depKey of deps) {
      let slashIdx = depKey.indexOf('/');
      if (slashIdx === -1) continue;

      let ctxName = depKey.slice(0, slashIdx);
      let propName = depKey.slice(slashIdx + 1);
      let extCtx = PubSub.getCtx(ctxName, false);

      if (!extCtx) {
        console.warn(
          `[Symbiote] PubSub: external dep context "${ctxName}" not found for computed "${compProp}".\n`
          + `Available contexts: [${[...PubSub.globalStore.keys()].map(String).join(', ')}]`
        );
        continue;
      }

      let sub = extCtx.sub(propName, () => {
        this.#recalcComputed(compProp);
      }, false);

      if (sub) {
        this.#externalSubs[compProp].push(sub);
      }
    }
  }

  /**
   * Recalculate a single computed prop and notify if changed.
   * @param {string} compProp
   */
  #recalcComputed(compProp) {
    if (!this.__computedMap) return;

    let newVal = this.#executeTracked(compProp);
    if (newVal !== this.__computedMap[compProp]) {
      this.__computedMap[compProp] = newVal;
      this.notify(compProp);
    }
  }

  /**
   * Schedule batched recalculation of computed props affected by dirty local props.
   */
  #scheduleBatchRecalc() {
    if (this.#pendingRecalc) return;
    this.#pendingRecalc = true;

    queueMicrotask(() => {
      this.#pendingRecalc = false;
      if (!this.__computedMap) return;

      let dirtySnapshot = new Set(this.#dirtyProps);
      this.#dirtyProps.clear();

      for (let compProp of Object.keys(this.__computedMap)) {
        let deps = this.#localDeps[compProp];
        if (!deps) continue;

        let affected = false;
        for (let dp of dirtySnapshot) {
          if (deps.has(dp)) {
            affected = true;
            break;
          }
        }

        if (affected) {
          this.#recalcComputed(compProp);
        }
      }
    });
  }

  /** @param {keyof T} prop */
  read(prop) {
    if (!this.#storeIsProxy && !this.store.hasOwnProperty(prop)) {
      PubSub.#warn('read', prop);
      return null;
    }
    if (typeof prop === 'string' && prop.startsWith(DICT.COMPUTED_PX)) {
      if (!this.__computedMap) {
        /** 
         * @private 
         * @type {Object<keyof T, *>} 
         */
        this.__computedMap = {};
      }

      // Already initialized — return cached value (recalc happens in #recalcComputed)
      if (prop in this.__computedMap) {
        return this.__computedMap[prop];
      }

      // First read — initialize: execute, cache, setup deps
      let currentVal = this.#executeTracked(prop);
      this.__computedMap[prop] = currentVal;

      let entry = this.store[prop];
      if (entry?.constructor === Object && Array.isArray(entry.deps)) {
        this.#setupExternalDeps(prop, entry.deps);
      }

      this.notify(prop);
      return currentVal;
    } else {
      if (this.#trackingTarget && typeof prop === 'string') {
        this.#localDeps[this.#trackingTarget].add(prop);
      }
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
      PubSub.#warn('publish', prop, this);
      return;
    }
    // @ts-expect-error
    if (prop?.startsWith(DICT.COMPUTED_PX) && val.constructor !== Function) {
      PubSub.#warn('publish computed (value must be a Function)', prop, this);
      return;
    }
    if (!(this.store[prop] === null || val === null) && typeof this.store[prop] !== typeof val) {
      let uid = String(this.uid || 'local');
      console.warn(
        `[Symbiote] PubSub (${uid}): type change for "${String(prop)}" [${typeof this.store[prop]} → ${typeof val}].\n`
        + `Previous: ${JSON.stringify(this.store[prop])}\nNew: ${JSON.stringify(val)}`
      );
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
          return this.read(prop);
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

  /** @param {keyof T} prop */
  notify(prop) {
    // @ts-expect-error
    let isComputed = prop?.startsWith(DICT.COMPUTED_PX);
    if (this.callbackMap[prop]) {
      let val = this.read(prop);
      this.callbackMap[prop].forEach((callback) => {
        callback(val);
      });
      if (isComputed) {
        this.__computedMap[prop] = val;
      }
    }

    if (!isComputed && this.__computedMap) {
      this.#dirtyProps.add(/** @type {string} */ (prop));
      this.#scheduleBatchRecalc();
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
   * @param {String | Symbol} uid 
   */
  set uid(uid) {
    !this.#uid && (this.#uid = uid);
  }

  get uid() {
    return this.#uid;
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
      console.warn(`[Symbiote] PubSub: context "${uid}" is already registered. Returning existing instance.`);
    } else {
      data = new PubSub(schema);
      data.uid = uid;
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
    return PubSub.globalStore.get(uid) || (notify && console.warn(
      `[Symbiote] PubSub: context "${String(uid)}" not found.\n`
      + `Available contexts: [${[...PubSub.globalStore.keys()].map(String).join(', ')}]`
    ), null);
  }
}

/** @type {Map<String | Symbol, PubSub>} */
PubSub.globalStore = new Map();

export default PubSub;
