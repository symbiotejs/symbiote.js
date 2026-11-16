import PubSub from './PubSub.js';
import Symbiote from './Symbiote.js';
import { devState } from './warn.js';
import { DICT } from './dictionary.js';
import { parseProp } from './parseProp.js';
import { extensions } from './extensions.js';
import { WEBMCP_DICT as MCP } from './webmcp-dictionary.js';
import { isToolDescriptor, webMCPBindings } from './webmcp-bindings.js';

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
 * @property {(owner?: any) => boolean} [when]
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

/** @type {WeakMap<object, (input: Object) => any>} */
let toolExecutors = new WeakMap();

/** @type {WeakMap<object, Array<{remove: Function}>>} */
let ownerDeps = new WeakMap();
/** @type {WeakSet<typeof Symbiote>} */
let installedClasses = new WeakSet();
/** @type {WeakSet<object>} */
let pendingOwnerSync = new WeakSet();
/** @type {WeakMap<object, number>} */
let ownerVersions = new WeakMap();
let _modelContext;

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

function unavailableTool(name) {
  return errorResponse(new Error(`WebMCP tool "${name}" is not available.`));
}

function executeEntry(entry, input, name = entry?.name) {
  let executor = entry && toolExecutors.get(entry);
  if (!entry?.active || !executor) {
    return unavailableTool(name);
  }
  try {
    let result = executor(input || {});
    return result?.then ? Promise.resolve(result).catch(errorResponse) : result;
  } catch (error) {
    return errorResponse(error);
  }
}

function deactivateEntry(entry) {
  entry.active = false;
  toolExecutors.delete(entry);
  entry.controller?.abort();
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
  let identity = owner[DICT.ITEM_KEY_KEY] ?? owner[DICT.ITEM_INDEX_KEY];
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
  if (!owner[MCP.OWNER_ID_KEY]) {
    owner[MCP.OWNER_ID_KEY] = `${ownerType(owner)}-${++ownerIdCount}`;
  }
  return owner[MCP.OWNER_ID_KEY];
}

