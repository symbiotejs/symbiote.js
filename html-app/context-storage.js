import { cloneData, recordData } from './collection-data.js';
import { isDataKey } from './initial-data.js';
import { requestLimits, SourceError } from './fetch-source.js';
import { commitStorageRevision } from './storage-revisions.js';

export let storageSignals = Object.freeze([
  'storageFound',
  'storageDirty',
  'storageConflict',
  'storageError',
  'storageErrorMessage',
]);

export class ContextStorage {
  connected = false;
  key = '';
  fields = [];
  /** @type {string | null | undefined} */
  baseline;
  /** @type {Map<string, number>} */
  savedVersions = new Map();
  /** @type {Set<string>} */
  restored = new Set();
  conflict = false;
  /** @type {{ operation: string, code: string, message: string, status: null } | null} */
  error = null;
  /** @type {AbortController | undefined} */
  controller;
  /** @type {ReturnType<ContextStorage['performPersist']> | undefined} */
  saving;
  scheduled = false;

  /** @param {import('./sym-context.js').SymContext} owner */
  constructor(owner) {
    this.owner = owner;
  }

  status() {
    return {
      storageFound: typeof this.baseline === 'string',
      storageDirty: this.fields.some((key) => !this.savedVersions.has(key)
        || this.savedVersions.get(key) !== (this.owner.contextData.versions.get(key) ?? 0)
        || this.owner.contextData.pending.has(key)),
      storageConflict: this.conflict,
      storageError: this.error,
      storageErrorMessage: this.error?.message ?? '',
    };
  }

  connect() {
    if (globalThis.__SYMBIOTE_SSR) {
      return;
    }
    this.connected = true;
    this.owner.ownerDocument.defaultView.addEventListener('storage', this.onStorage);
    let key = this.owner.getAttribute('storage-key');
    let fields = this.owner.getAttribute('storage-keys')?.split(',').map((field) => field.trim());
    if (this.key && this.key === key && this.baseline !== undefined
      && fields?.length === this.fields.length && fields.every((field, index) => field === this.fields[index])) {
      try {
        this.conflict = this.storage().getItem(this.key) !== this.baseline;
        this.owner.requests.publish();
      } catch (failure) {
        this.fail('restore', failure);
      }
    } else {
      this.configure();
    }
  }

  disconnect() {
    this.connected = false;
    this.scheduled = false;
    this.controller?.abort();
    this.controller = undefined;
    this.saving = undefined;
    this.owner.ownerDocument.defaultView?.removeEventListener('storage', this.onStorage);
  }

  configure() {
    if (!this.connected || !this.owner.requests.ready) {
      return;
    }
    this.controller?.abort();
    this.controller = undefined;
    this.saving = undefined;
    if (this.scheduled) {
      return;
    }
    // Coalesce attribute pairs; connect restores synchronously before src starts.
    this.reset();
  }

  schedule() {
    if (!this.connected || this.scheduled) {
      return;
    }
    this.controller?.abort();
    this.scheduled = true;
    queueMicrotask(() => {
      if (this.scheduled && this.connected) {
        this.scheduled = false;
        this.configure();
      }
    });
  }

  reset() {
    this.key = '';
    this.fields = [];
    this.baseline = undefined;
    this.savedVersions.clear();
    this.restored.clear();
    this.conflict = false;
    this.error = null;
    let key = this.owner.getAttribute('storage-key');
    let fields = this.owner.getAttribute('storage-keys');
    try {
      if (key !== null || fields !== null) {
        let selected = fields?.split(',').map((field) => field.trim()) ?? [];
        if (!key?.trim() || !selected.length || new Set(selected).size !== selected.length
          || selected.some((field) => !isDataKey(field))) {
          throw new SourceError('INVALID_CONFIG', 'Browser storage requires storage-key and explicit unique storage-keys.');
        }
        this.key = key;
        this.fields = selected;
        this.restore(false);
      }
    } catch (failure) {
      this.fail('restore', failure);
    }
    this.owner.requests.publish();
  }

