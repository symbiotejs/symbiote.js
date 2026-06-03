import PubSub from './PubSub.js';
import { DICT } from './dictionary.js';

const BINDING_PREFIXES = [
  DICT.SHARED_CTX_PX,
  DICT.PARENT_CTX_PX,
  DICT.ATTR_BIND_PX,
  DICT.COMPUTED_PX,
  DICT.CSS_DATA_PX,
];

/** @param {string} propStr */
function hasBindingPrefix(propStr) {
  for (let prefix of BINDING_PREFIXES) {
    if (propStr.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * @typedef {Object} ParsedProp
 * @property {PubSub} ctx
 * @property {string} name
 * @property {'local' | 'parent' | 'shared' | 'named' | 'css-data'} scope
 * @property {string} [ctxName]
 * @property {any} [owner]
 */

/**
 * Resolve a Symbiote binding token to its PubSub context and property name.
 *
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {String} prop
 * @param {T} fnCtx
 * @returns {ParsedProp | null}
 */
export function parseProp(prop, fnCtx) {
  /** @type {PubSub} */
  let ctx;
  /** @type {String} */
  let name;
  let propStr = String(prop);
  // Fast path for common local props (no prefix, no /)
  if (!hasBindingPrefix(propStr) && !propStr.includes(DICT.NAMED_CTX_SPLTR)) {
    return { ctx: fnCtx.localCtx, name: propStr, scope: 'local', owner: fnCtx };
  }
  if (propStr.startsWith(DICT.SHARED_CTX_PX)) {
    ctx = fnCtx.sharedCtx;
    name = propStr.slice(DICT.SHARED_CTX_PX.length);
    return { ctx, name, scope: 'shared', ctxName: fnCtx.ctxName };
  }
  if (propStr.startsWith(DICT.PARENT_CTX_PX)) {
    name = propStr.slice(DICT.PARENT_CTX_PX.length);
    let found = fnCtx;
    while (found && !found?.has?.(name)) {
      // @ts-expect-error
      found = found.parentElement || found.parentNode || found.host;
    }
    ctx = found?.localCtx || fnCtx.localCtx;
    return { ctx, name, scope: 'parent', owner: found || fnCtx };
  }
  if (propStr.includes(DICT.NAMED_CTX_SPLTR)) {
    let slashIdx = propStr.indexOf(DICT.NAMED_CTX_SPLTR);
    let ctxName = propStr.slice(0, slashIdx);
    ctx = PubSub.getCtx(ctxName, false);
    if (!ctx) {
      return null;
    }
    name = propStr.slice(slashIdx + 1);
    return { ctx, name, scope: 'named', ctxName };
  }
  if (propStr.startsWith(DICT.CSS_DATA_PX)) {
    ctx = fnCtx.localCtx;
    name = propStr;
    if (!ctx.has(name)) {
      fnCtx.bindCssData(name);
    }
    return { ctx, name, scope: 'css-data', owner: fnCtx };
  }
  ctx = fnCtx.localCtx;
  name = propStr;
  return { ctx, name, scope: 'local', owner: fnCtx };
}

export default parseProp;
