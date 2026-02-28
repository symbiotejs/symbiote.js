import { DICT } from './dictionary.js';

/**
 * Initialize a state property from a class property fallback when it's not
 * already registered in the component's PubSub context.
 * Shared across domBindProcessor, txtNodesProcessor, and itemizeProcessor.
 * @param {import('./Symbiote.js').Symbiote} fnCtx
 * @param {string} key
 */
export function initPropFallback(fnCtx, key) {
  if (key.startsWith(DICT.ATTR_BIND_PX)) {
    fnCtx.add(key, fnCtx.getAttribute(key.replace(DICT.ATTR_BIND_PX, '')));
  } else if (Object.hasOwn(fnCtx, key) && fnCtx[key] !== undefined) {
    let ownVal = fnCtx[key];
    fnCtx.add(key, typeof ownVal === 'function' ? ownVal.bind(fnCtx) : ownVal);
  } else if (typeof fnCtx[key] === 'function') {
    fnCtx.add(key, fnCtx[key].bind(fnCtx));
  } else {
    fnCtx.add(key, null);
  }
}
