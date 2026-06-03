import PubSub from './PubSub.js';
import Symbiote from './Symbiote.js';
import { devState } from './warn.js';
import { DICT } from './dictionary.js';
import { parseProp } from './parseProp.js';

/**
 * @typedef {Object} WebMCPToolResultText
 * @property {'text'} type
 * @property {string} text
 */

/**
 * @typedef {Object} WebMCPToolResult
 * @property {WebMCPToolResultText[]} [content]
 * @property {boolean} [isError]
 */

/**
 * @typedef {Object} ToolDescriptorOptions
 * @property {string} [name]
 * @property {string | ((owner?: any) => string)} [description]
 * @property {Object | ((owner?: any) => Object)} [inputSchema]
 * @property {(args?: Object, owner?: any, event?: Event) => any} [execute]
 * @property {() => boolean} [when]
 * @property {string[]} [deps]
 * @property {string[]} [exposedTo]
 * @property {Object} [annotations]
 */

/**
 * @typedef {Object} WebMCPRegistryEntry
 * @property {string} name
 * @property {string} key
 * @property {string} ownerId
 * @property {'component' | 'context'} ownerType
 * @property {string} ownerName
 * @property {string} componentDescription
 * @property {string} description
 * @property {Object} inputSchema
 * @property {boolean} active
 * @property {boolean} nativeActive
 */

const REGISTRY_UID = Symbol.for('symbiote.webmcp.registry');
let ownerIdCount = 0;

/** @type {WeakMap<object, Array<{remove: Function}>>} */
let ownerDeps = new WeakMap();
/** @type {WeakSet<typeof Symbiote>} */
let installedClasses = new WeakSet();
/** @type {WeakSet<object>} */
let pendingOwnerSync = new WeakSet();
/** @type {WeakMap<object, number>} */
let ownerVersions = new WeakMap();

function isToolDescriptor(val) {
  return !!val?.[DICT.MCP_TOOL_DESCRIPTOR_MARKER];
}

function isElementOwner(owner) {
  return typeof HTMLElement !== 'undefined' && owner instanceof HTMLElement;
}

function emptySchema() {
  return {
    type: 'object',
    properties: {},
    additionalProperties: false,
  };
}

function errorResponse(error) {
  let message = error?.message || String(error);
  return {
    content: [{
      type: 'text',
      text: `Response status - error\nDetails: ${message}`,
    }],
    isError: true,
  };
}

function textResponse(text) {
  return {
    content: [{
      type: 'text',
      text,
    }],
  };
}

function safeValue(val) {
  if (isToolDescriptor(val) || typeof val === 'function') {
    return undefined;
  }
  try {
    JSON.stringify(val);
    return val;
  } catch (e) {
    return String(val);
  }
}

function stateSnapshot(owner) {
  let store = owner?.localCtx?.store || owner?.store || {};
  let snapshot = {};
  for (let key in store) {
    let val = safeValue(store[key]);
    if (val !== undefined) {
      snapshot[key] = val;
    }
  }
  return snapshot;
}

/**
 * @param {any} val
 * @returns {string}
 */
