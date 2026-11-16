import { DICT } from './dictionary.js';
import { parseProp } from './parseProp.js';
import { WEBMCP_DICT as MCP } from './webmcp-dictionary.js';

/**
 * @typedef {Object} MCPEventBinding
 * @property {string} prop
 * @property {string} key
 * @property {Element} el
 * @property {string} [sourceKey]
 * @property {import('./Symbiote.js').Symbiote} [sourceOwner]
 */

export function isToolDescriptor(value) {
  return !!value?.[MCP.TOOL_DESCRIPTOR_MARKER];
}

function mcpToolMode(owner) {
  return !!(owner.mcpToolMode || owner.constructor?.mcpToolMode);
}

/** @param {any} owner @param {MCPEventBinding} entry */
function addMcpEventHandler(owner, entry) {
  let handlers = owner[MCP.EVENTS_KEY] ||= [];
  if (!handlers.some((item) => item.prop === entry.prop && item.key === entry.key
    && item.el === entry.el && item.sourceOwner === entry.sourceOwner)) {
    handlers.push(entry);
  }
}

function collectMcpEventHandler(owner, prop, key, el) {
  if (globalThis.__SYMBIOTE_SSR || !Object.hasOwn(MCP.TOOL_EVENTS, prop)
    || (!mcpToolMode(owner) && !isToolDescriptor(owner.$?.[key]))) {
    return;
  }
  addMcpEventHandler(owner, { prop, key, el });
  if (key.startsWith(DICT.PARENT_CTX_PX)) {
    let parsed = parseProp(key, owner);
    let target = parsed?.scope === 'parent' && parsed.owner !== owner ? parsed.owner : null;
    if (target && mcpToolMode(target)) {
      addMcpEventHandler(target, { prop, key: parsed.name, el, sourceKey: key, sourceOwner: owner });
      (owner[MCP.EVENT_TARGET_OWNERS_KEY] ||= new Set()).add(target);
      target.syncWebMCPTools?.();
    }
  }
}

export const webMCPBindings = {
  beforeRender(owner) {
    owner[MCP.EVENTS_KEY] = [];
  },
  binding: collectMcpEventHandler,
  bindingValue(value, owner, prop) {
    return prop.startsWith('on') && isToolDescriptor(value)
      ? (event) => value.execute({}, owner, event)
      : value;
  },
  preserveBindings: mcpToolMode,
};