function getModelContext() {
  if (_modelContext) return _modelContext;
  let docCtx = /** @type {any} */ (globalThis.document)?.modelContext;
  if (docCtx?.registerTool) {
    _modelContext = docCtx;
    return _modelContext;
  }
  let navCtx = /** @type {any} */ (globalThis.navigator)?.modelContext;
  if (navCtx?.registerTool) {
    _modelContext = navCtx;
    return _modelContext;
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
  deactivateEntry(entry);
  tools.delete(publicName);
}

function updateOwnerEntry(ownerIdVal, entry) {
  webMCPRegistry.store.owners.add(ownerIdVal, entry, true);
}

function registerNativeTool(publicName, toolEntry, descriptor) {
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
      return executeEntry(toolEntry, input);
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
    baseName: publicName,
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
  toolExecutors.set(entry, (input) => {
    if ((isElementOwner(owner) && !owner.isConnected) || !shouldRegister(descriptor, owner)) {
      return unavailableTool(publicName);
    }
    return executor(input);
  });
  let native = registerNativeTool(publicName, entry, descriptor);
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

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function textAttribute(el, name) {
  return normalizeText(el?.getAttribute?.(name));
}

function controlLabel(el) {
  let root = el?.getRootNode?.() || el?.ownerDocument;
  let references = textAttribute(el, 'aria-labelledby').split(' ').filter(Boolean);
  let label = references.map((id) => root?.getElementById?.(id)?.textContent || '').join(' ');
  label = normalizeText(label) || textAttribute(el, 'aria-label');
  if (!label) {
    label = normalizeText(Array.from(el?.labels || [], (label) => {
      let content = label.cloneNode(true);
      content.querySelectorAll('input, textarea, select, button, meter, output, progress').forEach((control) => control.remove());
      return content.textContent;
    }).join(' '));
  }
  if (!label && (['button', 'a'].includes(el?.localName) || textAttribute(el, 'role') === 'button')) {
    label = normalizeText(el.textContent);
  }
  if (!label && el?.localName === 'input' && ['button', 'submit', 'reset'].includes(el.type)) {
    label = normalizeText(el.value);
  }
  label ||= textAttribute(el, 'title');
  return label.length > 200 ? `${label.slice(0, 199)}…` : label;
}

function submissionForm(owner, binding) {
  let el = binding.el;
  if (binding.prop === 'onsubmit' && el?.localName === 'form') {
    return el;
  }
  // A separately bound submit control duplicates the form only when it uses
  // the same handler. Independent click operations keep their own tools.
  if (binding.prop === 'onclick' && ['button', 'input'].includes(el?.localName)
    && ['submit', 'image'].includes(el.type) && el.form?.onsubmit === owner.$?.[binding.key]) {
    return el.form;
  }
  return null;
}

function hasNativeFormTools(form) {
  let doc = form.ownerDocument;
  let prototype = doc?.defaultView?.SubmitEvent?.prototype;
  // SubmitEvent's WebMCP extensions are gated by declarative support,
  // independently of the imperative modelContext API.
  return !!(doc?.modelContext?.registerTool && prototype
    && 'agentInvoked' in prototype && typeof prototype.respondWith === 'function');
}

function autoBindingAvailable(owner, binding) {
  let el = binding.el;
  if (!Object.hasOwn(MCP.TOOL_EVENTS, binding.prop) || el?.isConnected === false
    || binding.sourceOwner?.isConnected === false) {
    return false;
  }
  let form = submissionForm(owner, binding);
  if (form && textAttribute(form, MCP.TOOL_NAME_ATTR) && textAttribute(form, MCP.TOOL_DESCRIPTION_ATTR)) {
    if (hasNativeFormTools(form) || !form.hasAttribute(MCP.TOOL_AUTOSUBMIT_ATTR)) {
      return false;
    }
  }
  if (binding.prop === 'oninput' || binding.prop === 'onchange') {
    return !el?.matches?.(':disabled') && !el?.readOnly && !el?.closest?.('[inert], [aria-disabled="true"]');
  }
  return true;
}

function autoControlInput(el, prop) {
  let editing = prop === 'oninput' || prop === 'onchange';
  let supported = ['input', 'textarea', 'select'].includes(el?.localName);
  if (!editing || !supported) {
    return prop === 'oninput' ? null : { inputSchema: emptySchema(), apply() {} };
  }
  if (el.localName === 'input' && ['file', 'hidden', 'button', 'submit', 'reset', 'image'].includes(el.type)) {
    return null;
  }
  let checked = el.localName === 'input' && ['checkbox', 'radio'].includes(el.type);
  let multiple = el.localName === 'select' && el.multiple;
  let numeric = el.localName === 'input' && ['number', 'range'].includes(el.type);
  let property = checked ? 'checked' : 'value';
  let type = checked ? 'boolean' : multiple ? 'array' : numeric ? ['string', 'number'] : 'string';
  let field = { type, description: checked ? 'Checked state to apply to the control.' : 'Value to insert into the control.' };
  let options = el.localName === 'select'
    ? Array.from(el.options).filter((option) => !option.disabled && !option.parentElement?.disabled).map((option) => option.value)
    : null;
  let valueSchema = multiple ? { ...field, items: { type: 'string', enum: options } }
    : options ? { ...field, enum: options } : field;
  return {
    inputSchema: {
      ...emptySchema(),
      properties: { [property]: valueSchema },
      required: prop === 'oninput' ? [property] : [],
    },
    apply(args) {
      if (!Object.hasOwn(args, property)) {
        if (prop === 'oninput') {
          throw new TypeError(`Input tool requires "${property}".`);
        }
        return;
      }
      let value = args[property];
      let valid = checked ? typeof value === 'boolean'
        : multiple ? Array.isArray(value) && value.every((item) => typeof item === 'string')
        : typeof value === 'string' || (numeric && typeof value === 'number' && Number.isFinite(value));
      if (!valid) {
        throw new TypeError(`Invalid control "${property}".`);
      }
      // Check current options, since a tool can outlive a change to the select.
      if (options) {
        let allowed = Array.from(el.options).filter((option) => !option.disabled && !option.parentElement?.disabled).map((option) => option.value);
        if (!(multiple ? value : [value]).every((item) => allowed.includes(item))) {
          throw new TypeError('Unknown or disabled select option.');
        }
      }
      if (multiple) {
        for (let option of el.options) {
          option.selected = value.includes(option.value);
        }
      } else {
        let previous = el[property];
        el[property] = checked ? value : String(value);
        if (!checked && el.value !== String(value)) {
          el[property] = previous;
          throw new TypeError('The control cannot accept this value.');
        }
      }
    },
  };
}

function autoMetadata(owner, binding) {
  let el = binding.el;
  let operation = MCP.TOOL_EVENTS[binding.prop];
  let name = textAttribute(el, MCP.TOOL_NAME_ATTR);
  let description = textAttribute(el, MCP.TOOL_DESCRIPTION_ATTR);
  let label = controlLabel(el);
  let handler = owner.$?.[binding.key];
  let authoredKey = !handler?.[DICT.GENERATED_HANDLER_KEY];
  let priority = description ? 4 : label ? 3 : name ? 2 : authoredKey ? 1 : 0;
  let input = autoControlInput(el, binding.prop);
  if (!priority || !input) {
    return null;
  }
  description ||= `${operation.description}: ${label || name || binding.key}.`;
  let control = el?.localName ? ` Control: <${el.localName}>${label ? ` ${JSON.stringify(label)}` : ''}.` : '';
  let id = textAttribute(el, 'id');
  description += `\nEvent: ${operation.event}.${control}${id ? ` ID: ${id}.` : ''} Component: <${ownerToolName(owner)}>.`;
  return { name, description, priority, ...input };
}

function createAutoDesired(owner, key, eventBinding, metadata) {
  let tagName = ownerName(owner);
  let toolOwnerName = ownerToolName(owner);
  let sourceName = sourceToolName(eventBinding?.sourceOwner);
  let sourceSuffix = sourceName ? `_${sourceName}` : '';
  let publicName = metadata.name || `${key}_in_${toolOwnerName}${sourceSuffix}`;
  let sourceDescription = sourceName ? ` Source binding: <${sourceName}>.` : '';
  let descriptor = new ToolDescriptor({
    name: publicName,
    description: `${metadata.description}${sourceDescription}`,
    inputSchema: metadata.inputSchema,
    when: () => autoBindingAvailable(owner, eventBinding),
    execute: (input) => {
      let handler = owner.$?.[key];
      if (isToolDescriptor(handler)) {
        return handler.execute({}, owner);
      }
      if (typeof handler !== 'function') {
        throw new Error(`Handler "${key}" is not available on <${tagName}>.`);
      }
      metadata.apply(input);
      let result = handler.call(owner, syntheticEvent(eventBinding?.el));
      let respond = (value) => {
        let suffix = value ? `: ${value}` : '';
        return textResponse(
          `Response status - ok${suffix}\nDetails: ${JSON.stringify(stateSnapshot(owner))}`
        );
      };
      return result?.then ? Promise.resolve(result).then(respond) : respond(result);
    },
  });
  return {
    key: sourceName ? `auto:${key}@${sourceName}` : `auto:${key}`,
    baseName: publicName,
    priority: metadata.priority,
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
  let handlers = owner[MCP.EVENTS_KEY] || [];
  let result = new Map();
  let seenCtx = new Set();
  for (let item of handlers) {
    if (!autoBindingAvailable(owner, item)) {
      continue;
    }
    if (item.sourceOwner && (!item.sourceOwner.isConnected || explicitKeys.has(item.key))) {
      continue;
    }
    let sourceName = sourceToolName(item.sourceOwner);
    let toolKey = sourceName ? `${item.key}@${sourceName}` : item.key;
    if (explicitKeys.has(item.key)) {
      continue;
    }
    let parsed = parseProp(item.key, owner);
    if (parsed?.scope === 'named' && parsed.ctx && !seenCtx.has(parsed.ctx)) {
      seenCtx.add(parsed.ctx);
      if (!webMCPRegistry.store.owners.has(ownerId(parsed.ctx))) {
        syncWebMCPTools(parsed.ctx);
      }
    }
    if (parsed?.scope !== 'local' || typeof owner.$?.[item.key] !== 'function') {
      continue;
    }
    let metadata = autoMetadata(owner, item);
    if (metadata && (!result.has(toolKey) || result.get(toolKey).priority < metadata.priority)) {
      result.set(toolKey, createAutoDesired(owner, item.key, item, metadata));
    }
  }
  return [...result.values()];
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
  /** @type {((args?: Object, owner?: any, event?: Event) => any) | undefined} */
  #fn;

  /** @param {ToolDescriptorOptions} options */
  constructor(options = {}) {
    this[MCP.TOOL_DESCRIPTOR_MARKER] = true;
    this.name = options.name;
    this.description = options.description || 'Symbiote WebMCP tool.';
    this.inputSchema = options.inputSchema || emptySchema();
    this.#fn = options.execute;
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
    if (typeof this.#fn !== 'function') {
      throw new Error('ToolDescriptor requires an execute function.');
    }
    return this.#fn.call(owner, args || {}, owner, event);
  }
}

export const webMCPRegistry = (() => {
  let existing = PubSub.getCtx(REGISTRY_UID);
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
      } else {
        deactivateEntry(resolvedEntry);
      }
      return resolvedEntry;
    }).catch((e) => {
      setDiagnostic('lastError', e);
      throw e;
    });
  }
  webMCPRegistry.store.tools.add(publicName, entry, true);
  return entry;
}

