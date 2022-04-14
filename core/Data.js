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

export class Data {
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
      /** @private */
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
    console.warn(`Symbiote Data: cannot ${actionName}. Prop name: ` + prop);
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
   * @param {unknown} val
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
   * @template T
   * @param {String} prop
   * @param {T} val
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
        if (!this.callbackMap[prop]) {
          return;
        }
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

  /** @param {Data} other */
  merge(other) {
    this.multiPub(other.store);
  }

  clone() {
    let newData = new Data({ schema: this.store });
    return newData;
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