  /** @param {StorageEvent} event */
  onStorage = (event) => {
    if (!this.key || (event.key !== null && event.key !== this.key)) {
      return;
    }
    try {
      if (event.storageArea === this.storage()) {
        this.conflict = this.storage().getItem(this.key) !== this.baseline;
        this.owner.requests.publish();
      }
    } catch (failure) {
      this.fail('restore', failure);
    }
  };

  storage() {
    return this.owner.ownerDocument.defaultView.localStorage;
  }

  /** @param {string | null} raw */
  envelope(raw) {
    if (raw === null) {
      return null;
    }
    if (new TextEncoder().encode(raw).byteLength > requestLimits(this.owner).maxBytes) {
      throw new SourceError('TOO_LARGE', 'The stored envelope exceeds max-bytes.');
    }
    let envelope;
    try {
      envelope = recordData(JSON.parse(raw));
    } catch {
      throw new SourceError('INVALID_STORAGE', 'The stored envelope must contain valid JSON data.');
    }
    if (envelope.version !== 1 || typeof envelope.revision !== 'string' || !envelope.revision
      || !Array.isArray(envelope.keys) || envelope.keys.length !== this.fields.length
      || new Set(envelope.keys).size !== this.fields.length
      || this.fields.some((key) => !envelope.keys.includes(key))) {
      throw new SourceError('INCOMPATIBLE_STORAGE', 'The stored version or selected fields do not match this context.');
    }
    let data = recordData(envelope.data);
    if (Object.keys(data).length !== this.fields.length || this.fields.some((key) => !Object.hasOwn(data, key))) {
      throw new SourceError('INCOMPATIBLE_STORAGE', 'Stored data must match storage-keys exactly.');
    }
    this.owner.contextData.validate(data);
    return data;
  }

  /**
   * Startup protects drafts; the explicit restore action accepts saved fields.
   * @param {boolean} [replace]
   */
  restore(replace = true) {
    if (!this.connected || !this.owner.isConnected) {
      return {
        ok: false,
        cancelled: true,
      };
    }
    this.controller?.abort();
    this.controller = undefined;
    this.saving = undefined;
    try {
      this.requireConfig();
      let raw = this.storage().getItem(this.key);
      let data = this.envelope(raw);
      this.error = null;
      /** @type {Record<string, unknown>} */
      let accepted = {};
      let state = this.owner.contextData;
      for (let key of Object.keys(data ?? {})) {
        if (!state.bound.has(key) && (replace || (!state.edited.has(key) && !state.pending.has(key)))) {
          accepted[key] = data[key];
        }
      }
      this.owner.mergeSource(cloneData(accepted));
      this.savedVersions.clear();
      for (let key of Object.keys(accepted)) {
        this.restored.add(key);
        state.edited.add(key);
        this.savedVersions.set(key, state.versions.get(key) ?? 0);
      }
      this.baseline = raw;
      this.conflict = false;
      this.owner.requests.publish();
      let result = {
        ok: true,
        operation: 'restore',
        found: data !== null,
        applied: Object.keys(accepted),
        retained: this.fields.filter((key) => data && !Object.hasOwn(accepted, key)),
      };
      this.owner.dispatchEvent(new CustomEvent('restore', {
        detail: result,
      }));
      return result;
    } catch (failure) {
      return this.fail('restore', failure);
    }
  }

  requireConfig() {
    if (!this.key || !this.fields.length) {
      throw new SourceError('INVALID_CONFIG', 'Browser storage requires storage-key and storage-keys.');
    }
  }

  /** @param {boolean} [overwrite] */
  persist(overwrite = false) {
    if (this.saving) {
      return this.saving;
    }
    let saving = this.performPersist(overwrite);
    this.saving = saving;
    void saving.finally(() => {
      if (this.saving === saving) {
        this.saving = undefined;
      }
    });
    return saving;
  }

