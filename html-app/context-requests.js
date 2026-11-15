import { PubSub } from '../core/PubSub.js';
import { fetchSource, parseResponseJSON, requestLimits, sourceURL, SourceError } from './fetch-source.js';
import { isDataKey } from './initial-data.js';
import { validateValue } from './action-data.js';
import { recordData, validateJSON } from './collection-data.js';

let requestKeys = Object.freeze([
  'loading',
  'saving',
  'busy',
  'dirty',
  'revision',
  'savedRevision',
  'loadError',
  'syncError',
  'loadErrorMessage',
  'syncErrorMessage',
]);

/** @type {WeakMap<PubSub, ContextRequests>} */
let providers = new WeakMap();

/**
 * @param {string} name
 */
export function contextRequests(name) {
  let context = PubSub.getCtx(name, false);
  let requests = context && providers.get(context);
  if (!requests || !requests.owner.isConnected) {
    throw new TypeError('Expected a connected sym-context provider: ' + name);
  }
  return requests;
}

/**
 * Attach provider tracking when an authored action targets a late data field.
 * @param {import('../core/parseProp.js').ParsedProp} target
 */
export function observeDataTarget(target) {
  let requests = providers.get(target.ctx);
  if (requests?.ready && requests.owner.isConnected) {
    requests.owner.watchData(target.name);
    return requests.owner.contextData;
  }
}

/**
 * @param {unknown} failure
 * @param {'load' | 'sync'} operation
 */
function requestError(failure, operation) {
  return {
    operation,
    code: failure instanceof SourceError ? failure.code : 'INVALID_DATA',
    message: failure instanceof Error ? failure.message : 'The request failed.',
    status: failure instanceof SourceError ? failure.status : null,
  };
}

export class ContextRequests {
  ready = false;
  connected = false;
  loaded = false;
  scheduled = false;
  /** @type {AbortController | undefined} */
  readController;
  /** @type {AbortController | undefined} */
  writeController;
  /** @type {ReturnType<ContextRequests['performSync']> | undefined} */
  saving;
  /** @type {{ loading: boolean, saving: boolean, loadError: ReturnType<typeof requestError> | null, syncError: ReturnType<typeof requestError> | null }} */
  state = {
    loading: false,
    saving: false,
    loadError: null,
    syncError: null,
  };

  /** @param {import('./sym-context.js').SymContext} owner */
  constructor(owner) {
    this.owner = owner;
  }

  setup() {
    this.ready = true;
    this.owner.contextData.setup();
    providers.set(this.owner.localCtx, this);
    this.owner.localCtx.add('__htmlAppRequest', {}, true);
    for (let key of requestKeys) {
      this.owner.localCtx.add('+' + key, () => this.owner.$.__htmlAppRequest[key], true);
    }
    this.publish();
  }

  publish() {
    if (!this.ready) {
      return;
    }
    this.owner.localCtx.pub('__htmlAppRequest', {
      ...this.state,
      busy: this.state.loading || this.state.saving,
      dirty: this.owner.contextData.dirty(),
      revision: this.owner.contextData.revision,
      savedRevision: this.owner.contextData.savedRevision,
      loadErrorMessage: this.state.loadError?.message ?? '',
      syncErrorMessage: this.state.syncError?.message ?? '',
    });
  }

  connect() {
    this.connected = true;
    if (!this.loaded) {
      this.scheduleLoad();
    }
  }

  disconnect() {
    this.connected = false;
    this.scheduled = false;
    this.cancelRead();
    this.cancelWrite();
  }

  destroy() {
    this.disconnect();
    providers.delete(this.owner.localCtx);
    // Runtime signals are recreated on connection, rather than snapshotted as data.
    for (let key of requestKeys) {
      this.owner.localCtx.delete('+' + key);
    }
    this.ready = false;
  }

  /** @param {string} name */
  configure(name) {
    if (!this.ready) {
      return;
    }
    this.cancelWrite();
    if (name === 'src') {
      this.cancelRead();
      this.loaded = false;
      this.scheduleLoad();
    }
    if ([
      'src',
      'sync',
      'sync-method',
      'sync-keys',
    ].includes(name)) {
      this.owner.contextData.invalidate();
    }
    this.publish();
  }

  cancelRead() {
    this.readController?.abort();
    this.readController = undefined;
    this.state.loading = false;
    this.publish();
  }

  cancelWrite() {
    this.writeController?.abort();
    this.writeController = undefined;
    this.saving = undefined;
    this.state.saving = false;
    this.publish();
  }

  scheduleLoad() {
    if (this.scheduled || !this.connected || !this.owner.getAttribute('src') || globalThis.__SYMBIOTE_SSR) {
      return;
    }
    this.scheduled = true;
    queueMicrotask(() => {
      if (this.scheduled && this.connected) {
        this.scheduled = false;
        void this.load();
      }
    });
  }

