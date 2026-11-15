import { PubSub } from '../core/PubSub.js';
import BaseClass from './BaseClass.js';
import { initialDefaults, isDataKey } from './initial-data.js';
import { ContextData } from './context-data.js';
import { ContextRequests } from './context-requests.js';

export class SymContext extends BaseClass {
  static observedAttributes = [
    ...BaseClass.observedAttributes,
    'src',
    'sync',
    'sync-method',
    'sync-keys',
    'request-timeout',
    'max-bytes',
  ];
  contextData = new ContextData(this);
  requests = new ContextRequests(this);

  /**
   * @param {string} name
   * @param {string | null} previous
   * @param {string | null} value
   */
  attributeChangedCallback(name, previous, value) {
    if (name === 'pub-map') {
      super.attributeChangedCallback(name, previous, value);
    } else if (previous !== value) {
      this.requests.configure(name);
    }
  }

  connectFoundation() {
    super.connectFoundation();
    if (this.isConnected && this.connectedOnce && !this.requests.connected) {
      this.requests.connect();
    }
  }

  /** @type {PubSub | undefined} */
  #provided;
  #name = '';
  #merging = false;
  #active = false;
  /** @type {Map<string, unknown>} */
  #values = new Map();
  /** @type {Set<string>} */
  #watched = new Set();

  get localCtx() {
    return this.#provided ?? super.localCtx;
  }

  prepare() {
    super.prepare();
    let name = this.getAttribute('ctx')?.trim() || '';
    if (name) {
      if (PubSub.getCtx(name, false)) {
        throw new TypeError('A named context already has an owner: ' + name);
      }
      let initial = {
        ...this.init$,
        ...super.localCtx.store,
      };
      this.#name = name;
      this.#provided = PubSub.registerCtx(initial, name);
      initialDefaults.set(this.#provided, initialDefaults.get(super.localCtx) || {});
    }
    this.requests.setup();
  }

  /**
   * Preserve native $ merge semantics; incoming merges do not echo to pub-to.
   * @param {Record<string, unknown>} values
   * @param {boolean} [rewrite]
   */
  add$(values, rewrite = false) {
    this.contextData.incoming(values);
    for (let key of Object.keys(values)) {
      if (isDataKey(key) && !this.#watched.has(key)) {
        this.contextData.changed(key, this.localCtx.has(key) ? this.localCtx.read(key) : undefined, values[key]);
      }
    }
    this.#merging = true;
    try {
      super.add$(values, rewrite);
      for (let key of Object.keys(values)) {
        if (this.#active && isDataKey(key) && this.localCtx.has(key)) {
          this.watchData(key);
          this.#values.set(key, this.localCtx.read(key));
        }
      }
    } finally {
      this.#merging = false;
    }
  }

  renderCallback() {
    super.renderCallback();
    this.#active = true;
    for (let key of Object.keys(this.localCtx.store)) {
      if (isDataKey(key)) { this.watchData(key); }
    }
  }

  /** @param {string} key */
  watchData(key) {
    this.#values.set(key, this.localCtx.read(key));
    if (this.#watched.has(key)) { return; }
    this.#watched.add(key);
    let subscription = this.localCtx.sub(key, (value) => this.publishData(key, value), false);
    if (subscription) { this.allSubs.add(subscription); }
  }

  /**
   * @param {string} key
   * @param {unknown} value
   */
  publishData(key, value) {
    let previous = this.#values.get(key);
    this.#values.set(key, value);
    this.contextData.changed(key, previous, value);
    let target = this.getAttribute('pub-to')?.trim();
    if (this.#merging || !this.isConnected || !target || Object.is(previous, value)) { return; }
    let resolved = this.Symbiote.parseProp(target, this);
    if (!resolved || !resolved.ctx.has(resolved.name) || !isDataKey(resolved.name)
      || resolved.ctx === this.localCtx) {
      throw new TypeError('pub-to requires an existing data property in another context.');
    }
    let data = Object.fromEntries([...this.#values].filter(([
      name,
      current,
    ]) => isDataKey(name) && typeof current !== 'function' && typeof current !== 'symbol'));
    this.$[target] = data;
  }

  /** @param {Record<string, unknown>} data */
  mergeSource(data) {
    this.contextData.applying = true;
    try {
      this.$ = data;
    } finally {
      this.contextData.applying = false;
    }
  }

  disconnectedCallback() {
    this.requests.disconnect();
    super.disconnectedCallback();
  }

  destroyCallback() {
    this.requests.destroy();
    super.destroyCallback();
    if (this.#provided && PubSub.getCtx(this.#name, false) === this.#provided) {
      PubSub.deleteCtx(this.#name);
    }
    this.#active = false;
    this.#provided = undefined;
    this.#name = '';
    this.#values.clear();
    this.#watched.clear();
  }
}

export default SymContext;