function cleanIdentity(val) {
  return String(val ?? '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * @param {any} owner
 * @returns {string}
 */
function ownerName(owner) {
  return isElementOwner(owner)
    ? (owner.constructor?.is || owner.localName)
    : String(owner?.uid || 'pubsub-context');
}

/**
 * @param {any} owner
 * @returns {string}
 */
function ownerToolName(owner) {
  let name = ownerName(owner);
  if (!isElementOwner(owner)) {
    return name;
  }
  let identity = owner[DICT.MCP_ITEM_KEY_KEY] ?? owner[DICT.MCP_ITEM_INDEX_KEY];
  let clean = identity === undefined ? '' : cleanIdentity(identity);
  return clean ? `${name}_${clean}` : name;
}

/**
 * @param {any} sourceOwner
 * @returns {string}
 */
function sourceToolName(sourceOwner) {
  return sourceOwner && isElementOwner(sourceOwner)
    ? ownerToolName(sourceOwner)
    : '';
}

/**
 * @param {Element} [el]
 * @returns {{target: Element | undefined, currentTarget: Element | undefined, type: string}}
 */
function syntheticEvent(el) {
  return {
    target: el,
    currentTarget: el,
    type: 'webmcp',
  };
}

/**
 * @param {object} owner
 * @returns {number}
 */
function bumpOwnerVersion(owner) {
  let version = (ownerVersions.get(owner) || 0) + 1;
  ownerVersions.set(owner, version);
  return version;
}

/**
 * @param {object} owner
 * @param {number} version
 * @returns {boolean}
 */
function isCurrentOwnerVersion(owner, version) {
  return ownerVersions.get(owner) === version
    && (!isElementOwner(owner) || owner.isConnected);
}

/**
 * @param {any} owner
 * @returns {string | Promise<string>}
 */
function readComponentDescription(owner) {
  if (!isElementOwner(owner)) {
    return '';
  }
  let source = owner.componentDescription ?? owner.constructor?.componentDescription;
  if (!source) {
    return '';
  }
  try {
    let desc = typeof source === 'function'
      ? source.call(owner)
      : source;
    if (desc?.then) {
      return desc
        .then((resolved) => resolved ? String(resolved) : '')
        .catch((e) => {
          setDiagnostic('lastError', e);
          return '';
        });
    }
    return desc ? String(desc) : '';
  } catch (e) {
    setDiagnostic('lastError', e);
    return '';
  }
}

function withComponentDescription(desc, componentDescription) {
  if (!componentDescription) {
    return desc;
  }
  return `${desc}\n\nComponent context:\n${componentDescription}`;
}

/** @returns {'component' | 'context'} */
function ownerType(owner) {
  return isElementOwner(owner) ? 'component' : 'context';
}

function ownerId(owner) {
  if (!owner[DICT.MCP_OWNER_ID_KEY]) {
    owner[DICT.MCP_OWNER_ID_KEY] = `${ownerType(owner)}-${++ownerIdCount}`;
  }
  return owner[DICT.MCP_OWNER_ID_KEY];
}

function getModelContext() {
  let docCtx = /** @type {any} */ (globalThis.document)?.modelContext;
  if (docCtx?.registerTool) {
    return docCtx;
  }
  let navCtx = /** @type {any} */ (globalThis.navigator)?.modelContext;
  if (navCtx?.registerTool) {
    return navCtx;
  }
  return null;
}

function ensureNestedCtx(root, key, init = {}) {
  let ctx = root.store[key];
  if (!(ctx instanceof PubSub)) {
    ctx = new PubSub(init);
    root.add(key, ctx, true);
  }
  return ctx;
}

function setDiagnostic(key, value) {
  let diagnostics = webMCPRegistry.store.diagnostics;
  diagnostics.add(key, value, true);
}

function serializeEntry(entry) {
  return {
    name: entry.name,
    key: entry.key,
    ownerId: entry.ownerId,
    ownerType: entry.ownerType,
    ownerName: entry.ownerName,
    componentDescription: entry.componentDescription,
    description: entry.description,
    inputSchema: entry.inputSchema,
    active: entry.active,
    nativeActive: entry.nativeActive,
  };
}

function readDescription(descriptor, owner) {
  try {
    return typeof descriptor.description === 'function'
      ? descriptor.description.call(owner, owner)
      : descriptor.description;
  } catch (e) {
    setDiagnostic('lastError', e);
    return `WebMCP tool for ${ownerName(owner)}.`;
  }
}

function readInputSchema(descriptor, owner) {
  try {
    let schema = typeof descriptor.inputSchema === 'function'
      ? descriptor.inputSchema.call(owner, owner)
      : descriptor.inputSchema;
    return schema || emptySchema();
  } catch (e) {
    setDiagnostic('lastError', e);
    return emptySchema();
  }
}

function shouldRegister(descriptor, owner) {
  if (!descriptor.when) {
    return true;
  }
  try {
    return !!descriptor.when.call(owner, owner);
  } catch (e) {
    setDiagnostic('lastError', e);
    devState.devMode && console.warn('[Symbiote WebMCP] when() failed:', e);
    return false;
  }
}

function hasToolName(name) {
  return webMCPRegistry.store.tools.has(name);
}

function resolveName(baseName, ownerIdVal, key) {
  let tools = webMCPRegistry.store.tools;
  let publicName = baseName;
  let idx = 2;
  while (tools.has(publicName)) {
    let entry = tools.read(publicName);
    if (entry?.ownerId === ownerIdVal && entry?.key === key) {
      return publicName;
    }
    publicName = `${baseName}-${idx++}`;
  }
  return publicName;
}

function unregisterToolName(publicName) {
  let tools = webMCPRegistry.store.tools;
  if (!tools.has(publicName)) {
    return;
  }
  let entry = tools.read(publicName);
  entry?.controller?.abort();
  tools.delete(publicName);
}

function updateOwnerEntry(ownerIdVal, entry) {
  webMCPRegistry.store.owners.add(ownerIdVal, entry, true);
}

function registerNativeTool(publicName, toolEntry, descriptor, owner, executor) {
  let modelContext = getModelContext();
  setDiagnostic('apiAvailable', !!modelContext);
  if (!modelContext) {
    return {
      controller: null,
      nativeActive: false,
    };
  }
  let controller = new AbortController();
  let nativeTool = {
    name: publicName,
    description: toolEntry.description,
    inputSchema: toolEntry.inputSchema,
    execute(input = {}) {
      try {
        let result = executor(input || {});
        if (result?.then) {
          return result.catch(errorResponse);
        }
        return result;
      } catch (e) {
        return errorResponse(e);
      }
    },
  };
  if (descriptor.annotations) {
    nativeTool.annotations = descriptor.annotations;
  }
  try {
    modelContext.registerTool(nativeTool, {
      signal: controller.signal,
      exposedTo: descriptor.exposedTo,
    });
    return {
      controller,
      nativeActive: true,
    };
  } catch (e) {
    setDiagnostic('lastError', e);
    devState.devMode && console.warn('[Symbiote WebMCP] registerTool failed:', e);
    return {
      controller: null,
      nativeActive: false,
    };
  }
}

function makeEntryWithComponentDescription(publicName, key, descriptor, owner, executor, componentDescription) {
  let id = ownerId(owner);
  let desc = withComponentDescription(readDescription(descriptor, owner), componentDescription);
  let schema = readInputSchema(descriptor, owner);
  let entry = {
    name: publicName,
    key,
    ownerId: id,
    ownerType: ownerType(owner),
    ownerName: ownerName(owner),
    componentDescription,
    description: desc,
    inputSchema: schema,
    active: true,
    nativeActive: false,
    controller: null,
  };
  let native = registerNativeTool(publicName, entry, descriptor, owner, executor);
  entry.controller = native.controller;
  entry.nativeActive = native.nativeActive;
  return entry;
}

function makeEntry(publicName, key, descriptor, owner, executor) {
  let componentDescription = readComponentDescription(owner);
  if (typeof componentDescription !== 'string') {
    return componentDescription.then((resolved) => {
      return makeEntryWithComponentDescription(publicName, key, descriptor, owner, executor, resolved);
    });
  }
  return makeEntryWithComponentDescription(publicName, key, descriptor, owner, executor, componentDescription);
}

function createExplicitDesired(owner, key, descriptor) {
  let defaultName = isElementOwner(owner)
    ? `${key}_in_${ownerToolName(owner)}`
    : key;
  return {
    key,
    baseName: descriptor.name || defaultName,
    descriptor,
    executor(input) {
      return descriptor.execute(input || {}, owner);
    },
  };
}

function createAutoDesired(owner, key, eventBinding = null) {
  let tagName = ownerName(owner);
  let toolOwnerName = ownerToolName(owner);
  let sourceName = sourceToolName(eventBinding?.sourceOwner);
  let sourceSuffix = sourceName ? `_${sourceName}` : '';
  let publicName = `${key}_in_${toolOwnerName}${sourceSuffix}`;
  let sourceDescription = sourceName ? ` Source binding: <${sourceName}>.` : '';
  let descriptor = new ToolDescriptor({
    name: publicName,
    description: `Active UI action "${key}" in <${tagName}>.${sourceDescription}`,
    inputSchema: emptySchema(),
    execute: () => {
      let handler = owner.$?.[key];
      if (isToolDescriptor(handler)) {
        return handler.execute({}, owner);
      }
      if (typeof handler !== 'function') {
        throw new Error(`Handler "${key}" is not available on <${tagName}>.`);
      }
      let result = handler.call(owner, syntheticEvent(eventBinding?.el));
      let suffix = result ? `: ${result}` : '';
      return textResponse(
        `Response status - ok${suffix}\nDetails: ${JSON.stringify(stateSnapshot(owner))}`
      );
    },
  });
  return {
    key: sourceName ? `auto:${key}@${sourceName}` : `auto:${key}`,
    baseName: publicName,
    descriptor,
    executor(input) {
      return descriptor.execute(input || {}, owner);
    },
  };
}

function collectDescriptorTools(owner) {
  let result = [];
  let store = owner?.localCtx?.store || owner?.store || {};
  for (let key in store) {
    let val = store[key];
    if (isToolDescriptor(val)) {
      result.push(createExplicitDesired(owner, key, val));
    }
  }
  return result;
}

function collectAutoTools(owner, explicitKeys) {
  if (!isElementOwner(owner) || !(owner.mcpToolMode || owner.constructor?.mcpToolMode)) {
    return [];
  }
  let handlers = owner[DICT.MCP_EVENTS_KEY] || [];
  let result = [];
  let seen = new Set();
  let seenCtx = new Set();
  for (let item of handlers) {
    if (item.sourceOwner && (!item.sourceOwner.isConnected || explicitKeys.has(item.key))) {
      continue;
    }
    let sourceName = sourceToolName(item.sourceOwner);
    let toolKey = sourceName ? `${item.key}@${sourceName}` : item.key;
    if (explicitKeys.has(item.key) || seen.has(toolKey)) {
      continue;
    }
    let parsed = parseProp(item.key, owner);
    if (parsed?.scope === 'named' && parsed.ctx && !seenCtx.has(parsed.ctx)) {
      seenCtx.add(parsed.ctx);
      if (!webMCPRegistry.store.owners.has(ownerId(parsed.ctx))) {
        syncWebMCPTools(parsed.ctx);
      }
    }
    if (parsed?.scope !== 'local') {
      continue;
    }
    seen.add(toolKey);
    result.push(createAutoDesired(owner, item.key, item));
  }
  return result;
}

function collectDesiredTools(owner) {
  let explicit = collectDescriptorTools(owner);
  let explicitKeys = new Set(explicit.map((item) => item.key));
  let auto = collectAutoTools(owner, explicitKeys);
  return [...explicit, ...auto];
}

function clearDeps(owner) {
  let subs = ownerDeps.get(owner);
  if (subs) {
    for (let sub of subs) {
      sub?.remove?.();
      owner.allSubs?.delete?.(sub);
    }
    ownerDeps.delete(owner);
  }
}

function addDepSub(owner, dep) {
  let sub;
  if (isElementOwner(owner)) {
    let before = new Set(owner.allSubs);
    owner.sub(dep, () => scheduleOwnerSync(owner), false);
    sub = [...owner.allSubs].find((item) => !before.has(item));
  } else if (dep.includes('/')) {
    let slashIdx = dep.indexOf('/');
    let ctx = PubSub.getCtx(dep.slice(0, slashIdx), false);
    sub = ctx?.sub(dep.slice(slashIdx + 1), () => scheduleOwnerSync(owner), false);
  } else {
    sub = owner.sub(dep, () => scheduleOwnerSync(owner), false);
  }
  if (!sub) {
    return;
  }
  let subs = ownerDeps.get(owner) || [];
  subs.push(sub);
  ownerDeps.set(owner, subs);
}

function setupDeps(owner, desired) {
  clearDeps(owner);
  let seen = new Set();
  for (let item of desired) {
    for (let dep of item.descriptor.deps || []) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      addDepSub(owner, dep);
    }
  }
}

function scheduleOwnerSync(owner) {
  if (pendingOwnerSync.has(owner)) {
    return;
  }
  pendingOwnerSync.add(owner);
  queueMicrotask(() => {
    pendingOwnerSync.delete(owner);
    syncWebMCPTools(owner);
  });
}

export class ToolDescriptor {
  /** @param {ToolDescriptorOptions} options */
  constructor(options = {}) {
    this[DICT.MCP_TOOL_DESCRIPTOR_MARKER] = true;
    this.name = options.name;
    this.description = options.description || 'Symbiote WebMCP tool.';
    this.inputSchema = options.inputSchema || emptySchema();
    this.fn = options.execute;
    this.when = options.when;
    this.deps = options.deps || [];
    this.exposedTo = options.exposedTo;
    this.annotations = options.annotations;
  }

  /**
   * @param {Object} [args]
   * @param {any} [owner]
   * @param {Event} [event]
   * @returns {any}
   */
  execute(args = {}, owner, event) {
    if (typeof this.fn !== 'function') {
      throw new Error('ToolDescriptor requires an execute function.');
    }
    return this.fn.call(owner, args || {}, owner, event);
  }
}

export const webMCPRegistry = (() => {
  let existing = PubSub.getCtx(REGISTRY_UID, false);
  let root = existing || PubSub.registerCtx({}, REGISTRY_UID);
  ensureNestedCtx(root, 'tools');
  ensureNestedCtx(root, 'owners');
  ensureNestedCtx(root, 'diagnostics', {
    apiAvailable: false,
    lastError: null,
  });
  return root;
})();

/**
 * @param {any} owner
 * @param {string} key
 * @param {ToolDescriptor} descriptor
 * @returns {(WebMCPRegistryEntry & {controller: AbortController | null}) | Promise<WebMCPRegistryEntry & {controller: AbortController | null}>}
 */
export function registerWebMCPTool(owner, key, descriptor) {
  let version = bumpOwnerVersion(owner);
  let desired = createExplicitDesired(owner, key, descriptor);
  let id = ownerId(owner);
  let ownerEntry = webMCPRegistry.store.owners.has(id)
    ? webMCPRegistry.store.owners.read(id)
    : {
      ownerId: id,
      ownerType: ownerType(owner),
      ownerName: ownerName(owner),
      toolsByKey: {},
    };
  let existingName = ownerEntry.toolsByKey[key];
  let publicName = existingName || resolveName(desired.baseName, id, key);
  if (hasToolName(publicName)) {
    unregisterToolName(publicName);
  }
  ownerEntry.toolsByKey[key] = publicName;
  updateOwnerEntry(id, ownerEntry);
  let entry = makeEntry(publicName, key, descriptor, owner, desired.executor);
  if (entry instanceof Promise) {
    return entry.then((resolvedEntry) => {
      if (isCurrentOwnerVersion(owner, version)) {
        webMCPRegistry.store.tools.add(publicName, resolvedEntry, true);
      }
      return resolvedEntry;
    });
  }
  webMCPRegistry.store.tools.add(publicName, entry, true);
  return entry;
}

/** @param {any} owner */
export function syncWebMCPTools(owner) {
  if (!owner) return;
  if (isElementOwner(owner) && !owner.isConnected) {
    unregisterWebMCPTools(owner);
    return;
  }
  let version = bumpOwnerVersion(owner);
  let id = ownerId(owner);
  let desired = collectDesiredTools(owner);
  setupDeps(owner, desired);
  let owners = webMCPRegistry.store.owners;
  let ownerEntry = owners.has(id)
    ? owners.read(id)
    : {
      ownerId: id,
      ownerType: ownerType(owner),
      ownerName: ownerName(owner),
      toolsByKey: {},
    };
  let nextKeys = new Set();
  for (let item of desired) {
    nextKeys.add(item.key);
    if (!shouldRegister(item.descriptor, owner)) {
      let oldName = ownerEntry.toolsByKey[item.key];
      if (oldName) {
        unregisterToolName(oldName);
        delete ownerEntry.toolsByKey[item.key];
      }
      continue;
    }
    let publicName = ownerEntry.toolsByKey[item.key] || resolveName(item.baseName, id, item.key);
    if (hasToolName(publicName)) {
      unregisterToolName(publicName);
    }
    let entry = makeEntry(publicName, item.key, item.descriptor, owner, item.executor);
    ownerEntry.toolsByKey[item.key] = publicName;
    if (entry instanceof Promise) {
      entry.then((resolvedEntry) => {
        if (isCurrentOwnerVersion(owner, version)) {
          webMCPRegistry.store.tools.add(publicName, resolvedEntry, true);
        }
      });
    } else {
      webMCPRegistry.store.tools.add(publicName, entry, true);
    }
  }
  for (let key in ownerEntry.toolsByKey) {
    if (!nextKeys.has(key)) {
      unregisterToolName(ownerEntry.toolsByKey[key]);
      delete ownerEntry.toolsByKey[key];
    }
  }
  if (Object.keys(ownerEntry.toolsByKey).length) {
    updateOwnerEntry(id, ownerEntry);
  } else if (owners.has(id)) {
    owners.delete(id);
  }
}

/** @param {any} owner */
export function unregisterWebMCPTools(owner) {
  if (!owner) return;
  bumpOwnerVersion(owner);
  let targets = owner[DICT.MCP_EVENT_TARGET_OWNERS_KEY];
  if (targets) {
    for (let target of targets) {
      if (target[DICT.MCP_EVENTS_KEY]) {
        target[DICT.MCP_EVENTS_KEY] = target[DICT.MCP_EVENTS_KEY].filter((entry) => entry.sourceOwner !== owner);
      }
      syncWebMCPTools(target);
    }
    targets.clear();
  }
  clearDeps(owner);
  let id = ownerId(owner);
  let owners = webMCPRegistry.store.owners;
  if (!owners.has(id)) {
    return;
  }
  let ownerEntry = owners.read(id);
  for (let key in ownerEntry.toolsByKey) {
    unregisterToolName(ownerEntry.toolsByKey[key]);
  }
  owners.delete(id);
}

/** @returns {WebMCPRegistryEntry[]} */
export function getActiveWebMCPTools() {
  let tools = webMCPRegistry.store.tools.store;
  return Object.keys(tools).map((name) => serializeEntry(tools[name]));
}

/** @param {typeof Symbiote} [SymbioteClass] */
export function installWebMCP(SymbioteClass = Symbiote) {
  if (installedClasses.has(SymbioteClass)) {
    return;
  }
  installedClasses.add(SymbioteClass);
  globalThis[DICT.MCP_SYNC_OWNER_KEY] = syncWebMCPTools;
  globalThis[DICT.MCP_UNREGISTER_OWNER_KEY] = unregisterWebMCPTools;
  globalThis[DICT.MCP_PUBSUB_REGISTERED_KEY] = (ctx, uid) => {
    if (uid === REGISTRY_UID) return;
    syncWebMCPTools(ctx);
  };
  globalThis[DICT.MCP_PUBSUB_DELETED_KEY] = (ctx, uid) => {
    if (uid === REGISTRY_UID) return;
    unregisterWebMCPTools(ctx);
  };
  globalThis[DICT.MCP_PUBSUB_CHANGED_KEY] = (ctx, prop) => {
    if (!ctx.uid || ctx === webMCPRegistry || ctx === webMCPRegistry.store.tools
      || ctx === webMCPRegistry.store.owners || ctx === webMCPRegistry.store.diagnostics) {
      return;
    }
    let id = ownerId(ctx);
    let existingOwner = webMCPRegistry.store.owners.has(id)
      ? webMCPRegistry.store.owners.read(id)
      : null;
    let propOwnsTool = !!existingOwner?.toolsByKey?.[prop];
    if (!isToolDescriptor(ctx.store[prop]) && !propOwnsTool) {
      return;
    }
    syncWebMCPTools(ctx);
  };
}

installWebMCP(Symbiote);

export default {
  ToolDescriptor,
  installWebMCP,
  webMCPRegistry,
  registerWebMCPTool,
  unregisterWebMCPTools,
  syncWebMCPTools,
  getActiveWebMCPTools,
};
