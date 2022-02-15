export const READY_EVENT_NAME = 'idb-store-ready';

const DEFAULT_DB_NAME = `symbiote-db`;
const UPD_EVENT_PREFIX = `symbiote-idb-update_`;

class DbInstance {
  /**
   * @private
   * @template {Event} T
   * @param {T} [event]
   */
  _notifyWhenReady(event = null) {
    window.dispatchEvent(
      new CustomEvent(READY_EVENT_NAME, {
        detail: {
          dbName: this.name,
          storeName: this.storeName,
          event,
        },
      })
    );
  }

  /**
   * @private
   * @returns {String}
   */
  get _updEventName() {
    return UPD_EVENT_PREFIX + this.name;
  }

  /**
   * @private
   * @param {String} key
   */
  _getUpdateEvent(key) {
    return new CustomEvent(this._updEventName, {
      detail: {
        key: this.name,
        newValue: key,
      },
    });
  }

  /**
   * @private
   * @param {String} key
   */
  _notifySubscribers(key) {
    window.localStorage.removeItem(this.name);
    window.localStorage.setItem(this.name, key);
    window.dispatchEvent(this._getUpdateEvent(key));
  }

  /**
   * @param {String} dbName
   * @param {String} storeName
   */
  constructor(dbName, storeName) {
    /** @type {String} */
    this.name = dbName;
    /** @type {String} */
    this.storeName = storeName;
    /** @type {Number} */
    this.version = 1;
    /** @type {IDBOpenDBRequest} */
    this.request = window.indexedDB.open(this.name, this.version);
    this.request.onupgradeneeded = (e) => {
      this.db = e.target['result'];
      this.objStore = this.db.createObjectStore(storeName, {
        keyPath: '_key',
      });
      this.objStore.transaction.oncomplete = (ev) => {
        this._notifyWhenReady(ev);
      };
    };
    this.request.onsuccess = (/** @type {StorageEvent} */ e) => {
      // @ts-ignore
      this.db = e.target.result;
      this._notifyWhenReady(e);
    };
    this.request.onerror = (e) => {
      console.error(e);
    };
    /** @private */
    this._subscriptionsMap = {};
    /** @private */
    this._updateHandler = (/** @type {StorageEvent} */ e) => {
      if (e.key === this.name && this._subscriptionsMap[e.newValue]) {
        /** @type {Set<Function>} */
        let set = this._subscriptionsMap[e.newValue];
        set.forEach(async (callback) => {
          callback(await this.read(e.newValue));
        });
      }
    };
    /** @private */
    this._localUpdateHandler = (e) => {
      this._updateHandler(e.detail);
    };
    window.addEventListener('storage', this._updateHandler);
    window.addEventListener(this._updEventName, this._localUpdateHandler);
  }

  /** @param {String} key */
  read(key) {
    let tx = this.db.transaction(this.storeName, 'readwrite');
    let request = tx.objectStore(this.storeName).get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = (e) => {
        if (e.target.result?._value) {
          resolve(e.target.result._value);
        } else {
          resolve(null);
          console.warn(`IDB: cannot read "${key}"`);
        }
      };
      request.onerror = (e) => {
        reject(e);
      };
    });
  }

  /**
   * @param {String} key
   * @param {any} value
   * @param {Boolean} [silent]
   */
  write(key, value, silent = false) {
    let data = {
      _key: key,
      _value: value,
    };
    let tx = this.db.transaction(this.storeName, 'readwrite');
    let request = tx.objectStore(this.storeName).put(data);
    return new Promise((resolve, reject) => {
      request.onsuccess = (e) => {
        if (!silent) {
          this._notifySubscribers(key);
        }
        resolve(e.target.result);
      };
      request.onerror = (e) => {
        reject(e);
      };
    });
  }

  /**
   * @param {String} key
   * @param {Boolean} [silent]
   */
  delete(key, silent = false) {
    let tx = this.db.transaction(this.storeName, 'readwrite');
    let request = tx.objectStore(this.storeName).delete(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = (e) => {
        if (!silent) {
          this._notifySubscribers(key);
        }
        resolve(e);
      };
      request.onerror = (e) => {
        reject(e);
      };
    });
  }

  getAll() {
    let tx = this.db.transaction(this.storeName, 'readwrite');
    let request = tx.objectStore(this.storeName).getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = (e) => {
        let all = e.target.result;
        resolve(
          all.map((obj) => {
            return obj._value;
          })
        );
      };
      request.onerror = (e) => {
        reject(e);
      };
    });
  }

  /**
   * @param {String} key
   * @param {(val: any) => void} callback
   */
  subscribe(key, callback) {
    if (!this._subscriptionsMap[key]) {
      /** @private */
      this._subscriptionsMap[key] = new Set();
    }
    /** @type {Set} */
    let set = this._subscriptionsMap[key];
    set.add(callback);
    return {
      remove: () => {
        set.delete(callback);
        if (!set.size) {
          delete this._subscriptionsMap[key];
        }
      },
    };
  }

  stop() {
    window.removeEventListener('storage', this._updateHandler);
    this._subscriptionsMap = null;
    IDB.clear(this.name);
  }
}

export class IDB {
  /** @returns {String} */
  static get readyEventName() {
    return READY_EVENT_NAME;
  }

  /**
   * @param {String} dbName
   * @param {String} [storeName]
   * @returns {DbInstance}
   */
  static open(dbName = DEFAULT_DB_NAME, storeName = 'store') {
    let key = dbName + '/' + storeName;
    if (!this._reg[key]) {
      this._reg[key] = new DbInstance(dbName, storeName);
    }
    return this._reg[key];
  }

  /** @private */
  static _reg = Object.create(null);

  /** @param {String} dbName */
  static clear(dbName) {
    window.indexedDB.deleteDatabase(dbName);
    for (let key in this._reg) {
      if (key.split('/')[0] === dbName) {
        delete this._reg[key];
      }
    }
  }
}