/**
 * @param {any} owner
 * @param {string} id
 * @param {{ownerId: string, ownerType: string, ownerName: string, toolsByKey: Record<string, string>}} ownerEntry
 * @param {Array<{key: string, baseName: string, descriptor: ToolDescriptor, executor: Function}>} desired
 * @param {string} componentDescription
 */
function applyDesiredTools(owner, id, ownerEntry, desired, componentDescription) {
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
    let oldName = ownerEntry.toolsByKey[item.key];
    if (oldName && webMCPRegistry.store.tools.read(oldName)?.baseName !== item.baseName) {
      unregisterToolName(oldName);
      oldName = null;
    }
    let publicName = oldName || resolveName(item.baseName, id, item.key);
    if (hasToolName(publicName)) {
      unregisterToolName(publicName);
    }
    let entry = makeEntryWithComponentDescription(publicName, item.key, item.descriptor, owner, item.executor, componentDescription);
    entry.baseName = item.baseName;
    ownerEntry.toolsByKey[item.key] = publicName;
    webMCPRegistry.store.tools.add(publicName, entry, true);
  }
  for (let key in ownerEntry.toolsByKey) {
    if (!nextKeys.has(key)) {
      unregisterToolName(ownerEntry.toolsByKey[key]);
      delete ownerEntry.toolsByKey[key];
    }
  }
  if (Object.keys(ownerEntry.toolsByKey).length) {
    updateOwnerEntry(id, ownerEntry);
  } else if (webMCPRegistry.store.owners.has(id)) {
    webMCPRegistry.store.owners.delete(id);
  }
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
  let componentDescription = readComponentDescription(owner);
  if (typeof componentDescription !== 'string') {
    componentDescription.then((resolved) => {
      if (!isCurrentOwnerVersion(owner, version)) return;
      applyDesiredTools(owner, id, ownerEntry, desired, resolved);
    }).catch((e) => setDiagnostic('lastError', e));
    return;
  }
  applyDesiredTools(owner, id, ownerEntry, desired, componentDescription);
}

