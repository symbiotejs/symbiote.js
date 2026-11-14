import { isDataKey } from './initial-data.js';
import { resolveData } from './action-data.js';
export class PubMap {
  connected = false;
  queued = false;
  version = 0;
  /** @type {{ target: string, source: string }[]} */
  bindings = [];
  /** @type {{ remove(): void }[]} */
  subscriptions = [];
  /** @param {import('./BaseClass.js').BaseClass} owner */
  constructor(owner) {
    this.owner = owner;
  }
  connect() {
    if (this.connected || !this.owner.isConnected) {
      return;
    }
    this.connected = true;
    this.refresh();
  }
  disconnect() {
    this.connected = false;
    this.version += 1;
    this.queued = false;
    for (let subscription of this.subscriptions) {
      subscription.remove();
    }
    this.subscriptions = [];
    this.bindings = [];
  }
  refresh() {
    if (!this.connected) {
      return;
    }
    this.disconnect();
    this.connected = true;
    let targets = new Set();
    this.bindings = (this.owner.getAttribute('pub-map') || '').split(';').filter((part) => part.trim()).map((part) => {
      let pieces = part.split(':').map((value) => value.trim());
      let [
        target,
        source,
      ] = pieces;
      if (pieces.length !== 2 || !target || !source || targets.has(target)
        || !isDataKey(source.startsWith('+') ? source.slice(1) : source)
        || !this.owner.localCtx.has(source)) {
        throw new TypeError('pub-map requires unique target: localProperty pairs.');
      }
      resolveData(this.owner, target);
      targets.add(target);
      return {
        target,
        source,
      };
    });
    for (let source of new Set(this.bindings.map((binding) => binding.source))) {
      let subscription = this.owner.localCtx.sub(source, () => this.schedule(), false);
      if (subscription) {
        this.subscriptions.push(subscription);
      }
    }
    this.schedule();
  }
  schedule() {
    if (this.queued || !this.connected || !this.bindings.length) {
      return;
    }
    this.queued = true;
    let version = this.version;
    queueMicrotask(() => {
      if (version !== this.version) {
        return;
      }
      this.queued = false;
      if (!this.connected || !this.owner.isConnected) {
        return;
      }
      let values = Object.create(null);
      for (let {
        target,
        source,
      } of this.bindings) {
        let destination = resolveData(this.owner, target);
        let value = this.owner.$[source];
        if (value !== undefined && !Object.is(destination.ctx.read(destination.name), value)) {
          values[target] = value;
        }
      }
      this.owner.$ = values;
    });
  }
}
