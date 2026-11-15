import { SourceError } from './fetch-source.js';

const databaseName = 'symbiote:html-app:storage';
const storeName = 'revisions';

/**
 * @param {Window} win
 * @param {AbortSignal} signal
 * @returns {Promise<IDBDatabase>}
 */
function openRevisions(win, signal) {
  signal.throwIfAborted();
  if (!win.indexedDB) {
    throw new SourceError('STORAGE_UNAVAILABLE', 'Browser persistence requires IndexedDB for revision coordination.');
  }
  return new Promise((resolve, reject) => {
    let request = win.indexedDB.open(databaseName, 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onblocked = () => {
      blocked = true;
      reject(new SourceError('STORAGE_UNAVAILABLE', 'Browser storage revision coordination is blocked.'));
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      let db = request.result;
      db.onversionchange = () => db.close();
      if (blocked || signal.aborted) {
        db.close();
        reject(signal.reason);
      } else {
        resolve(db);
      }
    };
  });
}

/**
 * @typedef {Object} RevisionChange
 * @property {string} key
 * @property {string | null | undefined} expected
 * @property {string | undefined} next
 * @property {boolean} overwrite
 * @property {AbortSignal} [signal]
 */

/**
 * Atomically reserve a revision, independently of per-document localStorage caches.
 * @param {IDBDatabase} db
 * @param {RevisionChange} change
 * @returns {Promise<string | undefined>}
 */
function exchangeRevision(db, change) {
  change.signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    let transaction = db.transaction(storeName, 'readwrite');
    let store = transaction.objectStore(storeName);
    let request = store.get(change.key);
    /** @type {string | undefined} */
    let previous;
    /** @type {unknown} */
    let failure;
    let abort = () => {
      failure = change.signal.reason;
      // A committing transaction cannot abort; the caller also checks before writing.
      try { transaction.abort(); } catch {}
    };
    let cleanup = () => change.signal?.removeEventListener('abort', abort);
    change.signal?.addEventListener('abort', abort, {
      once: true,
    });
    request.onsuccess = () => {
      try {
        previous = request.result;
        if (previous !== undefined && typeof previous !== 'string') {
          throw new SourceError('STORAGE_UNAVAILABLE', 'Browser storage revision metadata is invalid.');
        }
        if (!change.overwrite && previous !== undefined && previous !== change.expected) {
          throw new SourceError('STORAGE_CONFLICT', 'Stored data changed; restore it or explicitly overwrite it with this draft.');
        }
        if (change.next === undefined) {
          store.delete(change.key);
        } else {
          store.put(change.next, change.key);
        }
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.onabort = () => {
      cleanup();
      reject(failure ?? transaction.error);
    };
    transaction.oncomplete = () => {
      cleanup();
      resolve(previous);
    };
  });
}

/**
 * Keep the enclosing Web Lock held through reservation, the write, and rollback.
 * A failed/interrupted reservation never acknowledges a browser save.
 * @template T
 * @param {Window} win
 * @param {RevisionChange & { signal: AbortSignal }} change
 * @param {() => T} commit
 * @returns {Promise<T>}
 */
export async function commitStorageRevision(win, change, commit) {
  let db = await openRevisions(win, change.signal);
  try {
    let previous = await exchangeRevision(db, change);
    try {
      change.signal.throwIfAborted();
      return commit();
    } catch (failure) {
      await exchangeRevision(db, {
        key: change.key,
        expected: change.next,
        next: previous,
        overwrite: false,
      });
      throw failure;
    }
  } finally {
    db.close();
  }
}
