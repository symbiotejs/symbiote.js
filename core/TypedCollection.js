import { UID } from '../utils/UID.js';
import { Data } from './Data.js';
import { TypedData } from './TypedData.js';

export class TypedCollection {
  /**
   * @param {Object} options
   * @param {Object<string, {type: any, value: any}>} options.typedSchema 
   * @param {String[]} [options.watchList] 
   * @param {(list:string[]) => void} [options.handler] 
   * @param {String} [options.ctxName] 
   */
  constructor(options) {
    /** @type {Object<string, {type: any, value: any}>} */
    this.__typedSchema = options.typedSchema;
    /** @type {String} */
    this.__ctxId = options.ctxName || UID.generate();
    /** @type {Data} */
    this.__state = Data.registerNamedCtx(this.__ctxId, {});
    /** @type {string[]} */
    this.__watchList = options.watchList || [];
    /** @type {(list:string[]) => void} */
    this.__handler = options.handler || null;
    this.__subsMap = Object.create(null);
    /** @type {Set} */
    this.__observers = new Set();
    /** @type {Set<string>} */
    this.__items = new Set();

    let changeMap = Object.create(null);

    this.__notifyObservers = (propName, ctxId) => {
      if (this.__observeTimeout) {
        window.clearTimeout(this.__observeTimeout);
      }
      if (!changeMap[propName]) {
        changeMap[propName] = new Set();
      }
      changeMap[propName].add(ctxId);
      this.__observeTimeout = window.setTimeout(() => {
        this.__observers.forEach((handler) => {
          handler({...changeMap});
        });
        changeMap = Object.create(null);
      });
    };
  }

  notify() {
    if (this.__notifyTimeout) {
      window.clearTimeout(this.__notifyTimeout);
    }
    this.__notifyTimeout = window.setTimeout(() => {
      this.__handler?.([...this.__items]);
    });
  }

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
      this.__subsMap[item.__ctxId].push(item.subscribe(propName, () => {
        this.__notifyObservers(propName, item.__ctxId);
      }));
    });
    this.__items.add(item.__ctxId);
    this.notify();
    return item;
  }

  /**
   * 
   * @param {String} id 
   * @returns {TypedData}
   */
  read(id) {
    return this.__state.read(id);
  }

  readProp(id, propName) {
    let item = this.read(id);
    return item.getValue(propName);
  }

  publishProp(id, propName, value) {
    let item = this.read(id);
    item.setValue(propName, value);
  }

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

  /**
   * 
   * @param {Function} handler 
   */
  observe(handler) {
    this.__observers.add(handler);
  } 

  /**
   * 
   * @param {Function} handler 
   */
  unobserve(handler) {
    this.__observers.delete(handler);
  }

  /**
   * 
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