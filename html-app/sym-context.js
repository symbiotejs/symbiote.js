import { PubSub } from '../core/PubSub.js';
import BaseClass from './BaseClass.js';
import { isDataKey } from './initial-data.js';

export class SymContext extends BaseClass {
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
    }
  }

  /**
   * Preserve native $ merge semantics; incoming merges do not echo to pub-to.
   * @param {Record<string, unknown>} values
   * @param {boolean} [rewrite]
   */
  add$(values, rewrite = false) {
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

  destroyCallback() {
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
