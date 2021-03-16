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

export class State {
  /**
   * @param {Object} src
   * @param {any} [src.element]
   * @param {String} [src.name]
   * @param {Object<string, any>} src.schema
   */
  constructor(src) {
    this.uid = Symbol('State instance ID');
    this.element = src.element || null;
    this.name = src.name || null;
    this.store = cloneObj(src.schema);
    if (src.schema.constructor === Object) {
      this.store = cloneObj(src.schema);
    } else {
      // For Proxy support:
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
    if (this.store[prop] === undefined) {
      State.warn('read', prop);
      return null;
    }
    return this.store[prop];
  }

  /** @param {String} prop */
  has(prop) {
    return this.store[prop] !== undefined;
  }

  /**
   * @param {String} prop
   * @param {any} val
   */
  pub(prop, val) {
    if (this.store[prop] === undefined) {
      State.warn('publish', prop);
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
   * @param {Function} callback
   * @param {Boolean} [init]
   */
  sub(prop, callback, init = true) {
    if (this.store[prop] === undefined) {
      State.warn('subscribe', prop);
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
    delete State.globalStore[this.uid];
  }

  /**
   * @param {any} element
   * @param {Object<string, any>} schema
   */
  static registerLocalCtx(element, schema) {
    let state = new State({
      element,
      schema,
    });
    State.globalStore[state.uid] = state;
    return state;
  }

  /**
   * @param {String} ctxName
   * @param {Object<string, any>} schema
   */
  static registerNamedCtx(ctxName, schema) {
    let state = State.globalStore[ctxName];
    if (state) {
      console.warn('State: context name "' + ctxName + '" already in use');
    } else {
      state = new State({
        name: ctxName,
        schema,
      });
      State.globalStore[ctxName] = state;
    }
    return state;
  }

  /** @param {String} ctxName */
  static clearNamedCtx(ctxName) {
    delete State.globalStore[ctxName];
  }

  static getNamedCtx(ctxName) {
    return State.globalStore[ctxName] || (console.warn('State: wrong context name - "' + ctxName + '"'), null);
  }
}

State.globalStore = Object.create(null);
