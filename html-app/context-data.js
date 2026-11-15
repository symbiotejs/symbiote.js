import { isDataKey, initialDefaults } from './initial-data.js';
import { cloneData, validateJSON } from './collection-data.js';
import { SourceError } from './fetch-source.js';
import { validateValue } from './action-data.js';

export class ContextData {
  keys = new Set();
  bound = new Set();
  edited = new Set();
  /** @type {Map<string, Set<object>>} */
  pending = new Map();
  /** @type {Map<string, number>} */
  versions = new Map();
  revision = 0;
  /** @type {number | null} */
  savedRevision = null;
  applying = false;

  /** @param {import('./sym-context.js').SymContext} owner */
  constructor(owner) {
    this.owner = owner;
  }

  setup() {
    for (let [
      key,
      value,
    ] of Object.entries({
      ...this.owner.init$,
      ...initialDefaults.get(this.owner.localCtx),
    })) {
      if (isDataKey(key)) {
        try {
          validateJSON(value);
          this.keys.add(key);
        } catch {
          // Native handlers and descriptors are controls, not public JSON data.
        }
      }
    }
  }

  /** @param {Record<string, unknown>} values */
  incoming(values) {
    for (let [
      key,
      value,
    ] of Object.entries(values)) {
      if (!isDataKey(key)) {
        continue;
      }
      if (!this.applying) {
        this.bound.add(key);
      }
      try {
        validateJSON(value);
        this.keys.add(key);
      } catch {
        // Existing public fields remain selected so invalid writes fail visibly.
      }
    }
  }

  selected() {
    let fields = this.owner.getAttribute('sync-keys');
    return fields === null ? [
      ...this.keys,
    ] : fields.split(',').map((key) => key.trim()).filter(Boolean);
  }

  dirty() {
    return this.selected().some((key) => this.edited.has(key) || this.pending.has(key));
  }

  /**
   * @param {string} key
   * @param {unknown} previous
   * @param {unknown} value
   */
  changed(key, previous, value) {
    if (!isDataKey(key) || Object.is(previous, value)) {
      return;
    }
    if (!this.keys.has(key)) {
      try {
        validateJSON(value);
        this.keys.add(key);
      } catch {
        return;
      }
    }
    this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
    if (!this.applying) {
      this.edited.add(key);
    }
    if (this.selected().includes(key)) {
      this.revision++;
    }
    this.owner.requests.publish();
  }

  /**
   * Protect a captured edit without publishing it before its debounce expires.
   * @param {string} key
   * @param {unknown} value
   */
  intent(key, value) {
    validateJSON(value);
    this.keys.add(key);
    this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
    let token = {};
    let pending = this.pending.get(key) ?? new Set();
    pending.add(token);
    this.pending.set(key, pending);
    this.owner.requests.publish();
    return {
      remove: () => {
        pending.delete(token);
        if (!pending.size) {
          this.pending.delete(key);
        }
        this.owner.requests.publish();
      },
    };
  }

  /** @param {string[]} [keys] */
  snapshot(keys = this.selected()) {
    if (!keys.length || new Set(keys).size !== keys.length
      || keys.some((key) => !isDataKey(key) || !this.keys.has(key))) {
      throw new SourceError('INVALID_DATA', 'Selected fields must be known public data fields.');
    }
    let data = Object.fromEntries(keys.map((key) => [
      key,
      this.owner.localCtx.read(key),
    ]));
    return {
      data: cloneData(data),
      revision: this.revision,
      versions: new Map(keys.map((key) => [
        key,
        this.versions.get(key) ?? 0,
      ])),
    };
  }

  /**
   * @param {number} revision
   * @param {Map<string, number>} versions
   */
  acknowledge(revision, versions) {
    this.savedRevision = revision;
    for (let [
      key,
      version,
    ] of versions) {
      if ((this.versions.get(key) ?? 0) === version) {
        this.edited.delete(key);
      }
    }
    this.owner.requests.publish();
  }

  /** @param {Record<string, unknown>} data */
  validate(data) {
    for (let [
      key,
      value,
    ] of Object.entries(data)) {
      if (!isDataKey(key)) {
        throw new SourceError('INVALID_DATA', 'Source keys must be public data fields.');
      }
      if (this.owner.localCtx.has(key)) {
        let current = this.owner.localCtx.read(key);
        validateJSON(current);
        validateValue(current, value);
      }
    }
  }

  invalidate() {
    this.savedRevision = null;
    this.revision++;
  }
}
