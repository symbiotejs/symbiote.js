import { UID } from '../utils/UID.js';
import { Data } from './Data.js';
import { TypedData } from './TypedData.js';

export class TypedCollection {
  /**
   * @param {Object} options
   * @param {Object<string, { type: any; value: * }>} options.typedSchema
   * @param {String[]} [options.watchList]
   * @param {(list: string[]) => void} [options.handler]
   * @param {String} [options.ctxName]
   */
  constructor(options) {
    /**
     * @private
     * @type {Object<string, { type: any; value: * }>}
     */
    this.__typedSchema = options.typedSchema;
    /**
     * @private
     * @type {String}
     */
    this.__ctxId = options.ctxName || UID.generate();
    /**
     * @private
     * @type {Data}
     */
    this.__state = Data.registerNamedCtx(this.__ctxId, {});
    /**
     * @private
     * @type {string[]}
     */
    this.__watchList = options.watchList || [];
    /**
     * @private
     * @type {(list: string[]) => void}
     */
    this.__handler = options.handler || null;
    /**
     * @private
     * @type {Object<string, any>}
     */
    this.__subsMap = Object.create(null);
    /**
     * @private
     * @type {Set}
     */
    this.__observers = new Set();
    /**
     * @private
     * @type {Set<string>}
     */
    this.__items = new Set();

    let changeMap = Object.create(null);

    /**
     * @private
     * @param {String} propName
     * @param {String} ctxId
     */
    this.__notifyObservers = (propName, ctxId) => {
      if (this.__observeTimeout) {
        window.clearTimeout(this.__observeTimeout);
      }
      if (!changeMap[propName]) {
        changeMap[propName] = new Set();
      }
      changeMap[propName].add(ctxId);
      /** @private */
      this.__observeTimeout = window.setTimeout(() => {
        this.__observers.forEach((handler) => {
          handler({ ...changeMap });
        });
        changeMap = Object.create(null);
      });
    };
  }

  notify() {
    if (this.__notifyTimeout) {
      window.clearTimeout(this.__notifyTimeout);
    }
    /** @private */
    this.__notifyTimeout = window.setTimeout(() => {
      this.__handler?.([...this.__items]);
    });
  }

  /**
   * @param {Object<string, any>} init
   * @returns {any}
   */
  add(init) {
    let item = new TypedData(this.__typedSchema);
    for (let prop in init) {
      item.setValue(prop, init[prop]);
    }
    this.__state.add(item.__ctxId, item);
    this.__watchList.forEach((propName) => {
      if (!this.__subsMap[item.__ctxId]) {
        this.__subsMap[item.__ctxId] = [];
      }
      this.__subsMap[item.__ctxId].push(
        item.subscribe(propName, () => {
          this.__notifyObservers(propName, item.__ctxId);
        })
      );
    });
    this.__items.add(item.__ctxId);
    this.notify();
    return item;
  }

  /**
   * @param {String} id
   * @returns {TypedData}
   */
  read(id) {
    return this.__state.read(id);
  }

  /**
   * @param {String} id
   * @param {String} propName
   * @returns {any}
   */
  readProp(id, propName) {
    let item = this.read(id);
    return item.getValue(propName);
  }

  /**
   * @template T
   * @param {String} id
   * @param {String} propName
   * @param {T} value
   */
  publishProp(id, propName, value) {
    let item = this.read(id);
    item.setValue(propName, value);
  }

  /** @param {String} id */
  remove(id) {
    this.__items.delete(id);
    this.notify();
    this.__state.pub(id, null);
    delete this.__subsMap[id];
  }

  clearAll() {
    this.__items.forEach((id) => {
      this.remove(id);
    });
  }

  /** @param {Function} handler */
  observe(handler) {
    this.__observers.add(handler);
  }

  /** @param {Function} handler */
  unobserve(handler) {
    this.__observers.delete(handler);
  }

  /**
   * @param {(item: TypedData) => Boolean} checkFn
   * @returns {String[]}
   */
  findItems(checkFn) {
    let result = [];
    this.__items.forEach((id) => {
      let item = this.read(id);
      if (checkFn(item)) {
        result.push(id);
      }
    });
    return result;
  }

  items() {
    return [...this.__items];
  }

  destroy() {
    this.__state.remove();
    this.__observers = null;
    for (let id in this.__subsMap) {
      this.__subsMap[id].forEach((sub) => {
        sub.remove();
      });
      delete this.__subsMap[id];
    }
  }
}
