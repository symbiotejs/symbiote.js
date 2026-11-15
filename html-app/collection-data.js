import { isDataKey } from './initial-data.js';
import { validateValue } from './action-data.js';

/** @typedef {Record<string, any>} RecordData */

/**
 * Validate JSON values without dropping unsupported fields during cloning.
 * @param {unknown} value
 * @param {Set<object>} [ancestors]
 */
export function validateJSON(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))) {
    return;
  }
  if (!value || typeof value !== 'object' || ancestors.has(value)
    || (!Array.isArray(value) && ![
      Object.prototype,
      null,
    ].includes(Object.getPrototypeOf(value)))) {
    throw new TypeError('Collection data must contain JSON values only.');
  }
  if (Object.getOwnPropertySymbols(value).length) {
    throw new TypeError('Collection data cannot contain symbol fields.');
  }
  ancestors.add(value);
  for (let key of Object.keys(value)) {
    if (!Array.isArray(value) && !isDataKey(key)) {
      throw new TypeError('Collection data contains an unsafe field.');
    }
    validateJSON(value[key], ancestors);
  }
  if (Array.isArray(value) && (Object.keys(value).length !== value.length
    || Object.keys(value).some((key, index) => key !== String(index)))) {
    throw new TypeError('Collection arrays must not contain holes or extra properties.');
  }
  ancestors.delete(value);
}

/** @param {unknown} value
 * @returns {RecordData}
 */
export function recordData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Expected a JSON record.');
  }
  validateJSON(value);
  return value;
}

/** @param {unknown} value
 * @returns {RecordData[]}
 */
export function collectionData(value) {
  if (!Array.isArray(value)) {
    throw new TypeError('Expected an array of records.');
  }
  let keys = new Set();
  for (let item of value) {
    recordData(item);
    if (typeof item.id !== 'string' || !item.id || keys.has(item.id)) {
      throw new TypeError('Collection records require unique nonempty string IDs.');
    }
    keys.add(item.id);
  }
  return value;
}

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function cloneData(value) {
  validateJSON(value);
  return structuredClone(value);
}

/**
 * @param {RecordData} item
 * @param {RecordData} match
 */
export function matches(item, match) {
  return Object.entries(match).every(([
    key,
    value,
  ]) => Object.hasOwn(item, key) && Object.is(item[key], value));
}

/** @param {unknown} value */
export function matchData(value) {
  let match = recordData(value);
  if (Object.values(match).some((value) => value !== null && typeof value === 'object')) {
    throw new TypeError('Matching accepts JSON scalar values only.');
  }
  return match;
}

/**
 * @param {unknown} source
 * @param {unknown} draft
 * @param {boolean} atStart
 */
function insertRecord(source, draft, atStart) {
  let items = collectionData(source);
  let item = cloneData(recordData(draft));
  if (!Object.hasOwn(item, 'id')) {
    item.id = crypto.randomUUID();
  }
  let next = atStart ? [
    item,
    ...items,
  ] : [
    ...items,
    item,
  ];
  collectionData(next);
  return next;
}

/**
 * @param {unknown} source
 * @param {unknown} draft
 */
export function appendRecord(source, draft) {
  return insertRecord(source, draft, false);
}

/**
 * @param {unknown} source
 * @param {unknown} draft
 */
export function prependRecord(source, draft) {
  return insertRecord(source, draft, true);
}

/**
 * @param {RecordData} item
 * @param {RecordData} patch
 */
function patchedRecord(item, patch) {
  if (Object.hasOwn(patch, 'id') && patch.id !== item.id) {
    throw new TypeError('A collection record ID cannot be changed.');
  }
  for (let key of Object.keys(patch)) {
    if (Object.hasOwn(item, key)) {
      validateValue(item[key], patch[key]);
    }
  }
  return {
    ...item,
    ...cloneData(patch),
  };
}

/**
 * @param {unknown} source
 * @param {string} id
 * @param {RecordData | null} patch Null removes the record.
 */
export function updateRecord(source, id, patch) {
  let items = collectionData(source);
  if (!items.some((item) => item.id === id)) {
    throw new TypeError('The collection record no longer exists.');
  }
  if (patch === null) {
    return items.filter((item) => item.id !== id);
  }
  recordData(patch);
  return items.map((item) => item.id === id ? patchedRecord(item, patch) : item);
}

/**
 * @param {unknown} source
 * @param {unknown} match
 * @param {unknown} [patch] Omit to remove matching records.
 */
export function updateMatching(source, match, patch) {
  let items = collectionData(source);
  let filter = matchData(match);
  if (patch === undefined) {
    if (!Object.keys(filter).length) {
      throw new TypeError('Removing records requires a nonempty match.');
    }
    return items.filter((item) => !matches(item, filter));
  }
  let changes = recordData(patch);
  if (Object.hasOwn(changes, 'id')) {
    throw new TypeError('Bulk patches cannot change record IDs.');
  }
  return items.map((item) => matches(item, filter) ? patchedRecord(item, changes) : item);
}

/**
 * @param {unknown} source
 * @param {unknown} [filter]
 * @param {unknown} [search]
 * @param {string[]} [fields]
 * @param {unknown} [sort]
 */
export function projectCollection(source, filter = {}, search = '', fields = [], sort = null) {
  let items = collectionData(source);
  let match = matchData(filter);
  if (typeof search !== 'string') {
    throw new TypeError('Collection search must be a string.');
  }
  if (fields.some((field) => !isDataKey(field))) {
    throw new TypeError('Search fields must be local data keys.');
  }
  let query = search.trim().toLocaleLowerCase();
  if (query && !fields.length) {
    throw new TypeError('Collection search requires explicit search-fields.');
  }
  let visible = items.filter((item) => matches(item, match)
    && (!query || fields.some((field) => String(item[field] ?? '').toLocaleLowerCase().includes(query))));
  if (sort !== null) {
    let order = recordData(sort);
    if (typeof order.field !== 'string' || !isDataKey(order.field)
      || ![
        'asc',
        'desc',
      ].includes(order.direction)) {
      throw new TypeError('Collection sort requires field and asc/desc direction.');
    }
    visible.sort((left, right) => {
      let a = left[order.field];
      let b = right[order.field];
      let result = typeof a === 'number' && typeof b === 'number' ? a - b
        : String(a ?? '').localeCompare(String(b ?? ''));
      return order.direction === 'desc' ? -result : result;
    });
  }
  return visible;
}