  /** @param {'src' | 'sync'} name */
  url(name) {
    return sourceURL(this.owner.getAttribute(name) ?? '', this.owner.baseURI);
  }

  /**
   * @param {'load' | 'sync'} operation
   * @param {unknown} failure
   */
  fail(operation, failure) {
    let error = requestError(failure, operation);
    this.state[operation === 'load' ? 'loadError' : 'syncError'] = error;
    this.publish();
    this.owner.dispatchEvent(new CustomEvent('error', {
      detail: error,
    }));
    return {
      ok: false,
      error,
    };
  }

  async load() {
    this.scheduled = false;
    if (!this.connected || globalThis.__SYMBIOTE_SSR) {
      return {
        ok: false,
        cancelled: true,
      };
    }
    if (this.writeController) {
      return this.fail('load', new SourceError('BUSY', 'A save is still pending.'));
    }
    this.cancelRead();
    let controller = new AbortController();
    this.readController = controller;
    let versions = new Map(this.owner.contextData.versions);
    this.state.loading = true;
    this.state.loadError = null;
    this.publish();
    try {
      let response = await fetchSource(this.url('src'), {
        ...requestLimits(this.owner),
        signal: controller.signal,
      });
      let data = recordData(parseResponseJSON(response));
      if (this.readController !== controller || controller.signal.aborted || !this.owner.isConnected) {
        return {
          ok: false,
          cancelled: true,
        };
      }
      /** @type {Record<string, unknown>} */
      let accepted = {};
      let retained = [];
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
        if (this.owner.contextData.bound.has(key) || this.owner.contextData.edited.has(key)
          || this.owner.contextData.pending.has(key) || (this.owner.contextData.versions.get(key) ?? 0) !== (versions.get(key) ?? 0)) {
          retained.push(key);
        } else {
          accepted[key] = value;
        }
      }
      this.owner.mergeSource(accepted);
      if (this.readController !== controller || controller.signal.aborted || !this.owner.isConnected) {
        return {
          ok: false,
          cancelled: true,
        };
      }
      this.loaded = true;
      let result = {
        ok: true,
        operation: 'load',
        applied: Object.keys(accepted),
        retained,
      };
      this.owner.dispatchEvent(new CustomEvent('load', {
        detail: result,
      }));
      return result;
    } catch (failure) {
      if (this.readController !== controller || controller.signal.aborted) {
        return {
          ok: false,
          cancelled: true,
        };
      }
      return this.fail('load', failure);
    } finally {
      if (this.readController === controller) {
        this.readController = undefined;
        this.state.loading = false;
        this.publish();
      }
    }
  }

  sync() {
    if (this.saving) {
      return this.saving;
    }
    let saving = this.performSync();
    this.saving = saving;
    void saving.finally(() => {
      if (this.saving === saving) {
        this.saving = undefined;
      }
    });
    return saving;
  }

  async performSync() {
    if (!this.connected || globalThis.__SYMBIOTE_SSR) {
      return {
        ok: false,
        cancelled: true,
      };
    }
    if (this.readController) {
      return this.fail('sync', new SourceError('BUSY', 'A load is still pending.'));
    }
    let controller = new AbortController();
    this.writeController = controller;
    this.state.syncError = null;
    try {
      let method = (this.owner.getAttribute('sync-method') ?? 'PUT').toUpperCase();
      if (![
        'PUT',
        'POST',
        'PATCH',
      ].includes(method)) {
        throw new SourceError('INVALID_CONFIG', 'sync-method must be PUT, POST or PATCH.');
      }
      let url = this.url('sync');
      let snapshot = this.owner.contextData.snapshot();
      let limits = requestLimits(this.owner);
      this.state.saving = true;
      this.publish();
      let response = await fetchSource(url, {
        ...limits,
        signal: controller.signal,
        method,
        body: JSON.stringify(snapshot.data),
      });
      if (response.status !== 204) {
        validateJSON(parseResponseJSON(response));
      }
      if (this.writeController !== controller || controller.signal.aborted || !this.owner.isConnected) {
        return {
          ok: false,
          cancelled: true,
        };
      }
      this.owner.contextData.acknowledge(snapshot.revision, snapshot.versions);
      let result = {
        ok: true,
        operation: 'sync',
        revision: snapshot.revision,
        dirty: this.owner.contextData.dirty(),
      };
      this.owner.dispatchEvent(new CustomEvent('sync', {
        detail: result,
      }));
      return result;
    } catch (failure) {
      if (this.writeController !== controller || controller.signal.aborted) {
        return {
          ok: false,
          cancelled: true,
        };
      }
      return this.fail('sync', failure);
    } finally {
      if (this.writeController === controller) {
        this.writeController = undefined;
        this.state.saving = false;
        this.publish();
      }
    }
  }
}
