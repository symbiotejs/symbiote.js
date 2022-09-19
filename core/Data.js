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
  /** @param {Object<string, any>} schema */
  constructor(schema) {
    if (schema.constructor === Object) {
      this.store = cloneObj(schema);
    } else {
      // For Proxy support:
      /** @private */
      this._storeIsProxy = true;
      this.store = schema;
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
  add(prop, val, rewrite = false) {
    if (!rewrite && Object.keys(this.store).includes(prop)) {
      return;
    }
    this.store[prop] = val;
    this.notify(prop);
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
    this.store[prop] = val;
    this.notify(prop);
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

  /**
   * @param {Object<string, any>} schema
   * @param {any} [uid]
   * @returns {Data}
   */
  static registerCtx(schema, uid = Symbol()) {
    /** @type {Data} */
    let data = Data.globalStore.get(uid);
    if (data) {
      console.warn('State: context UID "' + uid + '" already in use');
    } else {
      data = new Data(schema);
      Data.globalStore.set(uid, data);
    }
    return data;
  }

  /** @param {any} uid */
  static deleteCtx(uid) {
    Data.globalStore.delete(uid);
  }

  /**
   * @param {any} uid
   * @param {Boolean} [notify]
   * @returns {Data}
   */
  static getCtx(uid, notify = true) {
    return Data.globalStore.get(uid) || (notify && console.warn('State: wrong context UID - "' + uid + '"'), null);
  }
}

Data.globalStore = new Map();
