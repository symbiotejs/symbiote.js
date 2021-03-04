import { UID } from '../utils/UID.js';

export const BROADCAST_EVENT_PREFIX = 'broadcast_';
export const SUBSCRIBTION_EVENT_PREFIX = 'subsribtion_';
export const ATTR_NAME = 'channel';

export class MsgChannel {
  constructor(uid) {
    this.uid = uid;
    this._currentValue = null;
    this._subscriptions = new Set();

    this._eventHandler = (/** @type {CustomEvent} */ e) => {
      this.broadcast(e.detail, false);
    };
    // @ts-ignore
    window.addEventListener(BROADCAST_EVENT_PREFIX + this.uid, this._eventHandler);
  }

  /**
   * @param {any} msg
   * @param {Boolean} [dispatchEvent]
   */
  broadcast(msg, dispatchEvent = true) {
    this._currentValue = msg;
    this._subscriptions.forEach((callback) => {
      callback(this._currentValue);
    });
    if (dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent(SUBSCRIBTION_EVENT_PREFIX + this.uid, {
          detail: msg,
        })
      );
    }
  }

  /**
   * @param {Function} callback
   * @param {Boolean} [init]
   */
  subscribe(callback, init = false) {
    this._subscriptions.add(callback);
    if (init) {
      callback(this._currentValue);
    }
    return {
      remove: () => {
        this._subscriptions.delete(callback);
      },
    };
  }

  stop() {
    this._currentValue = null;
    this._subscriptions = new Set();
    // @ts-ignore
    window.removeEventListener(BROADCAST_EVENT_PREFIX + this.uid, this._eventHandler);
  }
}

export class DreamChannels {
  /**
   * @param {String} uid
   * @param {any} [create]
   * @returns {MsgChannel}
   */
  static connect(uid, create = true) {
    if (!this._store[uid] && create) {
      this._store[uid] = new MsgChannel(uid);
    }
    return this._store[uid];
  }

  static disconnect(uid) {
    if (this._store[uid]) {
      this._store[uid].stop();
      delete this._store[uid];
    }
  }
}

DreamChannels._store = Object.create(null);

/** @param {typeof import('../core/BaseComponent').BaseComponent} classObj */
export function channelsExt(classObj) {
  return class extends classObj {
    constructor() {
      super();
      this.__channelPortId = UID.generate();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (name === ATTR_NAME) {
        this.__channelConnection = DreamChannels.connect(newVal);
        this.__channelConnection.subscribe((msg) => {
          if (msg.constructor !== Object || msg.from === this.__channelPortId) {
            return;
          }
          if (msg.setProps && msg.setProps.constructor === Object) {
            Object.assign(this, msg.setProps);
          }
        });
      }
    }

    broadcast(msg) {
      if (!this.__channelConnection) {
        return;
      }
      let message = {
        from: this.__channelPortId,
        setProps: msg,
      };
      this.__channelConnection.broadcast(message);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.__channelConnection && DreamChannels.disconnect(this.__channelConnection.uid);
    }

    static set attrs(attrList) {
      this.__attrList = attrList;
    }

    static get observedAttributes() {
      return this.__attrList ? [ATTR_NAME, ...this.__attrList] : [ATTR_NAME];
    }
  };
}