  /** @param {boolean} overwrite */
  async performPersist(overwrite) {
    if (!this.connected || !this.owner.isConnected || globalThis.__SYMBIOTE_SSR) {
      return {
        ok: false,
        cancelled: true,
      };
    }
    let controller = new AbortController();
    this.controller = controller;
    try {
      this.requireConfig();
      let locks = this.owner.ownerDocument.defaultView.navigator.locks;
      if (!locks) {
        throw new SourceError('LOCK_UNAVAILABLE', 'Browser persistence requires Web Locks in a secure context.');
      }
      this.error = null;
      this.owner.requests.publish();
      return await locks.request('symbiote:html-app:storage:' + this.key, {
        signal: controller.signal,
      }, () => {
        if (this.controller !== controller || !this.owner.isConnected) {
          return {
            ok: false,
            cancelled: true,
          };
        }
        let storage = this.storage();
        let current = storage.getItem(this.key);
        if (!overwrite) {
          this.envelope(current);
          if (current !== this.baseline) {
            this.conflict = true;
            throw new SourceError('STORAGE_CONFLICT', 'Stored data changed; explicitly restore it or overwrite it with this draft.');
          }
        }
        if (this.fields.some((key) => this.owner.contextData.pending.has(key))) {
          throw new SourceError('PENDING_DRAFT', 'Submit the editing form or finish pending edits before persisting.');
        }
        let snapshot = this.owner.contextData.snapshot(this.fields);
        let revision = crypto.randomUUID();
        let raw = JSON.stringify({
          version: 1,
          revision,
          keys: this.fields,
          data: snapshot.data,
        });
        if (new TextEncoder().encode(raw).byteLength > requestLimits(this.owner).maxBytes) {
          throw new SourceError('TOO_LARGE', 'The storage envelope exceeds max-bytes.');
        }
        return commitStorageRevision(this.owner.ownerDocument.defaultView, {
          key: this.key,
          expected: typeof this.baseline === 'string' ? JSON.parse(this.baseline).revision : null,
          next: revision,
          overwrite,
          signal: controller.signal,
        }, () => {
          if (this.controller !== controller || !this.owner.isConnected) {
            throw new DOMException('The browser save was cancelled.', 'AbortError');
          }
          storage.setItem(this.key, raw);
          this.baseline = raw;
          this.savedVersions = snapshot.versions;
          for (let key of this.fields) {
            this.restored.add(key);
          }
          this.conflict = false;
          this.owner.requests.publish();
          let result = {
            ok: true,
            operation: 'persist',
            revision: snapshot.revision,
          };
          this.owner.dispatchEvent(new CustomEvent('persist', {
            detail: result,
          }));
          return result;
        });
      });
    } catch (failure) {
      if (this.controller !== controller || controller.signal.aborted) {
        return {
          ok: false,
          cancelled: true,
        };
      }
      if (failure instanceof SourceError && failure.code === 'STORAGE_CONFLICT') {
        this.conflict = true;
      }
      return this.fail('persist', failure);
    } finally {
      if (this.controller === controller) {
        this.controller = undefined;
      }
    }
  }

  /**
   * @param {string} operation
   * @param {unknown} failure
   */
  fail(operation, failure) {
    let error = {
      operation,
      code: failure instanceof SourceError ? failure.code
        : failure instanceof DOMException ? (failure.name === 'QuotaExceededError' ? 'STORAGE_QUOTA' : 'STORAGE_UNAVAILABLE')
        : 'INVALID_DATA',
      message: failure instanceof Error ? failure.message : 'Browser storage could not be accessed.',
      status: null,
    };
    this.error = error;
    this.owner.requests.publish();
    this.owner.dispatchEvent(new CustomEvent('error', {
      detail: error,
    }));
    return {
      ok: false,
      error,
    };
  }
}