/** @param {any} owner */
export function unregisterWebMCPTools(owner) {
  if (!owner) return;
  bumpOwnerVersion(owner);
  let targets = owner[MCP.EVENT_TARGET_OWNERS_KEY];
  if (targets) {
    for (let target of targets) {
      if (target[MCP.EVENTS_KEY]) {
        target[MCP.EVENTS_KEY] = target[MCP.EVENTS_KEY].filter((entry) => entry.sourceOwner !== owner);
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

/**
 * Invoke a currently registered tool without requiring native browser WebMCP.
 * Input validation and transport authorization belong to the caller.
 * @param {string} name
 * @param {Object} [input]
 * @returns {any | Promise<any>}
 */
export function executeWebMCPTool(name, input = {}) {
  let tools = webMCPRegistry.store.tools;
  return executeEntry(tools.has(name) ? tools.read(name) : undefined, input, name);
}

/** @param {typeof Symbiote} [SymbioteClass] */
export function installWebMCP(SymbioteClass = Symbiote) {
  if (installedClasses.has(SymbioteClass)) {
    return;
  }
  installedClasses.add(SymbioteClass);
  globalThis[MCP.SYNC_OWNER_KEY] = syncWebMCPTools;
  globalThis[MCP.UNREGISTER_OWNER_KEY] = unregisterWebMCPTools;
  extensions.set('webmcp', {
    ...webMCPBindings,
    syncOwner: syncWebMCPTools,
    disconnectOwner: unregisterWebMCPTools,
    contextRegistered(ctx, uid) {
      if (uid !== REGISTRY_UID) syncWebMCPTools(ctx);
    },
    contextDeleted(ctx, uid) {
      if (uid !== REGISTRY_UID) unregisterWebMCPTools(ctx);
    },
    contextChanged(ctx, prop) {
      if (!ctx.uid || ctx === webMCPRegistry || ctx === webMCPRegistry.store.tools
        || ctx === webMCPRegistry.store.owners || ctx === webMCPRegistry.store.diagnostics) {
        return;
      }
      let existingOwner = webMCPRegistry.store.owners.read(ownerId(ctx));
      if (isToolDescriptor(ctx.store[prop]) || existingOwner?.toolsByKey?.[prop]) {
        syncWebMCPTools(ctx);
      }
    },
  });
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
  executeWebMCPTool,
};
